import { verify as verifySignature } from "node:crypto";

const FIREBASE_CERTIFICATES_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const DEFAULT_CERTIFICATE_CACHE_MS = 5 * 60 * 1000;

type FirebaseCertificates = Record<string, string>;

export interface FirebaseIdTokenPayload extends Record<string, unknown> {
  admin?: unknown;
  aud?: unknown;
  auth_time?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  sub?: unknown;
}

interface FirebaseIdTokenHeader {
  alg?: unknown;
  kid?: unknown;
}

interface VerifyFirebaseIdTokenOptions {
  nowMs?: number;
  certificateProvider?: () => Promise<FirebaseCertificates>;
}

interface CachedCertificates {
  values: FirebaseCertificates;
  expiresAt: number;
}

let certificateCache: CachedCertificates | null = null;

export class FirebaseIdTokenError extends Error {
  constructor() {
    super("INVALID_FIREBASE_ID_TOKEN");
    this.name = "FirebaseIdTokenError";
  }
}

export class FirebaseIdTokenServiceError extends Error {
  constructor() {
    super("FIREBASE_CERTIFICATES_UNAVAILABLE");
    this.name = "FirebaseIdTokenServiceError";
  }
}

function invalidToken(): never {
  throw new FirebaseIdTokenError();
}

function decodeJwtPart<T>(part: string): T {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    return invalidToken();
  }
}

function getMaxAgeMs(cacheControl: string | null): number {
  const match = cacheControl?.match(/(?:^|,)\s*max-age=(\d+)/i);
  if (!match) return DEFAULT_CERTIFICATE_CACHE_MS;

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds * 1000 : DEFAULT_CERTIFICATE_CACHE_MS;
}

function isCertificateMap(value: unknown): value is FirebaseCertificates {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((certificate) => typeof certificate === "string")
  );
}

async function fetchFirebaseCertificates(nowMs: number): Promise<FirebaseCertificates> {
  if (certificateCache && certificateCache.expiresAt > nowMs) {
    return certificateCache.values;
  }

  try {
    const response = await fetch(FIREBASE_CERTIFICATES_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("CERTIFICATE_REQUEST_FAILED");

    const certificates: unknown = await response.json();
    if (!isCertificateMap(certificates)) throw new Error("INVALID_CERTIFICATE_RESPONSE");

    certificateCache = {
      values: certificates,
      expiresAt: nowMs + getMaxAgeMs(response.headers.get("cache-control")),
    };
    return certificates;
  } catch {
    throw new FirebaseIdTokenServiceError();
  }
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
  options: VerifyFirebaseIdTokenOptions = {},
): Promise<FirebaseIdTokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) invalidToken();

  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = decodeJwtPart<FirebaseIdTokenHeader>(encodedHeader);
  const payload = decodeJwtPart<FirebaseIdTokenPayload>(encodedPayload);

  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) invalidToken();

  const nowMs = options.nowMs ?? Date.now();
  const certificates = options.certificateProvider
    ? await options.certificateProvider()
    : await fetchFirebaseCertificates(nowMs);
  const certificate = certificates[header.kid];
  if (!certificate) invalidToken();

  let signatureIsValid = false;
  try {
    signatureIsValid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      certificate,
      Buffer.from(encodedSignature, "base64url"),
    );
  } catch {
    invalidToken();
  }
  if (!signatureIsValid) invalidToken();

  const nowSeconds = Math.floor(nowMs / 1000);
  if (
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    payload.sub.length > 128 ||
    !isValidTimestamp(payload.exp) ||
    payload.exp <= nowSeconds ||
    !isValidTimestamp(payload.iat) ||
    payload.iat > nowSeconds ||
    !isValidTimestamp(payload.auth_time) ||
    payload.auth_time > nowSeconds
  ) {
    invalidToken();
  }

  return payload;
}
