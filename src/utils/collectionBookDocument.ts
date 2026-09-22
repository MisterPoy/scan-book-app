export type CollectionReadingStatus =
  | "lu"
  | "non_lu"
  | "a_lire"
  | "en_cours"
  | "abandonne";

export type CollectionBookType = "physique" | "numerique" | "audio";

export interface CollectionBookSource {
  isbn?: string;
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  customCoverUrl?: string;
  thumbnail?: string;
  imageLinks?: { thumbnail?: string };
  genre?: string;
  tags?: string[];
  categories?: string[];
  personalNote?: string;
  notes?: string;
}

interface CollectionBookDocumentOptions {
  isbn?: string;
  readingStatus?: CollectionReadingStatus;
  bookType?: CollectionBookType;
  isManualEntry?: boolean;
  libraries?: string[];
  addedAt?: string;
}

export function createCollectionBookDocument(
  source: CollectionBookSource,
  options: CollectionBookDocumentOptions = {},
): Record<string, unknown> {
  const readingStatus = options.readingStatus || "a_lire";
  const isbn = options.isbn || source.isbn || "";
  const coverUrl =
    source.customCoverUrl || source.thumbnail || source.imageLinks?.thumbnail;

  const document: Record<string, unknown> = {
    isbn,
    title: source.title || "Titre inconnu",
    authors: source.authors || [],
    addedAt: options.addedAt || new Date().toISOString(),
    isRead: readingStatus === "lu",
    readingStatus,
    bookType: options.bookType || "physique",
    isManualEntry: options.isManualEntry || false,
  };

  const optionalValues: Record<string, unknown> = {
    publisher: source.publisher,
    publishedDate: source.publishedDate,
    description: source.description,
    pageCount: source.pageCount,
    customCoverUrl: coverUrl,
    genre: source.genre,
    tags: source.tags,
    categories: source.categories,
    personalNote: source.personalNote,
    notes: source.notes,
    libraries: options.libraries,
  };

  for (const [key, value] of Object.entries(optionalValues)) {
    if (
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    ) {
      document[key] = value;
    }
  }

  return document;
}
