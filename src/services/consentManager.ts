import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { ConsentRecord, UserConsents, ConsentType } from '../types/consent';
import {
  CONSENT_STORAGE_KEY,
  CONSENT_BANNER_KEY,
  PRIVACY_POLICY_VERSION,
  DEFAULT_CONSENTS
} from '../types/consent';

const CONSENTS_COLLECTION = 'user_consents';

/**
 * Enregistre un consentement dans Firestore (registre RGPD)
 */
export const recordConsent = async (
  consentType: ConsentType,
  granted: boolean,
  source: 'banner' | 'settings' | 'initial' = 'settings'
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const consentRecord: ConsentRecord = {
      userId: user.uid,
      consentType,
      granted,
      timestamp: new Date().toISOString(),
      version: PRIVACY_POLICY_VERSION,
      userAgent: navigator.userAgent,
      source,
    };

    await addDoc(collection(db, CONSENTS_COLLECTION), consentRecord);
  } catch (error) {
    console.error('Erreur enregistrement consentement:', error);
  }
};

/**
 * Récupère l'historique des consentements d'un utilisateur
 */
export const getUserConsentHistory = async (): Promise<ConsentRecord[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, CONSENTS_COLLECTION),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ConsentRecord[];
  } catch (error) {
    console.error('Erreur récupération historique consentements:', error);
    return [];
  }
};

/**
 * Récupère le dernier consentement pour un type donné
 */
export const getLatestConsent = async (consentType: ConsentType): Promise<ConsentRecord | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const q = query(
      collection(db, CONSENTS_COLLECTION),
      where('userId', '==', user.uid),
      where('consentType', '==', consentType),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as ConsentRecord;
  } catch (error) {
    console.error('Erreur récupération dernier consentement:', error);
    return null;
  }
};

/**
 * Sauvegarde les consentements dans localStorage
 */
export const saveConsentsToLocalStorage = (consents: UserConsents): void => {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consents));
  } catch (error) {
    console.error('Erreur sauvegarde consentements localStorage:', error);
  }
};

/**
 * Charge les consentements depuis localStorage
 */
export const loadConsentsFromLocalStorage = (): UserConsents => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return DEFAULT_CONSENTS;

    return {
      ...DEFAULT_CONSENTS,
      ...JSON.parse(stored)
    };
  } catch (error) {
    console.error('Erreur chargement consentements localStorage:', error);
    return DEFAULT_CONSENTS;
  }
};

/**
 * Met à jour tous les consentements et enregistre dans Firestore
 */
export const updateAllConsents = async (
  consents: UserConsents,
  source: 'banner' | 'settings' | 'initial' = 'settings'
): Promise<void> => {
  // Sauvegarder dans localStorage
  saveConsentsToLocalStorage(consents);

  // Enregistrer chaque consentement dans Firestore
  const consentTypes: ConsentType[] = ['analytics', 'notifications', 'storage', 'functional'];

  for (const type of consentTypes) {
    await recordConsent(type, consents[type], source);
  }
};

/**
 * Accepter tous les consentements
 */
export const acceptAllConsents = async (): Promise<void> => {
  const allAccepted: UserConsents = {
    analytics: true,
    notifications: true,
    storage: true,
    functional: true,
  };

  await updateAllConsents(allAccepted, 'banner');

  // Marquer le banner comme accepté
  localStorage.setItem(CONSENT_BANNER_KEY, JSON.stringify({
    shown: true,
    dismissed: false,
    acceptedAll: true,
    customized: false
  }));
};

/**
 * Refuser tous les consentements non-essentiels
 */
export const rejectAllConsents = async (): Promise<void> => {
  await updateAllConsents(DEFAULT_CONSENTS, 'banner');

  // Marquer le banner comme rejeté
  localStorage.setItem(CONSENT_BANNER_KEY, JSON.stringify({
    shown: true,
    dismissed: true,
    acceptedAll: false,
    customized: false
  }));
};

/**
 * Vérifier si le banner de consentement doit être affiché
 */
export const shouldShowConsentBanner = (): boolean => {
  try {
    const bannerState = localStorage.getItem(CONSENT_BANNER_KEY);
    if (!bannerState) return true;

    const state = JSON.parse(bannerState);
    return !state.shown && !state.dismissed && !state.acceptedAll;
  } catch (error) {
    return true; // Afficher par défaut en cas d'erreur
  }
};

/**
 * Vérifier si un consentement spécifique est accordé
 */
export const hasConsent = (consentType: ConsentType): boolean => {
  const consents = loadConsentsFromLocalStorage();
  return consents[consentType];
};
