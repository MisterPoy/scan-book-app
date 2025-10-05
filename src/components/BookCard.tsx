import { useEffect, useState } from 'react';
import { imageQueue } from '../utils/imageQueue';

interface Props {
  title: string;
  authors: string[];
  isbn: string;
  customCoverUrl?: string;
  imageLinks?: { thumbnail?: string };
}

export default function BookCard({ title, authors, isbn, customCoverUrl, imageLinks }: Props) {
  const [coverSrc, setCoverSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fallback = '/img/default-cover.png';

  useEffect(() => {
    let cancelled = false;

    const loadCover = async () => {
      setIsLoading(true);

      // 1. Si image personnalisée, l'utiliser en priorité
      if (customCoverUrl) {
        setCoverSrc(customCoverUrl);
        setIsLoading(false);
        return;
      }

      // 2. Si image Google Books disponible, l'utiliser
      if (imageLinks?.thumbnail) {
        setCoverSrc(imageLinks.thumbnail);
        setIsLoading(false);
        return;
      }

      // 3. Sinon, essayer OpenLibrary avec l'ISBN via la queue (throttling)
      const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

      const result = await imageQueue.loadImage(openLibraryUrl);

      if (!cancelled) {
        if (result.success) {
          setCoverSrc(result.url);
        } else {
          setCoverSrc(fallback);
        }
        setIsLoading(false);
      }
    };

    loadCover();

    // Cleanup si le composant se démonte pendant le chargement
    return () => {
      cancelled = true;
    };
  }, [isbn, customCoverUrl, imageLinks, fallback]);

  return (
    <div className="bg-white p-4 border rounded shadow w-80 text-center">
      {isLoading ? (
        <div className="mb-2 mx-auto w-full h-64 bg-gray-200 animate-pulse rounded flex items-center justify-center">
          <div className="text-gray-400 text-sm">Chargement...</div>
        </div>
      ) : (
        <img src={coverSrc} alt={title} className="mb-2 mx-auto" />
      )}
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-gray-600">{authors?.join(', ')}</p>
    </div>
  );
}
