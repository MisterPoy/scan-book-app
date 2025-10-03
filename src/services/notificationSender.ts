import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Announcement } from '../types/announcement';
import {
  hasNotificationBeenSent,
  recordNotificationSent,
  getNotificationStats
} from './notificationHistory';

// Structure pour les données utilisateur avec token FCM
interface UserWithToken {
  id: string;
  fcmToken: string;
  notificationsEnabled: boolean;
}

// Récupérer tous les utilisateurs avec notifications activées
export const getUsersWithNotificationsEnabled = async (): Promise<UserWithToken[]> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('notificationsEnabled', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const users: UserWithToken[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) {
        users.push({
          id: doc.id,
          fcmToken: data.fcmToken,
          notificationsEnabled: data.notificationsEnabled
        });
      }
    });

    return users;
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs avec notifications:', error);
    return [];
  }
};

// Créer le payload de notification
const createNotificationPayload = (announcement: Announcement) => {
  const title = 'Nouvelle annonce - Kodeks';
  const body = announcement.title;

  return {
    notification: {
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `announcement-${announcement.id}`,
      requireInteraction: announcement.priority === 'high',
      data: {
        announcementId: announcement.id,
        type: 'announcement',
        priority: announcement.priority,
        url: '/'
      }
    },
    data: {
      announcementId: announcement.id,
      type: 'announcement',
      priority: announcement.priority,
      url: '/'
    }
  };
};

// Fonction pour envoyer une notification via Firebase Cloud Messaging
// Note: Cette fonction nécessite un backend pour envoyer via l'API FCM
// Pour l'instant, on simule l'envoi et on logs les tokens
export const sendNotificationToUsers = async (
  announcement: Announcement,
  userTokens: string[]
): Promise<void> => {
  if (userTokens.length === 0) {
    return;
  }

  createNotificationPayload(announcement);

  // TODO: Ici on devrait faire appel à l'API Firebase Cloud Messaging
  // via un backend sécurisé. Pour l'instant, on simule l'envoi.

  // Simulation de l'envoi réussi
  await new Promise(resolve => setTimeout(resolve, 1000));
};

// Fonction principale pour déclencher les notifications lors de la création d'annonce
export const triggerNotificationForAnnouncement = async (announcement: Announcement): Promise<void> => {
  try {
    // 1. Récupérer les utilisateurs avec notifications activées
    const users = await getUsersWithNotificationsEnabled();

    if (users.length === 0) {
      return;
    }

    // 2. Filtrer les utilisateurs qui n'ont pas encore reçu cette notification
    const eligibleUsers = [];
    for (const user of users) {
      const alreadySent = await hasNotificationBeenSent(announcement.id, user.id);
      if (!alreadySent) {
        eligibleUsers.push(user);
      }
    }

    if (eligibleUsers.length === 0) {
      return;
    }

    // 3. Envoyer les notifications et enregistrer l'historique
    for (const user of eligibleUsers) {
      try {
        await sendNotificationToUsers(announcement, [user.fcmToken]);
        await recordNotificationSent(announcement.id, user.id, user.fcmToken, announcement.priority);
      } catch (error) {
        console.error(`❌ Erreur envoi notification à l'utilisateur ${user.id}:`, error);
        await recordNotificationSent(
          announcement.id,
          user.id,
          user.fcmToken,
          announcement.priority,
          'failed',
          error instanceof Error ? error.message : 'Erreur inconnue'
        );
      }
    }

    // 4. Récupérer les statistiques finales
    await getNotificationStats(announcement.id);

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications:', error);
    throw error;
  }
};

// Fonction pour tester l'envoi de notification (pour le développement)
export const sendTestNotificationToUser = async (userToken: string): Promise<void> => {
  const testAnnouncement: Announcement = {
    id: 'test-' + Date.now(),
    title: 'Test de notification push',
    message: 'Ceci est un test de notification depuis Kodeks',
    priority: 'medium',
    type: 'info',
    displayMode: 'banner',
    targetAudience: 'all',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await sendNotificationToUsers(testAnnouncement, [userToken]);
};