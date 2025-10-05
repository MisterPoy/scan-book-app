/**
 * Queue pour charger les images OpenLibrary de manière progressive
 * Évite de surcharger le serveur OpenLibrary avec trop de requêtes simultanées
 */

type ImageRequest = {
  url: string;
  resolve: (result: { success: boolean; url: string }) => void;
};

class ImageLoadQueue {
  private queue: ImageRequest[] = [];
  private isProcessing = false;
  private delay = 100; // Délai entre chaque chargement (ms)

  /**
   * Ajoute une image à charger dans la queue
   */
  async loadImage(url: string): Promise<{ success: boolean; url: string }> {
    return new Promise((resolve) => {
      this.queue.push({ url, resolve });
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
        request.resolve(result);
      } catch {
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
}

// Instance singleton
export const imageQueue = new ImageLoadQueue();
