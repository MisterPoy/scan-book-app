import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  FirebaseIdTokenError,
  verifyFirebaseIdToken,
} from "./firebaseIdToken";

const PROJECT_ID = "kodeks-test";
const KEY_ID = "test-key";
const NOW_MS = Date.UTC(2026, 8, 24, 10, 0, 0);
const NOW_SECONDS = Math.floor(NOW_MS / 1000);

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createToken(payloadOverrides: Record<string, unknown> = {}): string {
  const header = encode({ alg: "RS256", kid: KEY_ID, typ: "JWT" });
  const payload = encode({
    aud: PROJECT_ID,
    auth_time: NOW_SECONDS - 60,
    exp: NOW_SECONDS + 3600,
    iat: NOW_SECONDS - 60,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    sub: "admin-user",
    admin: true,
    ...payloadOverrides,
  });
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    privateKey,
  ).toString("base64url");

  return `${header}.${payload}.${signature}`;
}

const verificationOptions = {
  nowMs: NOW_MS,
  certificateProvider: async () => ({ [KEY_ID]: publicKeyPem }),
};

describe("verifyFirebaseIdToken", () => {
  it("vérifie la signature et restitue le rôle administrateur", async () => {
    const payload = await verifyFirebaseIdToken(
      createToken(),
      PROJECT_ID,
      verificationOptions,
    );

    expect(payload.sub).toBe("admin-user");
    expect(payload.admin).toBe(true);
  });

  it("refuse un jeton émis pour un autre projet", async () => {
    await expect(
      verifyFirebaseIdToken(
        createToken({ aud: "another-project" }),
        PROJECT_ID,
        verificationOptions,
      ),
    ).rejects.toBeInstanceOf(FirebaseIdTokenError);
  });

  it("refuse un jeton expiré", async () => {
    await expect(
      verifyFirebaseIdToken(
        createToken({ exp: NOW_SECONDS - 1 }),
        PROJECT_ID,
        verificationOptions,
      ),
    ).rejects.toBeInstanceOf(FirebaseIdTokenError);
  });

  it("refuse une charge utile modifiée après signature", async () => {
    const token = createToken();
    const [header, , signature] = token.split(".");
    const modifiedPayload = encode({
      aud: PROJECT_ID,
      auth_time: NOW_SECONDS - 60,
      exp: NOW_SECONDS + 3600,
      iat: NOW_SECONDS - 60,
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      sub: "attacker",
      admin: true,
    });

    await expect(
      verifyFirebaseIdToken(
        `${header}.${modifiedPayload}.${signature}`,
        PROJECT_ID,
        verificationOptions,
      ),
    ).rejects.toBeInstanceOf(FirebaseIdTokenError);
  });
});
