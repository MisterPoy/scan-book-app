import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const checkInstalled = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isInFullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;
      const isInMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
      
      setIsInstalled(isInStandaloneMode || isInFullscreenMode || isInMinimalUi);
    };

    checkInstalled();

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('✅ PWA installée avec succès !');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {
      console.log('❌ Aucune invite d\'installation disponible');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Utilisateur a accepté l\'installation');
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('❌ Utilisateur a refusé l\'installation');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'installation:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    installPWA
  };
}