import { useState, useEffect } from 'react';
import { Book, CheckCircle } from 'phosphor-react';
import { imageQueue, hasFailedBefore } from '../utils/imageQueue';

interface GoogleBook {
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

interface SearchResultCardProps {
  book: GoogleBook;
  isInCollection: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelect: (isbn: string) => void;
  onCardClick: (book: GoogleBook) => void;
}

export default function SearchResultCard({
  book,
  isInCollection,
  isSelected,
  selectionMode,
  onToggleSelect,
  onCardClick
}: SearchResultCardProps) {
  const isbn = book.volumeInfo.industryIdentifiers?.find(
    id => id.type === "ISBN_13" || id.type === "ISBN_10"
  )?.identifier || "";

  const [coverSrc, setCoverSrc] = useState(
    book.volumeInfo.imageLinks?.thumbnail ||
    book.volumeInfo.imageLinks?.smallThumbnail ||
    "/img/default-cover.png"
  );
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    const thumbnailUrl = book.volumeInfo.imageLinks?.thumbnail;
    if (!thumbnailUrl) {
      setCoverSrc("/img/default-cover.png");
      setImageStatus('loaded');
      return;
    }

    // Vérifier si l'image a déjà échoué
    if (hasFailedBefore(thumbnailUrl)) {
      setCoverSrc("/img/default-cover.png");
      setImageStatus('loaded');
      return;
    }

    // Utiliser la queue pour charger l'image
    imageQueue.add(thumbnailUrl)
      .then((url) => {
        setCoverSrc(url);
        setImageStatus('loaded');
      })
      .catch(() => {
        setCoverSrc("/img/default-cover.png");
        setImageStatus('error');
      });
  }, [book.volumeInfo.imageLinks?.thumbnail]);

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect(isbn);
    } else {
      onCardClick(book);
    }
  };

  return (
    <div
      className={`relative bg-white rounded-lg border-2 shadow hover:shadow-md transition-all cursor-pointer overflow-hidden ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
      onClick={handleClick}
      role={selectionMode ? "checkbox" : "button"}
      aria-checked={selectionMode ? isSelected : undefined}
      aria-label={selectionMode
        ? `${isSelected ? 'Désélectionner' : 'Sélectionner'} ${book.volumeInfo.title}`
        : `Voir les détails de ${book.volumeInfo.title}`
      }
    >
      {/* Checkbox en mode sélection */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
            }`}
            aria-hidden="true"
          >
            {isSelected && <CheckCircle size={16} weight="bold" className="text-white" />}
          </div>
        </div>
      )}

      {/* Image */}
      <div className="aspect-[2/3] bg-gray-100 overflow-hidden relative">
        {imageStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <img
          src={coverSrc}
          alt={book.volumeInfo.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {imageStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Book size={48} weight="regular" className="text-gray-400" />
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-gray-900">
          {book.volumeInfo.title}
        </h3>
        <p className="text-xs text-gray-600 line-clamp-1 mb-1">
          {book.volumeInfo.authors?.join(', ') || 'Auteur inconnu'}
        </p>
        {book.volumeInfo.publishedDate && (
          <p className="text-xs text-gray-500">
            {book.volumeInfo.publishedDate.substring(0, 4)}
          </p>
        )}
        {isInCollection && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
            Dans la collection
          </span>
        )}
      </div>
    </div>
  );
}
