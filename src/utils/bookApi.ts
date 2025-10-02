import type { BookMetadata, ScannedBook } from '../types/bulkAdd';
import type { Firestore } from 'firebase/firestore';

/**
 * Récupère les métadonnées d'un livre via son ISBN
 * Utilise Google Books API en priorité, puis OpenLibrary en fallback
 */
export async function fetchBookMetadata(isbn: string): Promise<BookMetadata | null> {
  try {
    // 1. Essayer Google Books en premier
    const googleRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );
    const googleData = await googleRes.json();

    if (googleData.items && googleData.items.length > 0) {
      const volumeInfo = googleData.items[0].volumeInfo;
      return {
        title: volumeInfo.title || 'Titre inconnu',
        authors: volumeInfo.authors || [],
        publisher: volumeInfo.publisher,
        publishedDate: volumeInfo.publishedDate,
        description: volumeInfo.description,
        pageCount: volumeInfo.pageCount,
        thumbnail: volumeInfo.imageLinks?.thumbnail,
      };
    }

    // 2. Fallback OpenLibrary
    const openLibRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const openLibData = await openLibRes.json();
    const bookData = openLibData[`ISBN:${isbn}`];

    if (bookData) {
      return {
        title: bookData.title || 'Titre inconnu',
        authors: bookData.authors?.map((a: { name: string }) => a.name) || [],
        publisher: bookData.publishers?.[0]?.name,
        publishedDate: bookData.publish_date,
        description: bookData.notes || bookData.subtitle,
        pageCount: bookData.number_of_pages,
        thumbnail: bookData.cover?.medium || bookData.cover?.small,
      };
    }

    return null;
  } catch (error) {
    console.error(`Erreur fetch métadonnées ISBN ${isbn}:`, error);
    return null;
  }
}

/**
 * Récupère les métadonnées de plusieurs ISBNs en parallèle
 * Retourne un tableau de ScannedBook avec les métadonnées chargées
 */
export async function fetchMultipleBooks(isbns: string[]): Promise<ScannedBook[]> {
  const promises = isbns.map(async (isbn): Promise<ScannedBook> => {
    try {
      const metadata = await fetchBookMetadata(isbn);

      if (metadata) {
        return {
          isbn,
          title: metadata.title,
          authors: metadata.authors,
          thumbnail: metadata.thumbnail,
          publisher: metadata.publisher,
          publishedDate: metadata.publishedDate,
          description: metadata.description,
          pageCount: metadata.pageCount,
          isLoading: false,
        };
      } else {
        return {
          isbn,
          isLoading: false,
          error: 'Livre introuvable',
        };
      }
    } catch {
      return {
        isbn,
        isLoading: false,
        error: 'Erreur de chargement',
      };
    }
  });

  return Promise.all(promises);
}

/**
 * Génère une URL de couverture depuis OpenLibrary
 */
export function getOpenLibraryCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'M'): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
}

/**
 * Ajoute plusieurs livres à la collection Firestore en une seule transaction batch
 * Vérifie les doublons, fetch les métadonnées, et retourne un rapport détaillé
 */
export async function bulkAddBooks(
  isbns: string[],
  userId: string,
  db: Firestore,
  existingBooks: Array<{ isbn: string }>, // Livres déjà dans la collection
  personalNotes?: Record<string, string>
): Promise<import('../types/bulkAdd').BulkAddResponse> {
  const { collection, doc, writeBatch } = await import('firebase/firestore');

  const added: Array<{ isbn: string; title: string }> = [];
  const duplicates: string[] = [];
  const errors: Array<{ isbn: string; error: string }> = [];

  // Créer un batch pour les écritures
  let batch = writeBatch(db);
  let batchCount = 0;

  // Traiter chaque ISBN
  for (const isbn of isbns) {
    try {
      // Vérifier si déjà dans la collection
      const isAlreadyInCollection = existingBooks.some(book => book.isbn === isbn);

      if (isAlreadyInCollection) {
        duplicates.push(isbn);
        continue;
      }

      // Récupérer les métadonnées
      const metadata = await fetchBookMetadata(isbn);

      if (!metadata) {
        errors.push({ isbn, error: 'Métadonnées introuvables' });
        continue;
      }

      // Préparer le document à ajouter
      const bookData = {
        isbn,
        title: metadata.title,
        authors: metadata.authors,
        publisher: metadata.publisher,
        publishedDate: metadata.publishedDate,
        description: metadata.description,
        pageCount: metadata.pageCount,
        addedAt: new Date().toISOString(),
        isRead: false,
        readingStatus: 'non_lu',
        bookType: 'physique',
        isManualEntry: false,
        ...(personalNotes?.[isbn] && { notes: personalNotes[isbn] }),
      };

      // Ajouter au batch
      const bookRef = doc(collection(db, `users/${userId}/collection`), isbn);
      batch.set(bookRef, bookData);
      batchCount++;

      added.push({ isbn, title: metadata.title });

      // Firebase batch limit est 500 opérations, commiter si on approche
      if (batchCount >= 450) {
        await batch.commit();
        // Créer un nouveau batch pour les opérations suivantes
        batch = writeBatch(db);
        batchCount = 0;
      }
    } catch (error) {
      console.error(`Erreur lors du traitement de l'ISBN ${isbn}:`, error);
      errors.push({ isbn, error: 'Erreur de traitement' });
    }
  }

  // Commiter les opérations restantes
  if (batchCount > 0) {
    try {
      await batch.commit();
    } catch (error) {
      console.error('Erreur lors du commit batch:', error);
      throw new Error('Erreur lors de l\'ajout des livres');
    }
  }

  return {
    added,
    duplicates,
    errors,
  };
}
