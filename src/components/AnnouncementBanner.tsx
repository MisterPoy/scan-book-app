import { useState } from 'react';
import { X, Info, Warning, CheckCircle, XCircle } from 'phosphor-react';
import type { Announcement } from '../types/announcement';

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}

const TYPE_STYLES = {
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-900',
    icon: <Info size={16} weight="bold" />,
    iconColor: 'text-blue-600'
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-900',
    icon: <Warning size={16} weight="bold" />,
    iconColor: 'text-yellow-600'
  },
  success: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-900',
    icon: <CheckCircle size={16} weight="bold" />,
    iconColor: 'text-green-600'
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-900',
    icon: <XCircle size={16} weight="bold" />,
    iconColor: 'text-red-600'
  }
};

export default function AnnouncementBanner({ announcement, onDismiss }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const style = TYPE_STYLES[announcement.type];

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(announcement.id), 300); // Délai pour l'animation
  };

  const ariaRole =
    announcement.type === "error" || announcement.type === "warning"
      ? "alert"
      : "status";

  return (
    <div
      className={`
      ${style.bg} border-b-2 px-4 py-3 transition-all duration-300
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
    `}
      role={ariaRole}
      aria-live={ariaRole === "alert" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        {/* Icône */}
        <div className={`${style.iconColor} mt-0.5`}>
          {style.icon}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${style.text} text-sm`}>
            {announcement.title}
          </div>
          <div className={`${style.text} text-sm opacity-90`}>
            {announcement.message}
          </div>
        </div>

        {/* Bouton fermer */}
        <button
          onClick={handleDismiss}
          className={`${style.iconColor} hover:opacity-70 transition-opacity p-1 cursor-pointer`}
          title="Fermer cette annonce"
          aria-label="Fermer l'annonce"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
