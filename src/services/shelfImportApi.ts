import type { User } from "firebase/auth";
import type { ShelfAnalysisResponse } from "../types/shelfImport";

interface ShelfImportApiErrorBody {
  error?: string;
  code?: string;
}

export class ShelfImportApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(
    message: string,
    code?: string,
    status?: number,
  ) {
    super(message);
    this.name = "ShelfImportApiError";
    this.code = code;
    this.status = status;
  }
}

export async function analyzeShelfPhoto(
  imageDataUrl: string,
  user: User,
): Promise<ShelfAnalysisResponse> {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/shelf-scan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageDataUrl }),
  });

  if (!response.ok) {
    let body: ShelfImportApiErrorBody = {};
    try {
      body = (await response.json()) as ShelfImportApiErrorBody;
    } catch {
      // La réponse peut provenir de la plateforme avant d'atteindre la fonction.
    }
    throw new ShelfImportApiError(
      body.error || "L'analyse de la photo n'a pas abouti.",
      body.code,
      response.status,
    );
  }

  return (await response.json()) as ShelfAnalysisResponse;
}
