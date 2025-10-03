import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  NotificationHistory,
  NotificationStatus,
  NotificationPriority,
  NotificationStats
} from '../types/notification';

const NOTIFICATION_HISTORY_COLLECTION = 'notification_history';

// Cache en mémoire pour la session admin (éviter requêtes répétées)
const notificationCache = new Map<string, boolean>();

// Clé de cache
const getCacheKey = (announcementId: string, userId: string): string => {
  return `${announcementId}:${userId}`;
};

// Vérifier si une notification a déjà été envoyée à un utilisateur pour une annonce
// Utilise un cache local + index composite Firestore pour performance optimale
export const hasNotificationBeenSent = async (
  announcementId: string,
  userId: string
): Promise<boolean> => {
  // Vérifier le cache d'abord
  const cacheKey = getCacheKey(announcementId, userId);
  const cached = notificationCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    // Requête optimisée avec index composite + limit(1) pour idempotence stricte
    const q = query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('announcementId', '==', announcementId),
      where('userId', '==', userId),
      where('status', '==', 'sent'),
      limit(1) // Arrêter dès le premier résultat trouvé
    );

    const querySnapshot = await getDocs(q);
    const hasSent = !querySnapshot.empty;

    // Mettre en cache le résultat
    notificationCache.set(cacheKey, hasSent);

    return hasSent;
  } catch (error) {
    console.error('Erreur vérification historique notification:', error);
    // En cas d'erreur, on autorise l'envoi pour ne pas bloquer
    return false;
  }
};

// Vider le cache (à appeler après envoi de notifications)
export const clearNotificationCache = (): void => {
  notificationCache.clear();
};

// Enregistrer l'envoi d'une notification avec logs structurés
export const recordNotificationSent = async (
  announcementId: string,
  userId: string,
  fcmToken: string,
  priority: NotificationPriority,
  status: NotificationStatus = 'sent',
  errorCode?: string,
  errorMessage?: string,
  retryCount: number = 0
): Promise<void> => {
  try {
    // Collecter les informations du device
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    };

    const notificationRecord: NotificationHistory = {
      announcementId,
      userId,
      fcmToken,
      sentAt: new Date().toISOString(),
      status,
      priority,
      retryCount,
      deviceInfo,
      ...(errorCode && { errorCode }),
      ...(errorMessage && { errorMessage }),
    };

    await addDoc(collection(db, NOTIFICATION_HISTORY_COLLECTION), notificationRecord);

    // Invalider le cache pour cette combinaison annonce/utilisateur
    const cacheKey = getCacheKey(announcementId, userId);
    notificationCache.set(cacheKey, status === 'sent');
  } catch (error) {
    console.error('Erreur enregistrement historique notification:', error);
    // Ne pas faire échouer l'envoi si l'enregistrement échoue
  }
};

// Obtenir l'historique des notifications pour un utilisateur
export const getUserNotificationHistory = async (
  userId: string,
  limitCount: number = 50
): Promise<NotificationHistory[]> => {
  try {
    const q = query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('userId', '==', userId),
      orderBy('sentAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const history: NotificationHistory[] = [];

    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      } as NotificationHistory);
    });

    return history;
  } catch (error) {
    console.error('Erreur récupération historique utilisateur:', error);
    return [];
  }
};

// Obtenir l'historique des notifications pour une annonce
export const getAnnouncementNotificationHistory = async (
  announcementId: string
): Promise<NotificationHistory[]> => {
  try {
    const q = query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('announcementId', '==', announcementId),
      orderBy('sentAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const history: NotificationHistory[] = [];

    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      } as NotificationHistory);
    });

    return history;
  } catch (error) {
    console.error('Erreur récupération historique annonce:', error);
    return [];
  }
};

// Nettoyer l'ancien historique (garder seulement les 30 derniers jours)
export const cleanupOldNotificationHistory = async (): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('sentAt', '<', cutoffDate),
      limit(100) // Traiter par batch pour éviter les timeout
    );

    // Note: Firebase ne permet pas les suppressions en batch facilement
    // Dans un vrai projet, on utiliserait Cloud Functions pour cela
  } catch (error) {
    console.error('Erreur nettoyage historique:', error);
  }
};

// Obtenir des statistiques détaillées sur les notifications
export const getNotificationStats = async (announcementId: string): Promise<NotificationStats> => {
  try {
    const q = query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('announcementId', '==', announcementId)
    );

    const querySnapshot = await getDocs(q);
    let totalSent = 0;
    let totalFailed = 0;
    let totalPending = 0;
    let totalDelivered = 0;
    const uniqueUsers = new Set<string>();

    querySnapshot.forEach((doc) => {
      const data = doc.data() as NotificationHistory;
      uniqueUsers.add(data.userId);

      switch (data.status) {
        case 'sent':
          totalSent++;
          break;
        case 'failed':
          totalFailed++;
          break;
        case 'pending':
          totalPending++;
          break;
        case 'delivered':
          totalDelivered++;
          break;
      }
    });

    const totalAttempts = totalSent + totalFailed + totalPending + totalDelivered;
    const failureRate = totalAttempts > 0 ? (totalFailed / totalAttempts) * 100 : 0;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    return {
      totalSent,
      totalFailed,
      totalPending,
      totalDelivered,
      totalUsers: uniqueUsers.size,
      failureRate: Math.round(failureRate * 100) / 100,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
    };
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    return {
      totalSent: 0,
      totalFailed: 0,
      totalPending: 0,
      totalDelivered: 0,
      totalUsers: 0,
      failureRate: 0,
      deliveryRate: 0,
    };
  }
};