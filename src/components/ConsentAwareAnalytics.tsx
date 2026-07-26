import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { hasConsent } from '../services/consentManager';

export default function ConsentAwareAnalytics() {
  const [enabled, setEnabled] = useState(() => hasConsent('analytics'));

  useEffect(() => {
    const refreshConsent = () => setEnabled(hasConsent('analytics'));
    window.addEventListener('kodeks-consent-changed', refreshConsent);
    return () => window.removeEventListener('kodeks-consent-changed', refreshConsent);
  }, []);

  return enabled ? <Analytics /> : null;
}
