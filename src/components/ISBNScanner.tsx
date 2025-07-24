import { useState } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function ISBNScanner({ onDetected, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setCameraActive(!cameraActive);
            setError(null); // Reset l'erreur lors du toggle
          }}
          className={`px-4 py-2 rounded font-medium ${
            cameraActive 
              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {cameraActive ? '📹 Désactiver caméra' : '📷 Activer caméra'}
        </button>
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          ✕ Fermer
        </button>
      </div>
      {cameraActive ? (
        <BarcodeScannerComponent
          width={300}
          height={300}
          onUpdate={(err, result) => {
            if (err) {
              // Ignore les erreurs d'initialisation normales
              if (err.name !== 'NotAllowedError' && err.name !== 'NotFoundError') {
                setError('Erreur caméra');
              }
            } else if (result) {
              setError(null); // Reset l'erreur quand ça marche
              const code = result.getText();
              onDetected(code);
            }
          }}
        />
      ) : (
        <div className="w-[300px] h-[300px] bg-gray-200 flex items-center justify-center rounded">
          <p className="text-gray-600">📷 Caméra désactivée</p>
        </div>
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
