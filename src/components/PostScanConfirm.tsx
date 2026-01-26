import { useEffect } from 'react';
import { Book, CheckCircle, X } from 'phosphor-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import LibrarySelector from './LibrarySelector';
import type { UserLibrary } from '../types/library';

interface PostScanConfirmProps {
  isbn: string;
  title?: string;
  authors?: string[];
  publisher?: string;
  coverUrl?: string;
  onConfirm: () => void;
  onCancel: () => void;
  userLibraries?: UserLibrary[];
  selectedLibraries?: string[];
  onLibrarySelectionChange?: (libraryIds: string[]) => void;
}

export default function PostScanConfirm({
  isbn,
  title,
  authors,
  publisher,
  coverUrl,
  onConfirm,
  onCancel,
  userLibraries = [],
  selectedLibraries = [],
  onLibrarySelectionChange
}: PostScanConfirmProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleCloseRequest = () => onCancel();
    modal.addEventListener('modal-close-request', handleCloseRequest);

    return () => {
      modal.removeEventListener('modal-close-request', handleCloseRequest);
    };
  }, [modalRef, onCancel]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-scan-title"
      >
        <h2 id="post-scan-title" className="text-xl font-bold text-gray-900 mb-4">
          Livre détecté
        </h2>

        <div className="flex gap-4 mb-6">
          {/* Couverture */}
          <div className="flex-shrink-0 w-24 h-32 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={title || 'Couverture'}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 256 256"><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM48,48H96V208H48ZM208,208H112V48h96V208Z"></path></svg></div>';
                }}
              />
            ) : (
              <div className="text-gray-400">
                <Book size={48} weight="regular" />
              </div>
            )}
          </div>

          {/* Informations */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {title || 'Titre non disponible'}
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Auteur :</strong> {authors && authors.length > 0 ? authors.join(', ') : 'Auteur inconnu'}
            </p>
            {publisher && (
              <p className="text-sm text-gray-600 mb-1">
                <strong>Éditeur :</strong> {publisher}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              <strong>ISBN :</strong> {isbn}
            </p>
          </div>
        </div>

        {/* Sélecteur de bibliothèques */}
        {userLibraries.length > 0 && onLibrarySelectionChange && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <LibrarySelector
              libraries={userLibraries}
              selectedLibraries={selectedLibraries}
              onSelectionChange={onLibrarySelectionChange}
              title="Ajouter à une bibliothèque (optionnel)"
              emptyMessage="Créez d'abord des bibliothèques pour organiser vos livres"
            />
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
            aria-label="Annuler et ne pas ajouter ce livre"
          >
            <X size={18} weight="bold" aria-hidden="true" />
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
            aria-label="Confirmer et ajouter ce livre à ma collection"
          >
            <CheckCircle size={18} weight="bold" aria-hidden="true" />
            Ajouter à ma collection
          </button>
        </div>
      </div>
    </div>
  );
}
