export interface SearchableBook {
  isbn?: string;
  title: string;
  authors?: string[];
  publishedDate?: string;
  language?: string;
  imageLinks?: { thumbnail?: string };
  description?: string;
  publisher?: string;
}

const normalize = (value: string | undefined): string =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const cleanIdentifier = (value: string | undefined): string =>
  (value ?? "").replace(/[^0-9X]/gi, "").toUpperCase();

export const scoreSearchResult = (
  book: SearchableBook,
  query: string,
  preferredLanguage = "fr",
): number => {
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(book.title);
  const normalizedAuthors = normalize(book.authors?.join(" "));
  const queryIdentifier = cleanIdentifier(query);
  const bookIdentifier = cleanIdentifier(book.isbn);
  let score = 0;

  if (queryIdentifier.length >= 10 && queryIdentifier === bookIdentifier) score += 120;
  if (normalizedTitle === normalizedQuery) score += 90;
  else if (normalizedTitle.startsWith(normalizedQuery)) score += 65;
  else if (normalizedTitle.includes(normalizedQuery)) score += 45;
  if (normalizedAuthors.includes(normalizedQuery)) score += 30;
  if (book.language?.toLowerCase().startsWith(preferredLanguage)) score += 12;
  if (book.imageLinks?.thumbnail) score += 5;
  if (book.description) score += 3;
  if (book.publisher) score += 2;

  return score;
};

const getDeduplicationKey = (book: SearchableBook): string => {
  const identifier = cleanIdentifier(book.isbn);
  if (identifier.length === 10 || identifier.length === 13) {
    return `isbn:${identifier}`;
  }

  return [
    "edition",
    normalize(book.title),
    normalize(book.authors?.[0]),
    book.publishedDate?.slice(0, 4) ?? "",
  ].join(":");
};

export const deduplicateAndRankBooks = <T extends SearchableBook>(
  books: T[],
  query: string,
  preferredLanguage = "fr",
): T[] => {
  const bestByEdition = new Map<string, T>();

  books.forEach((book) => {
    const key = getDeduplicationKey(book);
    const current = bestByEdition.get(key);
    if (
      !current ||
      scoreSearchResult(book, query, preferredLanguage) >
        scoreSearchResult(current, query, preferredLanguage)
    ) {
      bestByEdition.set(key, book);
    }
  });

  return [...bestByEdition.values()].sort(
    (left, right) =>
      scoreSearchResult(right, query, preferredLanguage) -
      scoreSearchResult(left, query, preferredLanguage),
  );
};
