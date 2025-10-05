import { usePWA } from '../hooks/usePWA';
import { DownloadSimple } from 'phosphor-react';

/**
 * Bouton d'installation manuel de la PWA.
 * Affiche un bouton flottant discret en bas à droite quand l'installation est possible.
 * Disparaît automatiquement une fois l'app installée ou le prompt refusé.
 */
export default function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installPWA } = usePWA();

  // Ne rien afficher si pas installable ou déjà installé
  if (!isInstallable || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    await installPWA();
  };

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-indigo-600 text-white font-medium px-4 py-3 rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
      title="Installer l'application sur votre appareil"
    >
      <DownloadSimple size={20} weight="bold" />
      <span className="hidden sm:inline">Installer l'app</span>
    </button>
  );
}
