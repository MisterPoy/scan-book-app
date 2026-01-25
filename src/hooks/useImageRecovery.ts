import { useState, useCallback } from 'react';

interface UseImageRecoveryOptions {
  isbn?: string;
  customCoverUrl?: string;
  googleBooksUrl?: string;
  fallbackUrl?: string;
}

interface ImageRecoveryResult {
  currentSrc: string;
  isLoading: boolean;
  handleImageError: () => Promise<void>;
  retryAttempts: number;
}

/**
 * Hook pour gérer la récupération automatique des couvertures de livres
 * En cas d'erreur, tente plusieurs sources alternatives avant d'afficher le fallback
 */
export function useImageRecovery({
  isbn,
  customCoverUrl,
  googleBooksUrl,
  fallbackUrl = '/img/default-cover.png'
}: UseImageRecoveryOptions): ImageRecoveryResult {
  const [currentSrc, setCurrentSrc] = useState<string>(
    customCoverUrl || googleBooksUrl || (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : fallbackUrl)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  const handleImageError = useCallback(async () => {
    if (retryAttempts >= 3 || !isbn) {
      // Trop de tentatives ou pas d'ISBN -> fallback définitif
      setCurrentSrc(fallbackUrl);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setRetryAttempts(prev => prev + 1);

    try {
      // Tentative 1 : OpenLibrary (si pas déjà essayé)
      if (retryAttempts === 0) {
        const openLibUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

        // Test si l'image charge
        const canLoad = await testImageLoad(openLibUrl);
        if (canLoad) {
          setCurrentSrc(openLibUrl);
          setIsLoading(false);
          return;
        }
      }

      // Tentative 2 : Google Books (si URL fournie et pas déjà utilisée)
      if (retryAttempts === 1 && googleBooksUrl && currentSrc !== googleBooksUrl) {
        const canLoad = await testImageLoad(googleBooksUrl);
        if (canLoad) {
          setCurrentSrc(googleBooksUrl);
          setIsLoading(false);
          return;
        }
      }

      // Tentative 3 : Re-fetch Google Books API (nouveau fetch)
      if (retryAttempts === 2) {
        const newGoogleUrl = await fetchGoogleBookscover(isbn);
        if (newGoogleUrl) {
          const canLoad = await testImageLoad(newGoogleUrl);
          if (canLoad) {
            setCurrentSrc(newGoogleUrl);
            setIsLoading(false);
            return;
          }
        }
      }

      // Toutes les tentatives ont échoué -> fallback
      setCurrentSrc(fallbackUrl);
    } catch (error) {
      console.error('Erreur lors de la récupération de couverture:', error);
      setCurrentSrc(fallbackUrl);
    } finally {
      setIsLoading(false);
    }
  }, [isbn, googleBooksUrl, fallbackUrl, retryAttempts, currentSrc]);

  return {
    currentSrc,
    isLoading,
    handleImageError,
    retryAttempts
  };
}

/**
 * Teste si une image peut être chargée
 */
function testImageLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      // Vérifier que l'image n'est pas un pixel transparent
      if (img.width > 1 && img.height > 1) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    img.onerror = () => resolve(false);
    img.src = url;

    // Timeout après 5 secondes
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Tente de récupérer une nouvelle URL de couverture depuis Google Books API
 */
async function fetchGoogleBookscover(isbn: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const thumbnail = data.items[0].volumeInfo?.imageLinks?.thumbnail;
      return thumbnail || null;
    }

    return null;
  } catch (error) {
    console.error('Erreur fetch Google Books:', error);
    return null;
  }
}
