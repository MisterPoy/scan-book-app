import {
  FirebaseIdTokenError,
  FirebaseIdTokenServiceError,
  verifyFirebaseIdToken,
} from "../../src/server/firebaseIdToken.js";

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

interface ShelfScanBody {
  imageDataUrl?: unknown;
}

interface OpenAIResponseBody {
  model?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; code?: string };
}

const MAX_IMAGE_DATA_URL_LENGTH = 4_100_000;
const SUPPORTED_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=\r\n]+$/;

const shelfSchema = {
  type: "object",
  additionalProperties: false,
  required: ["books", "warnings"],
  properties: {
    books: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "position",
          "visibleText",
          "title",
          "author",
          "confidence",
          "status",
          "note",
        ],
        properties: {
          position: { type: "integer" },
          visibleText: { type: "string" },
          title: { anyOf: [{ type: "string" }, { type: "null" }] },
          author: { anyOf: [{ type: "string" }, { type: "null" }] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          status: {
            type: "string",
            enum: ["readable", "uncertain", "unreadable"],
          },
          note: { type: "string" },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

function getHeader(request: ApiRequest, name: string): string | undefined {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getProjectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
}

function parseRequestBody(body: unknown): ShelfScanBody {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as ShelfScanBody;
    } catch {
      return {};
    }
  }
  return body && typeof body === "object" ? (body as ShelfScanBody) : {};
}

function extractOutputText(response: OpenAIResponseBody): string | null {
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return null;
}

function sendError(
  response: ApiResponse,
  status: number,
  code: string,
  error: string,
): void {
  response.status(status).json({ code, error });
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendError(response, 405, "METHOD_NOT_ALLOWED", "Méthode non autorisée.");
    return;
  }

  const authorization = getHeader(request, "authorization");
  if (!authorization?.startsWith("Bearer ")) {
    sendError(response, 401, "AUTH_REQUIRED", "Authentification requise.");
    return;
  }

  const projectId = getProjectId();
  if (!projectId) {
    sendError(response, 503, "SERVER_NOT_CONFIGURED", "La vérification Firebase n'est pas configurée.");
    return;
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(authorization.slice(7), projectId);
    if (decodedToken.admin !== true) {
      sendError(response, 403, "ADMIN_REQUIRED", "Cette fonction est réservée à l'administrateur.");
      return;
    }
  } catch (error) {
    if (error instanceof FirebaseIdTokenServiceError) {
      sendError(response, 503, "AUTH_SERVICE_UNAVAILABLE", "La vérification de session est momentanément indisponible.");
      return;
    }
    if (error instanceof FirebaseIdTokenError) {
      sendError(response, 401, "INVALID_TOKEN", "Votre session doit être renouvelée.");
      return;
    }
    sendError(response, 503, "AUTH_SERVICE_UNAVAILABLE", "La vérification de session est momentanément indisponible.");
    return;
  }

  const body = parseRequestBody(request.body);
  if (typeof body.imageDataUrl !== "string" || !SUPPORTED_DATA_URL.test(body.imageDataUrl)) {
    sendError(response, 400, "INVALID_IMAGE", "La photo transmise n'est pas valide.");
    return;
  }
  if (body.imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    sendError(response, 413, "IMAGE_TOO_LARGE", "La photo est trop volumineuse.");
    return;
  }

  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) {
    sendError(
      response,
      503,
      "OPENAI_NOT_CONFIGURED",
      "L'analyse d'étagère n'est pas encore configurée sur le serveur.",
    );
    return;
  }

  const model = process.env.OPENAI_VISION_MODEL || "gpt-6-luna";
  let openAIResponse: Response;
  try {
    openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 5000,
        instructions:
          "Tu extrais avec prudence les livres visibles sur une photo d'étagère. " +
          "N'invente jamais un titre, un auteur ou un ISBN. Retourne un élément par dos de livre visible, " +
          "dans l'ordre de lecture de gauche à droite puis de haut en bas. Si le texte ne permet pas " +
          "d'identifier le livre, conserve le texte lisible, utilise null pour les champs inconnus et " +
          "classe l'élément uncertain ou unreadable. Ne déduis pas une édition précise.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Identifie les livres visibles sur cette photo. Sois conservateur et signale toute incertitude.",
              },
              {
                type: "input_image",
                image_url: body.imageDataUrl,
                detail: "original",
              },
            ],
          },
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "shelf_book_detection",
            strict: true,
            schema: shelfSchema,
          },
        },
      }),
    });
  } catch {
    sendError(
      response,
      502,
      "OPENAI_UNREACHABLE",
      "Le service d'analyse est momentanément injoignable.",
    );
    return;
  }

  let openAIBody: OpenAIResponseBody;
  try {
    openAIBody = (await openAIResponse.json()) as OpenAIResponseBody;
  } catch {
    sendError(response, 502, "OPENAI_INVALID_RESPONSE", "Le service d'analyse a renvoyé une réponse illisible.");
    return;
  }

  if (!openAIResponse.ok) {
    const isRateLimited = openAIResponse.status === 429;
    const isUnauthorized = openAIResponse.status === 401;
    sendError(
      response,
      isRateLimited ? 429 : 502,
      isRateLimited || isUnauthorized ? "OPENAI_ACCOUNT_ERROR" : "OPENAI_REQUEST_FAILED",
      isRateLimited
        ? "Le quota OpenAI est momentanément atteint. Réessayez dans quelques instants."
        : isUnauthorized
          ? "La configuration OpenAI du serveur a été refusée."
          : "Le service d'analyse n'a pas pu traiter la photo.",
    );
    return;
  }

  const outputText = extractOutputText(openAIBody);
  if (!outputText) {
    sendError(response, 502, "OPENAI_EMPTY_RESPONSE", "Aucun résultat exploitable n'a été reçu.");
    return;
  }

  try {
    const parsed = JSON.parse(outputText) as { books: unknown[]; warnings: string[] };
    response.status(200).json({
      ...parsed,
      model: openAIBody.model || model,
      usage: openAIBody.usage
        ? {
            inputTokens: openAIBody.usage.input_tokens || 0,
            outputTokens: openAIBody.usage.output_tokens || 0,
            totalTokens: openAIBody.usage.total_tokens || 0,
          }
        : undefined,
    });
  } catch {
    sendError(response, 502, "OPENAI_INVALID_JSON", "Le résultat de l'analyse n'a pas pu être interprété.");
  }
}
