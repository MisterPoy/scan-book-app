import { useEffect } from 'react';
import { CheckCircle, XCircle, Warning, X } from 'phosphor-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, isVisible, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle size={24} weight="bold" className="text-green-600" />
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircle size={24} weight="bold" className="text-red-600" />
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: <Warning size={24} weight="bold" className="text-orange-600" />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <CheckCircle size={24} weight="bold" className="text-blue-600" />
    }
  };

  const style = styles[type];

  const ariaLive = type === "error" ? "assertive" : "polite";

  return (
    <div
      className="fixed top-4 right-4 z-[60] animate-slideIn"
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
    >
      <div className={`${style.bg} ${style.border} border-2 rounded-lg shadow-lg p-4 min-w-[320px] max-w-md flex items-start gap-3`}>
        <div className="flex-shrink-0 mt-0.5">
          {style.icon}
        </div>
        <div className={`flex-1 ${style.text} font-medium text-sm`}>
          {message}
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors cursor-pointer ${style.text}`}
          aria-label="Fermer"
        >
          <X size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
