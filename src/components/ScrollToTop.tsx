import { useState, useEffect } from 'react';
import { ArrowUp } from 'phosphor-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Afficher le bouton quand on scroll de plus de 300px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center group"
      aria-label="Retour en haut"
      title="Retour en haut de la page"
    >
      <ArrowUp size={24} weight="bold" />
      <span className="absolute right-full mr-3 px-3 py-1 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Retour en haut
      </span>
    </button>
  );
}
