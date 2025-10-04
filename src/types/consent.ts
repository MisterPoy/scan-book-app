/**
 * Types pour le système de gestion des consentements RGPD
 * Conforme au Règlement Général sur la Protection des Données (EU) 2016/679
 */

export type ConsentType = 'analytics' | 'notifications' | 'storage' | 'functional';

export interface ConsentRecord {
  id?: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  timestamp: string; // ISO 8601
  version: string; // Version de la politique de confidentialité
  ipAddress?: string; // Optionnel pour traçabilité
  userAgent?: string; // Optionnel pour traçabilité
  source: 'banner' | 'settings' | 'initial'; // Origine du consentement
}

export interface UserConsents {
  analytics: boolean; // Google Analytics, statistiques d'usage
  notifications: boolean; // Notifications push Firebase
  storage: boolean; // Stockage données locales (localStorage, indexedDB)
  functional: boolean; // Fonctionnalités essentielles (toujours true)
}

export interface ConsentBannerState {
  shown: boolean;
  dismissed: boolean;
  acceptedAll: boolean;
  customized: boolean;
}

export const CONSENT_STORAGE_KEY = 'kodeks_user_consents';
export const CONSENT_BANNER_KEY = 'kodeks_consent_banner_state';
export const PRIVACY_POLICY_VERSION = '1.0.0'; // À incrémenter à chaque mise à jour

/**
 * Consentements par défaut (tout désactivé sauf fonctionnel)
 */
export const DEFAULT_CONSENTS: UserConsents = {
  analytics: false,
  notifications: false,
  storage: false,
  functional: true, // Obligatoire pour le fonctionnement de l'app
};
