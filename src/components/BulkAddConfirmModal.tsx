import { useState, useEffect } from 'react';
import {
  X,
  Book,
  CheckCircle,
  Warning,
  Trash,
  Note,
  Stack,
  Hourglass
} from 'phosphor-react';
import { fetchMultipleBooks } from '../utils/bookApi';
import type { ScannedBook } from '../types/bulkAdd';

interface BulkAddConfirmModalProps {
  isbns: string[];
  onConfirm: (isbns: string[], personalNotes: Record<string, string>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function BulkAddConfirmModal({
  isbns,
  onConfirm,
  onCancel,
  isOpen,
}: BulkAddConfirmModalProps) {
  const [books, setBooks] = useState<ScannedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});
  const [selectedIsbns, setSelectedIsbns] = useState<string[]>(isbns);

  useEffect(() => {
    if (isOpen && isbns.length > 0) {
      loadBooks();
      setSelectedIsbns(isbns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isbns]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const loadedBooks = await fetchMultipleBooks(isbns);
      setBooks(loadedBooks);
    } catch (error) {
      console.error('Erreur chargement des livres:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBook = (isbn: string) => {
    setSelectedIsbns(prev => prev.filter(id => id !== isbn));
    setBooks(prev => prev.filter(book => book.isbn !== isbn));
  };

  const handleNoteChange = (isbn: string, note: string) => {
    setPersonalNotes(prev => ({
      ...prev,
      [isbn]: note,
    }));
  };

  const handleConfirm = () => {
    onConfirm(selectedIsbns, personalNotes);
  };

  if (!isOpen) return null;

  const validBooks = books.filter(book => selectedIsbns.includes(book.isbn));
  const hasErrors = validBooks.some(book => book.error);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Stack size={28} weight="bold" />
            Confirmer l'ajout groupé
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Hourglass size={48} className="text-blue-500 mb-4 animate-pulse" />
              <p className="text-gray-600 font-medium">Chargement des informations...</p>
              <p className="text-gray-500 text-sm">Récupération des métadonnées des livres</p>
            </div>
          ) : validBooks.length === 0 ? (
            <div className="text-center py-12">
              <Book size={64} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucun livre à ajouter</p>
              <p className="text-gray-500 text-sm">Tous les livres ont été retirés</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <CheckCircle size={16} weight="bold" className="inline mr-2" />
                  <strong>{validBooks.length}</strong> livre{validBooks.length > 1 ? 's' : ''} prêt{validBooks.length > 1 ? 's' : ''} à être ajouté{validBooks.length > 1 ? 's' : ''}
                </p>
                {hasErrors && (
                  <p className="text-sm text-orange-700 mt-2">
                    <Warning size={16} weight="bold" className="inline mr-2" />
                    Certains livres n'ont pas pu être trouvés
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {validBooks.map((book) => (
                  <div
                    key={book.isbn}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Couverture */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-28 bg-gray-100 rounded overflow-hidden">
                          {book.thumbnail ? (
                            <img
                              src={book.thumbnail}
                              alt={book.title || 'Couverture'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/img/default-cover.png';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Book size={32} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informations */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {book.title || 'Titre inconnu'}
                            </h3>
                            {book.authors && book.authors.length > 0 && (
                              <p className="text-sm text-gray-600 mb-1">
                                {book.authors.join(', ')}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>
                          </div>

                          {/* Bouton supprimer */}
                          <button
                            onClick={() => handleRemoveBook(book.isbn)}
                            className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Retirer ce livre"
                          >
                            <Trash size={20} weight="regular" />
                          </button>
                        </div>

                        {/* Badge erreur */}
                        {book.error && (
                          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs text-red-700 flex items-center gap-1">
                              <Warning size={14} weight="bold" />
                              {book.error}
                            </p>
                          </div>
                        )}

                        {/* Champ note personnelle */}
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <Note size={14} weight="regular" className="inline mr-1" />
                            Note personnelle (facultatif)
                          </label>
                          <textarea
                            value={personalNotes[book.isbn] || ''}
                            onChange={(e) => handleNoteChange(book.isbn, e.target.value)}
                            placeholder="Ajoutez une note sur ce livre..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {validBooks.length > 0 ? (
              <>
                <strong>{validBooks.length}</strong> livre{validBooks.length > 1 ? 's' : ''} sélectionné{validBooks.length > 1 ? 's' : ''}
              </>
            ) : (
              'Aucun livre sélectionné'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={validBooks.length === 0 || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <CheckCircle size={16} weight="bold" className="inline mr-2" />
              Ajouter {validBooks.length > 0 && `${validBooks.length} livre${validBooks.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
