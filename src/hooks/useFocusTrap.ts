import { useEffect, useRef } from 'react';

/**
 * Hook pour implémenter un focus trap dans les modales
 * Conforme WCAG 2.1 (Guideline 2.1.2 - No Keyboard Trap)
 *
 * @param isActive - Indique si le focus trap doit être actif
 * @returns ref - Référence à attacher au conteneur de la modale
 */
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive || !ref.current) return;

    const container = ref.current;

    // Éléments focusables
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
    };

    // Focus sur le premier élément focusable au montage
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Chercher un bouton de fermeture d'abord, sinon premier élément
      const closeButton = container.querySelector<HTMLElement>('[aria-label*="Fermer"], [aria-label*="fermer"]');
      const firstElement = closeButton || focusableElements[0];
      firstElement?.focus();
    }

    // Gérer la navigation au clavier
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      // Shift + Tab sur le premier élément -> aller au dernier
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
      // Tab sur le dernier élément -> aller au premier
      else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    };

    // Gérer Escape pour fermer
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Déclencher un événement custom que la modale peut écouter
        const closeEvent = new CustomEvent('modal-close-request');
        container.dispatchEvent(closeEvent);
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('keydown', handleEscape);

    // Sauvegarder l'élément qui avait le focus avant la modale
    const previouslyFocusedElement = document.activeElement as HTMLElement;

    // Cleanup: restaurer le focus
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('keydown', handleEscape);
      previouslyFocusedElement?.focus();
    };
  }, [isActive]);

  return ref;
}
