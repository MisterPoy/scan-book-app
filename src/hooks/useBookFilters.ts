import { useMemo } from 'react';
import type { FilterState } from '../components/FiltersPanel';

interface CollectionBook {
  isbn: string;
  title: string;
  authors: string[];
  addedAt: string;
  isRead: boolean;
  customCoverUrl?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  isManualEntry?: boolean;
  readingStatus?: 'lu' | 'non_lu' | 'a_lire' | 'en_cours' | 'abandonne';
  bookType?: 'physique' | 'numerique' | 'audio';
  genre?: string;
  tags?: string[];
  libraries?: string[];
  isFavorite?: boolean;
}

export function useBookFilters(books: CollectionBook[], filters: FilterState) {
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Filtre statut de lecture (avec fallback sur isRead pour rétrocompatibilité)
      if (filters.readingStatus.length > 0) {
        const bookStatus = book.readingStatus || (book.isRead ? 'lu' : 'non_lu');
        if (!filters.readingStatus.includes(bookStatus)) {
          return false;
        }
      }

      // Filtre type de livre (avec fallback par défaut)
      if (filters.bookType.length > 0) {
        const bookType = book.bookType || 'physique'; // Par défaut physique
        if (!filters.bookType.includes(bookType)) {
          return false;
        }
      }

      // Filtre genre
      if (filters.genre.length > 0) {
        if (!book.genre || !filters.genre.includes(book.genre)) {
          return false;
        }
      }

      // Filtre par année de publication
      if (filters.yearRange[0] !== null || filters.yearRange[1] !== null) {
        const bookYear = book.publishedDate ? parseInt(book.publishedDate) : null;
        if (bookYear) {
          if (filters.yearRange[0] !== null && bookYear < filters.yearRange[0]) return false;
          if (filters.yearRange[1] !== null && bookYear > filters.yearRange[1]) return false;
        } else if (filters.yearRange[0] !== null || filters.yearRange[1] !== null) {
          return false; // Exclure les livres sans année si un filtre année est actif
        }
      }

      // Filtre par nombre de pages
      if (filters.pageRange[0] !== null || filters.pageRange[1] !== null) {
        const bookPages = book.pageCount;
        if (bookPages) {
          if (filters.pageRange[0] !== null && bookPages < filters.pageRange[0]) return false;
          if (filters.pageRange[1] !== null && bookPages > filters.pageRange[1]) return false;
        } else if (filters.pageRange[0] !== null || filters.pageRange[1] !== null) {
          return false; // Exclure les livres sans pages si un filtre page est actif
        }
      }

      // Filtre par auteurs
      if (filters.authors.length > 0) {
        const bookAuthors = book.authors || [];
        const hasMatchingAuthor = filters.authors.some(filterAuthor => 
          bookAuthors.some(bookAuthor => 
            bookAuthor.toLowerCase().includes(filterAuthor.toLowerCase())
          )
        );
        if (!hasMatchingAuthor) return false;
      }

      // Filtre favoris
      if (filters.favorites !== null) {
        const isFavorite = book.isFavorite || false;
        if (filters.favorites !== isFavorite) return false;
      }

      // Filtre par bibliothèques
      if (filters.libraries.length > 0) {
        const bookLibraries = book.libraries || [];
        const hasMatchingLibrary = filters.libraries.some(filterId => 
          bookLibraries.includes(filterId)
        );
        if (!hasMatchingLibrary) return false;
      }

      return true;
    });
  }, [books, filters]);

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    books.forEach(book => {
      if (book.genre) {
        genres.add(book.genre);
      }
    });
    return Array.from(genres).sort();
  }, [books]);

  const statistics = useMemo(() => {
    const stats = {
      total: books.length,
      filtered: filteredBooks.length,
      byStatus: {
        lu: books.filter(b => b.readingStatus === 'lu').length,
        a_lire: books.filter(b => b.readingStatus === 'a_lire').length,
        en_cours: books.filter(b => b.readingStatus === 'en_cours').length,
        abandonne: books.filter(b => b.readingStatus === 'abandonne').length,
      },
      byType: {
        physique: books.filter(b => b.bookType === 'physique').length,
        numerique: books.filter(b => b.bookType === 'numerique').length,
        audio: books.filter(b => b.bookType === 'audio').length,
      }
    };
    return stats;
  }, [books, filteredBooks]);

  return {
    filteredBooks,
    availableGenres,
    statistics
  };
}