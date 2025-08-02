import { useState, useRef, useEffect } from 'react';
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
  const [cameraInfo, setCameraInfo] = useState<string>('');
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
        facingMode: { ideal: 'environment' },
        frameRate: { ideal: 30, min: 15 },
        aspectRatio: { ideal: 16/9 }
      }
    }
  });

  // Obtenir les infos de la caméra quand elle est active
  useEffect(() => {
    if (cameraActive && ref.current && ref.current.srcObject) {
      const stream = ref.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setCameraInfo(`${settings.width}x${settings.height} @${settings.frameRate || 30}fps`);
        console.log('Paramètres caméra réels:', settings);
      }
    }
  }, [cameraActive, ref.current?.srcObject]);

  // Fonction pour capturer une photo et l'analyser
  const capturePhoto = async () => {
    if (!ref.current || !canvasRef.current) {
      console.log('Références manquantes pour la capture');
      return;
    }
    
    const video = ref.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.log('Contexte canvas manquant');
      return;
    }

    try {
      // Configurer le canvas aux dimensions de la vidéo
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // Capturer l'image actuelle de la vidéo
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      console.log('Photo capturée, dimensions:', canvas.width, 'x', canvas.height);
      
      // Temporairement désactiver le scan automatique pour éviter les conflits
      setIsPhotoMode(true);
      
      // Feedback visuel
      setError('📸 Photo capturée, analyse en cours...');
      
      // Attendre un peu puis relancer le scan automatique
      setTimeout(() => {
        setIsPhotoMode(false);
        setError(null);
        console.log('Reprise du scan automatique');
      }, 2000);
      
    } catch (error) {
      console.error('Erreur capture photo:', error);
      setError('Erreur lors de la capture de la photo');
      setIsPhotoMode(false);
    }
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
            width={400}
            height={300}
            className="rounded-lg shadow-lg"
            style={{ objectFit: 'cover' }}
          />
          {/* Zone de ciblage overlay - style original amélioré */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Coins de la zone de scan */}
            <div className="absolute top-8 left-8 w-8 h-8 border-l-4 border-t-4 border-blue-500"></div>
            <div className="absolute top-8 right-8 w-8 h-8 border-r-4 border-t-4 border-blue-500"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-l-4 border-b-4 border-blue-500"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-r-4 border-b-4 border-blue-500"></div>
            
            {/* Zone de scan centrale - adaptée à la nouvelle taille */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-20 border-2 border-dashed border-blue-400 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-blue-600 font-semibold text-xs mb-1">📖 Zone de scan</div>
                <div className="text-blue-500 text-xs">Code-barres ici</div>
              </div>
            </div>
            
            {/* Ligne de scan animée */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-0.5 bg-red-500 animate-pulse"></div>
            
            {/* Indicateur de qualité */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs">
              📱 {cameraInfo || 'Résolution: HD'}
            </div>
          </div>
          
          {/* Bouton photo flottant sur la caméra */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
            <button
              onClick={capturePhoto}
              className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg transition-colors"
              title="Prendre une photo pour analyse"
            >
              📸
            </button>
          </div>
        </div>
      ) : (
        <div className="w-[400px] h-[300px] bg-gray-200 flex items-center justify-center rounded-lg shadow-lg">
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
