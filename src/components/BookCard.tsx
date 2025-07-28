import { useEffect, useState } from 'react';

interface Props {
  title: string;
  authors: string[];
  isbn: string;
  customCoverUrl?: string;
}

export default function BookCard({ title, authors, isbn, customCoverUrl }: Props) {
  const [coverSrc, setCoverSrc] = useState('');
  const fallback = '/img/default-cover.png';

  useEffect(() => {
    // Si image personnalisée, l'utiliser en priorité
    if (customCoverUrl) {
      setCoverSrc(customCoverUrl);
      return;
    }

    const testImage = new Image();
    const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    testImage.src = openLibraryUrl;
    testImage.onload = () => {
      if (testImage.width > 1 && testImage.height > 1) {
        setCoverSrc(openLibraryUrl);
      } else {
        setCoverSrc(fallback);
      }
    };
    testImage.onerror = () => setCoverSrc(fallback);
  }, [isbn, customCoverUrl]);

  return (
    <div className="bg-white p-4 border rounded shadow w-80 text-center">
      <img src={coverSrc} alt={title} className="mb-2 mx-auto" />
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-gray-600">{authors?.join(', ')}</p>
    </div>
  );
}
