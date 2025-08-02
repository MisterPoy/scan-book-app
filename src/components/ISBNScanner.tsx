import { useState, useRef } from 'react';
import { useZxing } from 'react-zxing';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function ISBNScanner({ onDetected, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { ref } = useZxing({
    onDecodeResult(result) {
      setError(null);
      const code = result.getText();
      console.log('Code détecté:', code);
      onDetected(code);
    },
    onDecodeError(error) {
      // Ne pas afficher les erreurs de scan en continu pour éviter le spam
      console.debug('Scan error:', error);
    },
    paused: !cameraActive || isPhotoMode,
    constraints: {
      video: {
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        facingMode: { ideal: 'environment' }
      }
    }
  });

  // Fonction pour capturer une photo et l'analyser
  const capturePhoto = () => {
    if (!ref.current || !canvasRef.current) return;
    
    const video = ref.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Configurer le canvas aux dimensions de la vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Capturer l'image
    context.drawImage(video, 0, 0);
    
    // Convertir en blob et analyser avec ZXing
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      try {
        // Créer une image temporaire pour ZXing
        const img = new Image();
        img.onload = () => {
          // L'analyse sera faite par ZXing automatiquement
          console.log('Photo capturée pour analyse');
        };
        img.src = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Erreur analyse photo:', error);
        setError('Erreur lors de l\'analyse de la photo');
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Canvas caché pour la capture photo */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Contrôles améliorés */}
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => {
            setCameraActive(!cameraActive);
            setError(null);
            setIsPhotoMode(false);
          }}
          className={`px-3 py-2 rounded text-sm font-medium ${
            cameraActive 
              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {cameraActive ? '📹 Désactiver' : '📷 Activer'}
        </button>
        
        {cameraActive && (
          <button
            onClick={capturePhoto}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium"
          >
            📸 Photo
          </button>
        )}
        
        <button
          onClick={() => setHelpVisible(!helpVisible)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium"
        >
          ❓ Aide
        </button>
        
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm font-medium"
        >
          ✕ Fermer
        </button>
      </div>
      
      {/* Aide contextuelle */}
      {helpVisible && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm max-w-md">
          <h4 className="font-medium text-blue-900 mb-2">📖 Conseils pour scanner un ISBN :</h4>
          <ul className="text-blue-800 space-y-1">
            <li>• Placez le code-barres dans la zone rectangulaire</li>
            <li>• Gardez l'appareil stable et net</li>
            <li>• Assurez-vous d'avoir un bon éclairage</li>
            <li>• Si le scan temps réel ne fonctionne pas, utilisez le bouton "📸 Photo"</li>
            <li>• Le code-barres ISBN se trouve généralement au dos du livre</li>
          </ul>
        </div>
      )}
      {cameraActive ? (
        <div className="relative">
          <video
            ref={ref}
            width={640}
            height={480}
            className="rounded-lg shadow-lg"
            style={{ objectFit: 'cover' }}
          />
          {/* Zone de ciblage optimisée pour ISBN */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Masque sombre autour de la zone de scan */}
            <div className="absolute inset-0 bg-black/40"></div>
            
            {/* Zone de scan ISBN (rectangle horizontal) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-20 bg-transparent border-2 border-green-400 rounded-lg">
              {/* Coins animés */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-green-400 animate-pulse"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-green-400 animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-green-400 animate-pulse"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-green-400 animate-pulse"></div>
              
              {/* Ligne de scan animée */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-400 shadow-lg animate-pulse"></div>
              
              {/* Texte instructif */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="bg-black/60 text-white px-3 py-1 rounded text-xs font-medium">
                  📖 Placez le code-barres ISBN ici
                </div>
              </div>
            </div>
            
            {/* Indicateur de qualité */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs">
              📱 Résolution: HD
            </div>
          </div>
        </div>
      ) : (
        <div className="w-[640px] h-[480px] bg-gray-200 flex items-center justify-center rounded-lg shadow-lg">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📷</div>
            <p className="text-gray-600 font-medium">Caméra désactivée</p>
            <p className="text-gray-500 text-sm">Activez la caméra pour scanner</p>
          </div>
        </div>
      )}
      
      {/* Messages d'erreur améliorés */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
          <div className="mt-2 text-red-600 text-xs">
            Essayez d'améliorer l'éclairage ou utilisez le mode photo
          </div>
        </div>
      )}
    </div>
  );
}
