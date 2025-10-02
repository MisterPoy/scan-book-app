// Types pour le système d'ajout groupé de livres

export interface ScannedBook {
  isbn: string;
  title?: string;
  authors?: string[];
  thumbnail?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  isLoading?: boolean;
  error?: string;
}

export interface BulkAddRequest {
  isbns: string[];
  userId: string;
  personalNotes?: Record<string, string>; // ISBN -> note perso
}

export interface BulkAddResponse {
  added: Array<{
    isbn: string;
    title: string;
  }>;
  duplicates: string[];
  errors: Array<{
    isbn: string;
    error: string;
  }>;
}

export interface BookMetadata {
  title: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  thumbnail?: string;
}
