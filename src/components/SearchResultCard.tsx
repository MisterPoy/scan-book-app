import { useState, useEffect } from 'react';
import { Book, CheckCircle } from 'phosphor-react';
import { imageQueue, hasFailedBefore } from '../utils/imageQueue';

interface GoogleBook {
  isbn?: string;
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
  };
  categories?: string[];
}

interface SearchResultCardProps {
  book: GoogleBook;
  isInCollection: boolean;
  isSelected: boolean;
  onToggleSelect: (isbn: string) => void;
  onCardClick: (book: GoogleBook) => void;
}

export default function SearchResultCard({
  book,
  isInCollection,
  isSelected,
  onToggleSelect,
  onCardClick
}: SearchResultCardProps) {
  const isbn = book.isbn || "";

  const [coverSrc, setCoverSrc] = useState(
    book.imageLinks?.thumbnail || "/img/default-cover.png"
  );
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    const thumbnailUrl = book.imageLinks?.thumbnail;
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
    imageQueue.loadImage(thumbnailUrl, isbn)
      .then((result) => {
        setCoverSrc(result.url);
        setImageStatus('loaded');
      })
      .catch(() => {
        setCoverSrc("/img/default-cover.png");
        setImageStatus('error');
      });
  }, [book.imageLinks?.thumbnail, isbn]);

  const handleCardClick = () => {
    onCardClick(book);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(isbn);
  };

  return (
    <div
      className={`relative bg-white rounded-lg border-2 shadow hover:shadow-md transition-all cursor-pointer overflow-hidden ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
      onClick={handleCardClick}
      role="button"
      aria-label={`Voir les détails de ${book.title}`}
    >
      {/* Checkbox toujours visible */}
      <button
        onClick={handleCheckboxClick}
        className="absolute top-2 left-2 z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} ${book.title}`}
      >
        <div
          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
          }`}
          aria-hidden="true"
        >
          {isSelected && <CheckCircle size={16} weight="bold" className="text-white" />}
        </div>
      </button>

      {/* Image */}
      <div className="aspect-[2/3] bg-gray-100 overflow-hidden relative">
        {imageStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <img
          src={coverSrc}
          alt={book.title}
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
          {book.title}
        </h3>
        <p className="text-xs text-gray-600 line-clamp-1 mb-1">
          {book.authors?.join(', ') || 'Auteur inconnu'}
        </p>
        {book.publishedDate && (
          <p className="text-xs text-gray-500">
            {book.publishedDate.substring(0, 4)}
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
