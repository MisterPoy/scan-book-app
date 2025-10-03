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

// Interface pour l'historique des notifications
interface NotificationHistory {
  id?: string;
  announcementId: string;
  userId: string;
  fcmToken: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'delivered';
  priority: 'low' | 'medium' | 'high';
  retryCount?: number;
  error?: string;
}

const NOTIFICATION_HISTORY_COLLECTION = 'notification_history';

// Vérifier si une notification a déjà été envoyée à un utilisateur pour une annonce
export const hasNotificationBeenSent = async (
  announcementId: string,
  userId: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('announcementId', '==', announcementId),
      where('userId', '==', userId),
      where('status', '==', 'sent')
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Erreur vérification historique notification:', error);
    // En cas d'erreur, on autorise l'envoi pour ne pas bloquer
    return false;
  }
};

// Enregistrer l'envoi d'une notification
export const recordNotificationSent = async (
  announcementId: string,
  userId: string,
  fcmToken: string,
  priority: 'low' | 'medium' | 'high',
  status: 'sent' | 'failed' = 'sent',
  error?: string
): Promise<void> => {
  try {
    const notificationRecord: NotificationHistory = {
      announcementId,
      userId,
      fcmToken,
      sentAt: new Date().toISOString(),
      status,
      priority,
      retryCount: 0,
      ...(error && { error })
    };

    await addDoc(collection(db, NOTIFICATION_HISTORY_COLLECTION), notificationRecord);
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

// Obtenir des statistiques sur les notifications
export const getNotificationStats = async (announcementId: string): Promise<{
  totalSent: number;
  totalFailed: number;
  totalUsers: number;
}> => {
  try {
    const q = query(
      collection(db, NOTIFICATION_HISTORY_COLLECTION),
      where('announcementId', '==', announcementId)
    );

    const querySnapshot = await getDocs(q);
    let totalSent = 0;
    let totalFailed = 0;
    const uniqueUsers = new Set<string>();

    querySnapshot.forEach((doc) => {
      const data = doc.data() as NotificationHistory;
      uniqueUsers.add(data.userId);

      if (data.status === 'sent') {
        totalSent++;
      } else if (data.status === 'failed') {
        totalFailed++;
      }
    });

    return {
      totalSent,
      totalFailed,
      totalUsers: uniqueUsers.size
    };
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    return { totalSent: 0, totalFailed: 0, totalUsers: 0 };
  }
};