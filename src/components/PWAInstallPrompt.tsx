import { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { DeviceMobile } from 'phosphor-react';

export default function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installPWA();
    if (!success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div>
          <DeviceMobile size={24} weight="bold" className="text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            Installer ScanBook
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Accédez rapidement à votre bibliothèque depuis votre écran d'accueil
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}