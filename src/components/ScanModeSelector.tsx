import { useEffect } from 'react';
import { Camera, Stack } from 'phosphor-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ScanModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'single' | 'batch') => void;
}

export default function ScanModeSelector({ isOpen, onClose, onSelectMode }: ScanModeSelectorProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleCloseRequest = () => onClose();
    modal.addEventListener('modal-close-request', handleCloseRequest);

    return () => {
      modal.removeEventListener('modal-close-request', handleCloseRequest);
    };
  }, [modalRef, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-mode-title"
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="scan-mode-title" className="text-2xl font-bold text-gray-900 mb-2">
          Choisir le mode de scan
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Sélectionnez le mode de scan adapté à vos besoins
        </p>

        <div className="space-y-4">
          {/* Scan unique */}
          <button
            onClick={() => {
              onSelectMode('single');
              onClose();
            }}
            className="w-full p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 focus:ring-4 focus:ring-blue-300 transition-all cursor-pointer flex items-start gap-4"
            aria-label="Scanner un seul livre - Scannez un livre et ajoutez-le immédiatement"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
              <Camera size={32} weight="bold" className="text-blue-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">Scan unique</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Scannez un livre et ajoutez-le immédiatement à votre collection
              </p>
            </div>
          </button>

          {/* Scan par lot */}
          <button
            onClick={() => {
              onSelectMode('batch');
              onClose();
            }}
            className="w-full p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 focus:ring-4 focus:ring-green-300 transition-all cursor-pointer flex items-start gap-4"
            aria-label="Scanner plusieurs livres - Scannez plusieurs livres d'affilée puis validez"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
              <Stack size={32} weight="bold" className="text-green-600" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-1">Scan par lot</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Scannez plusieurs livres d'affilée puis validez en une fois
              </p>
            </div>
          </button>
        </div>

        {/* Bouton Annuler */}
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
          aria-label="Annuler et fermer la fenêtre de choix"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
