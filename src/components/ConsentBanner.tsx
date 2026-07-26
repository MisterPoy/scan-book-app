import { useEffect, useState } from 'react';
import {
  acceptAllConsents,
  rejectAllConsents,
  shouldShowConsentBanner,
} from '../services/consentManager';

export default function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(shouldShowConsentBanner);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const openSettings = () => setIsVisible(true);
    window.addEventListener('kodeks-open-consent-settings', openSettings);
    return () => window.removeEventListener('kodeks-open-consent-settings', openSettings);
  }, []);

  if (!isVisible) return null;

  const saveChoice = async (acceptAnalytics: boolean) => {
    setIsSaving(true);
    try {
      if (acceptAnalytics) await acceptAllConsents();
      else await rejectAllConsents();
      setIsVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-2xl"
    >
      <h2 id="consent-title" className="font-bold text-gray-900">
        Vos choix de confidentialité
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Kodeks utilise le stockage nécessaire à son fonctionnement. Les mesures
        d’audience Vercel ne sont chargées qu’avec votre accord. Consultez la{' '}
        <a href="/confidentialite" className="font-medium text-blue-700 underline">
          politique de confidentialité
        </a>.
      </p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => saveChoice(false)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          Refuser les statistiques
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => saveChoice(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Accepter
        </button>
      </div>
    </aside>
  );
}
