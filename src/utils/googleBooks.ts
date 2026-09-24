const GOOGLE_BOOKS_ENDPOINT = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_BOOKS_MAX_ATTEMPTS = 3;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

export function buildGoogleBooksUrl(query: string, maxResults?: number, apiKey?: string): string {
  const url = new URL(GOOGLE_BOOKS_ENDPOINT);
  url.searchParams.set("q", query);
  if (maxResults) url.searchParams.set("maxResults", maxResults.toString());
  if (apiKey?.trim()) url.searchParams.set("key", apiKey.trim());
  return url.toString();
}

export async function fetchGoogleBooks(
  query: string,
  maxResults?: number,
): Promise<Response> {
  const url = buildGoogleBooksUrl(
    query,
    maxResults,
    import.meta.env.VITE_GOOGLE_BOOKS_API_KEY,
  );
  let response: Response | null = null;

  for (let attempt = 0; attempt < GOOGLE_BOOKS_MAX_ATTEMPTS; attempt += 1) {
    response = await fetch(url);
    if (response.status !== 429 || attempt === GOOGLE_BOOKS_MAX_ATTEMPTS - 1) {
      return response;
    }

    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1000, 5000)
      : 600 * 2 ** attempt;
    await wait(retryDelay);
  }

  return response as Response;
}
