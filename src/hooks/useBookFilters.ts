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
  readingStatus: 'lu' | 'a_lire' | 'en_cours' | 'abandonne';
  bookType: 'physique' | 'numerique' | 'audio';
  genre?: string;
  tags?: string[];
}

export function useBookFilters(books: CollectionBook[], filters: FilterState) {
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      // Filtre statut de lecture
      if (filters.readingStatus.length > 0) {
        if (!filters.readingStatus.includes(book.readingStatus)) {
          return false;
        }
      }

      // Filtre type de livre
      if (filters.bookType.length > 0) {
        if (!filters.bookType.includes(book.bookType)) {
          return false;
        }
      }

      // Filtre genre
      if (filters.genre.length > 0) {
        if (!book.genre || !filters.genre.includes(book.genre)) {
          return false;
        }
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