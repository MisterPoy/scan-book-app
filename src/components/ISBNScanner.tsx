import { useState, useEffect } from "react";
import { useZxing } from "react-zxing";
import {
  VideoCamera,
  Camera,
  Book,
  Question,
  X,
  DeviceMobile,
  Warning,
  CheckCircle,
  WarningCircle,
  Trash,
  Stack,
  ArrowsClockwise,
  Flashlight
} from "phosphor-react";
import { fetchBookMetadata, getOpenLibraryCoverUrl } from "../utils/bookApi";
import type { ScannedBook } from "../types/bulkAdd";

type ScanMode = 'single' | 'batch';

interface Props {
  mode: ScanMode;
  onDetected?: (code: string) => void; // Mode single
  onBulkScanComplete?: (isbns: string[]) => void; // Mode batch
  onClose: () => void;
  existingIsbns?: Set<string>; // Pour anti-doublon
}

// Mini-carte pour afficher un livre scanné dans la pile
function ScannedBookMiniCard({
  book,
  onRemove
}: {
  book: ScannedBook;
  onRemove: () => void;
}) {
  const [coverSrc, setCoverSrc] = useState("");

  useEffect(() => {
    if (book.thumbnail) {
      setCoverSrc(book.thumbnail);
    } else if (book.isbn) {
      setCoverSrc(getOpenLibraryCoverUrl(book.isbn, 'S'));
    }
  }, [book.isbn, book.thumbnail]);

  return (
    <div className="relative flex-shrink-0 w-24 bg-white border-2 border-green-300 rounded-lg shadow-md overflow-hidden animate-fadeIn">
      {/* Image de couverture */}
      <div className="h-28 bg-gray-100 overflow-hidden">
        {book.isLoading ? (
          <div className="h-full flex items-center justify-center">
            <ArrowsClockwise size={24} className="animate-spin text-blue-500" />
          </div>
        ) : coverSrc ? (
          <img
            src={coverSrc}
            alt={book.title || 'Couverture'}
            className="w-full h-full object-cover"
            onError={() => setCoverSrc('/img/default-cover.png')}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Book size={32} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* Titre */}
      <div className="p-1 text-xs">
        <p className="font-medium text-gray-900 line-clamp-2 leading-tight">
          {book.title || 'Chargement...'}
        </p>
        {book.authors && book.authors.length > 0 && (
          <p className="text-gray-500 text-xs line-clamp-1">
            {book.authors[0]}
          </p>
        )}
      </div>

      {/* Badge erreur si nécessaire */}
      {book.error && (
        <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
          Erreur
        </div>
      )}

      {/* Bouton supprimer */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors cursor-pointer"
        title="Retirer de la pile"
      >
        <X size={12} weight="bold" />
      </button>

      {/* Badge succès */}
      <div className="absolute bottom-1 right-1 bg-green-500 text-white p-1 rounded-full">
        <CheckCircle size={12} weight="bold" />
      </div>
    </div>
  );
}

export default function ISBNScanner({ mode = 'single', onDetected, onBulkScanComplete, onClose, existingIsbns }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [helpVisible, setHelpVisible] = useState(false);
  const [cameraInfo, setCameraInfo] = useState<string>("");

  // États pour le mode batch
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // État pour le feedback visuel universel
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'duplicate' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // États pour le flash/torch avec persistance localStorage
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(() => {
    // Récupérer la préférence sauvegardée
    const saved = localStorage.getItem('kodeks_torch_enabled');
    return saved === 'true';
  });

  const { ref } = useZxing({
    onDecodeResult(result) {
      setError(null);
      const code = result.getText();

      // Vérifier si déjà dans la bibliothèque
      if (existingIsbns && existingIsbns.has(code)) {
        showScanFeedback('duplicate', 'Déjà présent dans votre bibliothèque !');
        setDuplicateWarning(true);
        setTimeout(() => setDuplicateWarning(false), 2000);
        return; // Ne pas ajouter
      }

      if (mode === 'single') {
        // Mode single : afficher feedback et appeler onDetected
        showScanFeedback('success', 'Livre détecté !');
        onDetected?.(code);
      } else {
        // Mode batch : ajouter à la pile
        handleBatchScan(code);
      }
    },
    onDecodeError() {
      // Erreurs de scan normales (pas de code trouvé)
    },
    paused: !cameraActive,
    constraints: {
      video: {
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        facingMode: { ideal: "environment" },
        frameRate: { ideal: 30, min: 15 },
        aspectRatio: { ideal: 16 / 9 },
      },
    },
  });

  // Fonction pour afficher le feedback visuel
  const showScanFeedback = (type: 'success' | 'duplicate' | 'error', message: string) => {
    setScanFeedback({ type, message });

    // Feedback sonore
    if (navigator.vibrate) {
      if (type === 'success') {
        navigator.vibrate(200);
      } else if (type === 'duplicate') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate([50, 50, 50]);
      }
    }

    // Feedback sonore (bip)
    if (type === 'success') {
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch {
        // Ignorer si audio non disponible
      }
    }

    // Masquer après 2 secondes
    setTimeout(() => {
      setScanFeedback({ type: null, message: '' });
    }, 2000);
  };

  const handleBatchScan = async (isbn: string) => {
    // Vérifier si déjà scanné
    const alreadyScanned = scannedBooks.some(book => book.isbn === isbn);

    if (alreadyScanned) {
      // Feedback doublon
      showScanFeedback('duplicate', 'Déjà scanné dans la pile !');
      setDuplicateWarning(true);
      setTimeout(() => setDuplicateWarning(false), 2000);
      return;
    }

    // Ajouter à la pile avec chargement
    const newBook: ScannedBook = {
      isbn,
      isLoading: true,
    };

    setScannedBooks(prev => [...prev, newBook]);

    // Feedback succès
    showScanFeedback('success', 'Livre ajouté à la sélection !');

    // Charger les métadonnées
    const metadata = await fetchBookMetadata(isbn);

    if (!metadata) {
      // Livre non trouvé
      showScanFeedback('error', 'ISBN non reconnu');
      setScannedBooks(prev =>
        prev.map(book =>
          book.isbn === isbn
            ? {
                ...book,
                isLoading: false,
                error: 'Livre introuvable'
              }
            : book
        )
      );
      return;
    }

    setScannedBooks(prev =>
      prev.map(book =>
        book.isbn === isbn
          ? {
              ...book,
              ...metadata,
              isLoading: false,
            }
          : book
      )
    );
  };

  const handleRemoveFromBatch = (isbn: string) => {
    setScannedBooks(prev => prev.filter(book => book.isbn !== isbn));
  };

  const handleResetBatch = () => {
    setScannedBooks([]);
    setDuplicateWarning(false);
  };

  const handleValidateBatch = () => {
    const isbns = scannedBooks.map(book => book.isbn);
    onBulkScanComplete?.(isbns);
  };

  // Obtenir les infos de la caméra et détecter le support du flash
  useEffect(() => {
    if (cameraActive && ref.current && ref.current.srcObject) {
      const stream = ref.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setCameraInfo(
          `${settings.width}x${settings.height} @${settings.frameRate || 30}fps`
        );

        // Détecter le support du flash/torch
        const capabilities = videoTrack.getCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setTorchSupported(true);

          // Restaurer l'état du flash depuis localStorage si activé
          const savedTorchState = localStorage.getItem('kodeks_torch_enabled');
          if (savedTorchState === 'true') {
            videoTrack.applyConstraints({
              // @ts-expect-error: torch n'est pas dans les types TypeScript standard
              advanced: [{ torch: true }]
            }).catch(err => {
              console.error("Erreur restauration flash:", err);
              setTorchEnabled(false);
              localStorage.setItem('kodeks_torch_enabled', 'false');
            });
          }
        } else {
          setTorchSupported(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, ref.current?.srcObject]);

  // Fonction pour activer/désactiver le flash avec persistance
  const toggleTorch = async () => {
    if (!ref.current || !ref.current.srcObject || !torchSupported) return;

    const stream = ref.current.srcObject as MediaStream;
    const videoTrack = stream.getVideoTracks()[0];

    try {
      const newTorchState = !torchEnabled;
      await videoTrack.applyConstraints({
        // @ts-expect-error: torch n'est pas dans les types TypeScript standard
        advanced: [{ torch: newTorchState }]
      });
      setTorchEnabled(newTorchState);

      // Sauvegarder la préférence dans localStorage
      localStorage.setItem('kodeks_torch_enabled', newTorchState.toString());
    } catch (error) {
      console.error("Erreur lors de l'activation du flash:", error);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Badge du mode actif */}
      <div className="mb-3 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-sm font-medium text-blue-900">
          {mode === 'single' ? (
            <>
              <Book size={16} weight="regular" className="inline mr-2" />
              Mode scan unique
            </>
          ) : (
            <>
              <Stack size={16} weight="regular" className="inline mr-2" />
              Mode scan par lot ({scannedBooks.length} livre{scannedBooks.length > 1 ? 's' : ''})
            </>
          )}
        </p>
      </div>

      {/* Contrôles */}
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => {
            setCameraActive(!cameraActive);
            setError(null);
          }}
          className={`px-3 py-2 rounded text-sm font-medium ${
            cameraActive
              ? "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              : "bg-green-500 hover:bg-green-600 text-white cursor-pointer"
          }`}
        >
          {cameraActive ? (
            <>
              <VideoCamera size={16} weight="regular" className="inline mr-2" />
              Désactiver
            </>
          ) : (
            <>
              <Camera size={16} weight="regular" className="inline mr-2" />
              Activer
            </>
          )}
        </button>

        <button
          onClick={() => setHelpVisible(!helpVisible)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium cursor-pointer"
        >
          <Question size={16} weight="regular" className="inline mr-2" />
          Aide
        </button>

        <button
          onClick={onClose}
          className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 text-sm font-medium cursor-pointer"
        >
          <X size={16} weight="regular" className="inline mr-2" />
          Fermer
        </button>
      </div>

      {/* Aide contextuelle */}
      {helpVisible && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm max-w-md">
          <h4 className="font-medium text-blue-900 mb-2">
            <Book size={16} weight="regular" className="inline mr-2" />
            Conseils pour scanner un ISBN :
          </h4>
          <ul className="text-blue-800 space-y-1">
            <li>• Placez le code-barres dans la zone rectangulaire</li>
            <li>• Gardez l'appareil stable et net</li>
            <li>• Assurez-vous d'avoir un bon éclairage</li>
            <li>• Le code-barres ISBN se trouve généralement au dos du livre</li>
            {mode === 'batch' && (
              <li className="font-medium">• Scannez plusieurs livres puis validez le lot</li>
            )}
          </ul>
        </div>
      )}

      {/* Warning doublon */}
      {duplicateWarning && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg animate-pulse max-w-md" role="alert" aria-live="assertive">
          <div className="flex items-center gap-2">
            <WarningCircle size={20} weight="bold" className="text-red-500" />
            <p className="text-red-700 text-sm font-bold">Déjà scanné !</p>
          </div>
          <p className="text-red-600 text-xs mt-1">
            Ce livre est déjà dans votre pile temporaire
          </p>
        </div>
      )}

      {/* Vidéo scanner */}
      {cameraActive ? (
        <div className="relative w-full max-w-md mx-auto">
          <video
            ref={ref}
            className="rounded-lg shadow-lg w-full h-auto max-h-[50vh] object-cover"
            style={{ aspectRatio: '4/3' }}
            autoPlay
            playsInline
            muted
          />
          {/* Zone de ciblage overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Coins de la zone de scan */}
            <div className="absolute top-8 left-8 w-8 h-8 border-l-4 border-t-4 border-blue-500"></div>
            <div className="absolute top-8 right-8 w-8 h-8 border-r-4 border-t-4 border-blue-500"></div>
            <div className="absolute bottom-8 left-8 w-8 h-8 border-l-4 border-b-4 border-blue-500"></div>
            <div className="absolute bottom-8 right-8 w-8 h-8 border-r-4 border-b-4 border-blue-500"></div>

            {/* Zone de scan centrale */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-35 border-2 border-dashed border-blue-400 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-blue-600 font-semibold text-xs mb-1">
                  Zone de scan
                </div>
                <div className="text-blue-500 text-xs">Code-barres ici</div>
              </div>
            </div>

            {/* Ligne de scan animée */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-0.5 bg-red-500 animate-pulse"></div>

            {/* Indicateur de qualité */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs">
              <DeviceMobile size={16} className="inline mr-1" />
              {cameraInfo || "Résolution: HD"}
            </div>

            {/* Bouton Flash overlay - coin bas-droit */}
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className={`absolute bottom-4 right-4 pointer-events-auto w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
                  torchEnabled
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                    : "bg-gray-700/80 hover:bg-gray-600 text-white"
                }`}
                title={torchEnabled ? "Désactiver le flash" : "Activer le flash"}
                aria-label={torchEnabled ? "Désactiver le flash" : "Activer le flash"}
              >
                <Flashlight size={24} weight={torchEnabled ? "fill" : "regular"} />
              </button>
            )}

            {/* Feedback visuel universel - Amélioré */}
            {scanFeedback.type && (
              <div className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-xl shadow-2xl text-white font-bold text-base flex items-center gap-3 animate-fadeIn backdrop-blur-sm ${
                scanFeedback.type === 'success' ? 'bg-green-600/95 border-2 border-green-400' :
                scanFeedback.type === 'duplicate' ? 'bg-orange-600/95 border-2 border-orange-400' :
                'bg-red-600/95 border-2 border-red-400'
              }`} role="alert" aria-live="assertive">
                {scanFeedback.type === 'success' && <CheckCircle size={24} weight="fill" />}
                {scanFeedback.type === 'duplicate' && <WarningCircle size={24} weight="fill" />}
                {scanFeedback.type === 'error' && <X size={24} weight="bold" />}
                <span className="drop-shadow-lg">{scanFeedback.message}</span>
              </div>
            )}

            {/* Compteur temps réel en mode batch */}
            {mode === 'batch' && scannedBooks.length > 0 && (
              <div className="absolute top-16 left-4 bg-green-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg border-2 border-green-400 flex items-center gap-2 animate-fadeIn">
                <Stack size={20} weight="bold" />
                <span className="font-bold text-lg">{scannedBooks.length}</span>
                <span className="text-sm">livre{scannedBooks.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-[400px] h-[300px] bg-gray-200 flex items-center justify-center rounded-lg shadow-lg">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <Camera size={64} weight="regular" />
            </div>
            <p className="text-gray-600 font-medium">Caméra désactivée</p>
            <p className="text-gray-500 text-sm">
              Activez la caméra pour scanner
            </p>
          </div>
        </div>
      )}

      {/* Messages d'erreur */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-center gap-2">
            <Warning size={16} weight="regular" className="text-red-500" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
          <div className="mt-2 text-red-600 text-xs">
            Essayez d'améliorer l'éclairage ou utilisez le mode photo
          </div>
        </div>
      )}

      {/* Barre de contrôle du lot + Pile temporaire (mode batch uniquement) */}
      {mode === 'batch' && scannedBooks.length > 0 && (
        <div className="mt-6 w-full max-w-2xl space-y-4">
          {/* Barre de contrôle du lot - STICKY */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-2 border-green-300 rounded-lg shadow-lg p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-gray-700">
              <Stack size={20} weight="bold" />
              <span className="font-semibold">{scannedBooks.length} livre{scannedBooks.length > 1 ? 's' : ''} scanné{scannedBooks.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResetBatch}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-sm font-medium flex items-center gap-2"
              >
                <Trash size={16} weight="regular" />
                Réinitialiser
              </button>
              <button
                onClick={handleValidateBatch}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm font-medium flex items-center gap-2 shadow-md"
              >
                <CheckCircle size={16} weight="bold" />
                Valider le lot
              </button>
            </div>
          </div>

          {/* Grille d'aperçus */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            <div
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
              role="list"
              aria-label="Pile de livres scannés"
            >
              {scannedBooks.map((book) => (
                <ScannedBookMiniCard
                  key={book.isbn}
                  book={book}
                  onRemove={() => handleRemoveFromBatch(book.isbn)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
