export interface BookDetailData {
  description?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  genre?: string;
  categories?: string[];
  tags?: string[];
  personalNote?: string;
  notes?: string;
}

export function mergeBookDetails(
  local: BookDetailData,
  remote: BookDetailData | null,
): BookDetailData {
  return {
    description: local.description || remote?.description,
    publisher: local.publisher || remote?.publisher,
    publishedDate: local.publishedDate || remote?.publishedDate,
    pageCount: local.pageCount || remote?.pageCount,
    genre: local.genre,
    categories:
      local.categories && local.categories.length > 0
        ? local.categories
        : remote?.categories,
    tags: local.tags,
    personalNote: local.personalNote || local.notes,
    notes: local.notes,
  };
}

export function hasBookDetails(details: BookDetailData): boolean {
  return Boolean(
    details.description ||
      details.publisher ||
      details.publishedDate ||
      details.pageCount ||
      details.genre ||
      details.categories?.length ||
      details.tags?.length ||
      details.personalNote,
  );
}
