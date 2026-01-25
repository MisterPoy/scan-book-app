/**
 * Détecte automatiquement le type de recherche en fonction de la requête
 * @param query La chaîne de recherche saisie par l'utilisateur
 * @returns 'isbn' si la requête ressemble à un ISBN, sinon 'text'
 */
export function detectSearchType(query: string): 'isbn' | 'text' {
  if (!query || query.trim().length === 0) {
    return 'text';
  }

  const trimmedQuery = query.trim().replace(/[-\s]/g, ''); // Enlever tirets et espaces

  // ISBN-10: 10 chiffres (éventuellement avec X à la fin)
  const isbn10Pattern = /^\d{9}[\dX]$/i;

  // ISBN-13: 13 chiffres
  const isbn13Pattern = /^\d{13}$/;

  if (isbn10Pattern.test(trimmedQuery) || isbn13Pattern.test(trimmedQuery)) {
    return 'isbn';
  }

  return 'text';
}

/**
 * Valide et nettoie un ISBN
 * @param isbn L'ISBN à valider
 * @returns L'ISBN nettoyé (sans tirets/espaces) ou null si invalide
 */
export function cleanISBN(isbn: string): string | null {
  const cleaned = isbn.trim().replace(/[-\s]/g, '');

  const isbn10Pattern = /^\d{9}[\dX]$/i;
  const isbn13Pattern = /^\d{13}$/;

  if (isbn10Pattern.test(cleaned) || isbn13Pattern.test(cleaned)) {
    return cleaned;
  }

  return null;
}
