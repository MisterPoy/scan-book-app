import { useState } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function ISBNScanner({ onDetected, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClose}
        className="mb-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        ✕ Fermer le scanner
      </button>
      <BarcodeScannerComponent
        width={300}
        height={300}
        onUpdate={(err, result) => {
          if (err) {
            setError('Erreur caméra');
          } else if (result) {
            const code = result.getText();
            onDetected(code);
          }
        }}
      />
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
