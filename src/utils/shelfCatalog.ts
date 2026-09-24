import type {
  ExistingShelfBook,
  ShelfCatalogCandidate,
  ShelfDetectedBook,
  ShelfReviewBook,
} from "../types/shelfImport";
import { fetchGoogleBooks } from "./googleBooks";

interface GoogleVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  imageLinks?: { thumbnail?: string };
  industryIdentifiers?: Array<{ type: string; identifier: string }>;
}

interface OpenLibraryDocument {
  key: string;
  title?: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  subject?: string[];
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

export function normalizeShelfText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizeShelfText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeShelfText(right).split(" ").filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) intersection += 1;
  });
  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

export function scoreShelfCandidate(
  detectedTitle: string,
  detectedAuthor: string | null,
  candidate: Pick<ShelfCatalogCandidate, "title" | "authors">,
): number {
  const normalizedDetectedTitle = normalizeShelfText(detectedTitle);
  const normalizedCandidateTitle = normalizeShelfText(candidate.title);
  let titleScore = tokenSimilarity(detectedTitle, candidate.title);
  if (
    normalizedDetectedTitle &&
    (normalizedDetectedTitle === normalizedCandidateTitle ||
      normalizedCandidateTitle.includes(normalizedDetectedTitle) ||
      normalizedDetectedTitle.includes(normalizedCandidateTitle))
  ) {
    titleScore = Math.max(titleScore, normalizedDetectedTitle === normalizedCandidateTitle ? 1 : 0.88);
  }

  const authorScore = detectedAuthor
    ? Math.max(...candidate.authors.map((author) => tokenSimilarity(detectedAuthor, author)), 0)
    : 0.65;

  return Math.round((titleScore * 0.76 + authorScore * 0.24) * 100) / 100;
}

function selectIsbn(identifiers: Array<{ type: string; identifier: string }> = []): string | null {
  return (
    identifiers.find((identifier) => identifier.type === "ISBN_13")?.identifier ||
    identifiers.find((identifier) => identifier.type === "ISBN_10")?.identifier ||
    null
  );
}

function forceHttps(url: string | undefined): string | undefined {
  return url?.replace(/^http:\/\//i, "https://");
}

async function searchGoogleBooks(
  title: string,
  author: string | null,
): Promise<ShelfCatalogCandidate[]> {
  const query = [`intitle:${title}`, author ? `inauthor:${author}` : ""]
    .filter(Boolean)
    .join(" ");
  const response = await fetchGoogleBooks(query, 10);
  if (!response.ok) throw new Error("Google Books indisponible");
  const data = (await response.json()) as {
    items?: Array<{ id: string; volumeInfo?: GoogleVolumeInfo }>;
  };

  return (data.items || []).flatMap((item) => {
    const info = item.volumeInfo;
    const isbn = selectIsbn(info?.industryIdentifiers);
    if (!info?.title || !isbn) return [];
    const candidate: ShelfCatalogCandidate = {
      isbn,
      title: info.title,
      authors: info.authors || [],
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      description: info.description,
      pageCount: info.pageCount,
      thumbnail: forceHttps(info.imageLinks?.thumbnail),
      categories: info.categories,
      source: "Google Books",
      score: 0,
    };
    return [candidate];
  });
}

async function searchOpenLibrary(
  title: string,
  author: string | null,
): Promise<ShelfCatalogCandidate[]> {
  const params = new URLSearchParams({ title, limit: "10" });
  if (author) params.set("author", author);
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
  if (!response.ok) throw new Error("OpenLibrary indisponible");
  const data = (await response.json()) as { docs?: OpenLibraryDocument[] };

  return (data.docs || []).flatMap((document) => {
    const isbn = document.isbn?.find((value) => value.length === 13) || document.isbn?.[0];
    if (!document.title || !isbn) return [];
    return [
      {
        isbn,
        title: document.title,
        authors: document.author_name || [],
        publisher: document.publisher?.[0],
        publishedDate: document.first_publish_year?.toString(),
        pageCount: document.number_of_pages_median,
        thumbnail: document.cover_i
          ? `https://covers.openlibrary.org/b/id/${document.cover_i}-M.jpg`
          : undefined,
        categories: document.subject?.slice(0, 12),
        source: "Open Library" as const,
        score: 0,
      },
    ];
  });
}

export async function searchShelfCatalogCandidates(
  title: string,
  author: string | null,
): Promise<ShelfCatalogCandidate[]> {
  const searches = await Promise.allSettled([
    searchGoogleBooks(title, author),
    searchOpenLibrary(title, author),
  ]);
  const merged = new Map<string, ShelfCatalogCandidate>();

  searches.forEach((result) => {
    if (result.status !== "fulfilled") return;
    result.value.forEach((candidate) => {
      const scored = {
        ...candidate,
        score: scoreShelfCandidate(title, author, candidate),
      };
      const previous = merged.get(candidate.isbn);
      if (!previous || scored.score > previous.score) merged.set(candidate.isbn, scored);
    });
  });

  return [...merged.values()]
    .filter((candidate) => candidate.score >= 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

export function deduplicateShelfDetections(
  detections: ShelfDetectedBook[],
): ShelfDetectedBook[] {
  const confidenceWeight = { high: 3, medium: 2, low: 1 } as const;
  const uniqueDetections: ShelfDetectedBook[] = [];

  detections.forEach((detection) => {
    const title = normalizeShelfText(detection.title);
    const author = normalizeShelfText(detection.author);
    const overlappingIndex = title
      ? uniqueDetections.findIndex(
          (previous) =>
            previous.photoId !== detection.photoId &&
            normalizeShelfText(previous.title) === title &&
            normalizeShelfText(previous.author) === author,
        )
      : -1;

    if (overlappingIndex === -1) {
      uniqueDetections.push(detection);
      return;
    }

    const previous = uniqueDetections[overlappingIndex];
    if (confidenceWeight[detection.confidence] > confidenceWeight[previous.confidence]) {
      uniqueDetections[overlappingIndex] = detection;
    }
  });

  return uniqueDetections.sort(
    (left, right) => left.photoIndex - right.photoIndex || left.position - right.position,
  );
}

function findExistingDuplicate(
  candidate: ShelfCatalogCandidate,
  existingBooks: ExistingShelfBook[],
): string | undefined {
  const byIsbn = existingBooks.find((book) => book.isbn === candidate.isbn);
  if (byIsbn) return "ISBN déjà présent dans votre collection";

  const candidateTitle = normalizeShelfText(candidate.title);
  const candidateAuthor = normalizeShelfText(candidate.authors[0]);
  const byWork = existingBooks.find(
    (book) =>
      normalizeShelfText(book.title) === candidateTitle &&
      (!candidateAuthor || normalizeShelfText(book.authors?.[0]) === candidateAuthor),
  );
  return byWork ? "Même titre et même auteur déjà présents" : undefined;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

export async function buildShelfReviewBooks(
  detections: ShelfDetectedBook[],
  existingBooks: ExistingShelfBook[],
): Promise<ShelfReviewBook[]> {
  return mapWithConcurrency(detections, 1, async (detection) => {
    await wait(250);
    if (!detection.title || detection.status === "unreadable") {
      return {
        id: detection.id,
        detection,
        candidates: [],
        selectedIsbn: null,
        status: "unresolved",
        selected: false,
        queryTitle: detection.title || "",
        queryAuthor: detection.author || "",
      };
    }

    const candidates = await searchShelfCatalogCandidates(detection.title, detection.author);
    const selectedCandidate = candidates[0];
    if (!selectedCandidate) {
      return {
        id: detection.id,
        detection,
        candidates: [],
        selectedIsbn: null,
        status: "unresolved",
        selected: false,
        queryTitle: detection.title,
        queryAuthor: detection.author || "",
      };
    }

    const duplicateReason = findExistingDuplicate(selectedCandidate, existingBooks);
    const scoreGap = selectedCandidate.score - (candidates[1]?.score || 0);
    const ready =
      detection.confidence === "high" &&
      detection.status === "readable" &&
      selectedCandidate.score >= 0.78 &&
      scoreGap >= 0.1;

    return {
      id: detection.id,
      detection,
      candidates,
      selectedIsbn: selectedCandidate.isbn,
      status: duplicateReason ? "duplicate" : ready ? "ready" : "review",
      selected: !duplicateReason && ready,
      queryTitle: detection.title,
      queryAuthor: detection.author || "",
      duplicateReason,
    };
  });
}

export function getShelfDuplicateReason(
  candidate: ShelfCatalogCandidate,
  existingBooks: ExistingShelfBook[],
): string | undefined {
  return findExistingDuplicate(candidate, existingBooks);
}
