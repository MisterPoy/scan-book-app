/**
 * Queue pour charger les images OpenLibrary de manière progressive
 * Évite de surcharger le serveur OpenLibrary avec trop de requêtes simultanées
 */

// Version du cache - incrémenter pour forcer l'invalidation
const CACHE_VERSION = 2;
const CACHE_VERSION_KEY = 'kodeks_image_cache_version';

// Cache des ISBN sans couverture (évite requêtes inutiles répétées)
const FAILED_ISBNS_KEY = 'kodeks_failed_cover_isbns';
const failedIsbnsCache = new Set<string>(
  JSON.parse(localStorage.getItem(FAILED_ISBNS_KEY) || '[]')
);

function markIsbnAsFailed(isbn: string): void {
  failedIsbnsCache.add(isbn);
  try {
    localStorage.setItem(FAILED_ISBNS_KEY, JSON.stringify([...failedIsbnsCache]));
  } catch {
    // Quota localStorage dépassé - ignorer silencieusement
  }
}

export function hasFailedBefore(isbn: string): boolean {
  return failedIsbnsCache.has(isbn);
}

type ImageRequest = {
  url: string;
  isbn?: string; // Pour tracker les échecs
  resolve: (result: { success: boolean; url: string }) => void;
};

/**
 * Initialise et vérifie la version du cache
 * Nettoie le cache si la version a changé
 */
function initializeCacheVersion(): void {
  try {
    const currentVersion = localStorage.getItem(CACHE_VERSION_KEY);

    if (!currentVersion || parseInt(currentVersion) < CACHE_VERSION) {
      // Nouvelle version détectée - nettoyer l'ancien cache
      console.log(`Mise à jour du cache d'images : v${currentVersion || 1} → v${CACHE_VERSION}`);

      // Supprimer toutes les clés de cache d'images
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('image_cache_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Mettre à jour la version
      localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION.toString());

      console.log(`✓ Cache nettoyé (${keysToRemove.length} entrées supprimées)`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du cache:', error);
  }
}

// Initialiser le cache au chargement du module
initializeCacheVersion();

class ImageLoadQueue {
  private queue: ImageRequest[] = [];
  private isProcessing = false;
  private delay = 300; // Délai entre chaque chargement (ms) - augmenté pour réduire spam console

  /**
   * Ajoute une image à charger dans la queue
   */
  async loadImage(url: string, isbn?: string): Promise<{ success: boolean; url: string }> {
    return new Promise((resolve) => {
      this.queue.push({ url, isbn, resolve });
      this.processQueue();
    });
  }

  /**
   * Traite la queue progressivement
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      try {
        const result = await this.tryLoadImage(request.url);

        // Si échec et ISBN fourni, le cacher pour éviter re-tentatives
        if (!result.success && request.isbn) {
          markIsbnAsFailed(request.isbn);
        }

        request.resolve(result);
      } catch {
        // En cas d'exception, marquer aussi comme échoué si ISBN fourni
        if (request.isbn) {
          markIsbnAsFailed(request.isbn);
        }
        request.resolve({ success: false, url: request.url });
      }

      // Délai avant la prochaine image
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Teste le chargement d'une image
   */
  private tryLoadImage(url: string): Promise<{ success: boolean; url: string }> {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        // Vérifier que l'image n'est pas un pixel transparent (image par défaut OpenLibrary)
        if (img.width > 1 && img.height > 1) {
          resolve({ success: true, url });
        } else {
          resolve({ success: false, url });
        }
      };

      img.onerror = () => {
        resolve({ success: false, url });
      };

      img.src = url;
    });
  }

  /**
   * Nettoie manuellement tout le cache d'images
   * Utile pour forcer le rechargement des couvertures
   */
  clearCache(): number {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('image_cache_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log(`✓ Cache d'images nettoyé (${keysToRemove.length} entrées)`);
      return keysToRemove.length;
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
      return 0;
    }
  }
}

// Instance singleton
export const imageQueue = new ImageLoadQueue();
