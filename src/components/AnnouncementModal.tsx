import { X, Info, Warning, CheckCircle, XCircle } from 'phosphor-react';
import type { Announcement } from '../types/announcement';

interface AnnouncementModalProps {
  announcement: Announcement | null;
  onClose: () => void;
}

const TYPE_STYLES = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    title: 'text-blue-800',
    icon: <Info size={24} weight="bold" />,
    iconColor: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    title: 'text-yellow-800',
    icon: <Warning size={24} weight="bold" />,
    iconColor: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    title: 'text-green-800',
    icon: <CheckCircle size={24} weight="bold" />,
    iconColor: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    title: 'text-red-800',
    icon: <XCircle size={24} weight="bold" />,
    iconColor: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700'
  }
};

export default function AnnouncementModal({ announcement, onClose }: AnnouncementModalProps) {
  if (!announcement) return null;

  const style = TYPE_STYLES[announcement.type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`
        relative bg-white rounded-lg shadow-xl max-w-md w-full
        border-2 ${style.border} ${style.bg}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-3">
            <div className={`${style.iconColor} mt-0.5`}>
              {style.icon}
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${style.title}`}>
                {announcement.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-4 cursor-pointer"
            title="Fermer"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Contenu */}
        <div className="px-6 pb-6">
          <div className={`${style.text} text-base leading-relaxed`}>
            {announcement.message}
          </div>

          {/* Date de création */}
          <div className="mt-4 text-xs text-gray-500">
            Publié le {new Date(announcement.createdAt).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          {/* Bouton fermer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className={`
                px-4 py-2 text-white rounded-md transition-colors font-medium cursor-pointer
                ${style.button}
              `}
            >
              Compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}