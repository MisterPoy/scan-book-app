import { useState } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

interface Props {
  onDetected: (code: string) => void;
}

export default function ISBNScanner({ onDetected }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center">
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
