export type ShelfDetectionConfidence = "high" | "medium" | "low";
export type ShelfDetectionStatus = "readable" | "uncertain" | "unreadable";

export interface ShelfDetectedBook {
  id: string;
  photoId: string;
  photoIndex: number;
  position: number;
  visibleText: string;
  title: string | null;
  author: string | null;
  confidence: ShelfDetectionConfidence;
  status: ShelfDetectionStatus;
  note: string;
}

export interface ShelfAnalysisUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ShelfAnalysisResponse {
  books: Omit<ShelfDetectedBook, "id" | "photoId" | "photoIndex">[];
  warnings: string[];
  model: string;
  usage?: ShelfAnalysisUsage;
}

export interface ShelfCatalogCandidate {
  isbn: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  thumbnail?: string;
  categories?: string[];
  source: "Google Books" | "Open Library";
  score: number;
}

export type ShelfReviewStatus =
  | "ready"
  | "review"
  | "unresolved"
  | "duplicate";

export interface ShelfReviewBook {
  id: string;
  detection: ShelfDetectedBook;
  candidates: ShelfCatalogCandidate[];
  selectedIsbn: string | null;
  status: ShelfReviewStatus;
  selected: boolean;
  queryTitle: string;
  queryAuthor: string;
  duplicateReason?: string;
}

export interface ExistingShelfBook {
  isbn: string;
  title: string;
  authors?: string[];
}
