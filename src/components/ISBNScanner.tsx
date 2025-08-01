import { useState } from 'react';
import { useZxing } from 'react-zxing';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function ISBNScanner({ onDetected, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  const { ref } = useZxing({
    onDecodeResult(result) {
      setError(null);
      const code = result.getText();
      onDetected(code);
    },
    onDecodeError(error) {
      // Ne pas afficher les erreurs de scan en continu pour éviter le spam
      console.debug('Scan error:', error);
    },
    paused: !cameraActive,
    constraints: {
      video: {
        width: 300,
        height: 300,
        facingMode: 'environment' // Caméra arrière sur mobile
      }
    }
  });

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
        <div className="relative">
          <video
            ref={ref}
            width={300}
            height={300}
            className="rounded"
            style={{ objectFit: 'cover' }}
          />
          {/* Zone de ciblage overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Coins de la zone de scan */}
            <div className="absolute top-8 left-8 w-8 h-8 border-l-4 border-t-4 border-blue-500"></div>
            <div className="absolute top-8 right-8 w-8 h-8 border-r-4 border-t-4 border-blue-500"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-l-4 border-b-4 border-blue-500"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-r-4 border-b-4 border-blue-500"></div>
            
            {/* Zone de scan centrale */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-dashed border-blue-400 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-blue-600 font-semibold text-sm mb-1">📖 Zone de scan</div>
                <div className="text-blue-500 text-xs">Placez le code-barres ici</div>
              </div>
            </div>
            
            {/* Ligne de scan animée */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-0.5 bg-red-500 animate-pulse"></div>
          </div>
        </div>
      ) : (
        <div className="w-[300px] h-[300px] bg-gray-200 flex items-center justify-center rounded">
          <p className="text-gray-600">📷 Caméra désactivée</p>
        </div>
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
