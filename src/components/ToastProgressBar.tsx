import { useEffect, useState } from 'react';

interface ToastProgressBarProps {
  duration: number;
  isVisible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
}

export default function ToastProgressBar({ duration, isVisible, type }: ToastProgressBarProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      return;
    }

    const intervalDuration = 50; // Update every 50ms for smooth animation
    const decrementAmount = (100 / duration) * intervalDuration;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - decrementAmount;
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [duration, isVisible]);

  const colorMap = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-orange-600',
    info: 'bg-blue-600',
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Temps restant avant fermeture automatique"
    >
      <div
        className={`h-full ${colorMap[type]} transition-all duration-50 ease-linear`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
