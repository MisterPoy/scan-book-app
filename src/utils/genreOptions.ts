export const CURATED_GENRES = [
  "Science-fiction",
  "Fantasy",
  "Fantastique",
  "Horreur",
  "Policier",
  "Thriller",
  "Mystère",
  "Romance",
  "Historique",
  "Aventure",
  "Drame",
  "Humour",
  "Jeunesse",
  "Biographie",
  "Autobiographie",
  "Essai",
  "Philosophie",
  "Sciences",
  "Développement personnel",
  "Poésie",
  "Théâtre",
  "Bande dessinée",
  "Manga",
  "Documentaire",
] as const;

function normalizeGenre(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function mergeGenreOptions(
  usedGenres: string[] = [],
  suggestedCategories: string[] = [],
): string[] {
  const options = [...CURATED_GENRES, ...usedGenres, ...suggestedCategories];
  const seen = new Set<string>();

  return options.filter((option) => {
    const normalized = normalizeGenre(option);
    const key = normalized.toLocaleLowerCase("fr");
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(normalizeGenre);
}

export function categorySuggestions(categories: string[] = []): string[] {
  return mergeGenreOptions([], categories).filter(
    (option) =>
      !CURATED_GENRES.some(
        (genre) => genre.toLocaleLowerCase("fr") === option.toLocaleLowerCase("fr"),
      ),
  );
}
