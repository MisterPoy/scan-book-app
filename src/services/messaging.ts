import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { app } from '../firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// VAPID Key depuis les variables d'environnement
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let messaging: Messaging | null = null;

// Initialiser Firebase Messaging
export const initializeMessaging = () => {
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Messaging:', error);
    return null;
  }
};

// Vérifier si les notifications sont supportées
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Demander la permission pour les notifications
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Les notifications ne sont pas supportées sur ce navigateur');
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Erreur demande permission:', error);
    throw error;
  }
};

// Obtenir le token FCM pour cet appareil
export const getMessagingToken = async (userId: string): Promise<string | null> => {
  if (!messaging) {
    messaging = initializeMessaging();
  }

  if (!messaging) {
    throw new Error('Firebase Messaging non initialisé');
  }

  try {
    // Vérifier les permissions
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Utiliser le service worker PWA principal (qui gère aussi FCM)
    const registration = await navigator.serviceWorker.ready;

    // Obtenir le token FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      // Sauvegarder le token en base pour cet utilisateur
      await saveTokenToFirestore(userId, token);
      return token;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur obtention token FCM:', error);
    throw error;
  }
};

// Sauvegarder le token FCM en Firestore
const saveTokenToFirestore = async (userId: string, token: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      notificationsEnabled: true,
      lastTokenUpdate: new Date().toISOString()
    });
  } catch {
    // Si le document n'existe pas, le créer
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmToken: token,
        notificationsEnabled: true,
        lastTokenUpdate: new Date().toISOString()
      }, { merge: true });
    } catch (createError) {
      console.error('❌ Erreur sauvegarde token:', createError);
      throw createError;
    }
  }
};

// Écouter les messages en premier plan
export const onForegroundMessage = (callback: (payload: unknown) => void) => {
  if (!messaging) {
    messaging = initializeMessaging();
  }

  if (messaging) {
    return onMessage(messaging, callback);
  }
};

// Désactiver les notifications pour un utilisateur
export const disableNotifications = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationsEnabled: false,
      fcmToken: null,
      lastTokenUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur désactivation notifications:', error);
    throw error;
  }
};

// Vérifier le statut des notifications
export const getNotificationStatus = (): {
  supported: boolean;
  permission: NotificationPermission;
} => {
  return {
    supported: isNotificationSupported(),
    permission: isNotificationSupported() ? Notification.permission : 'denied'
  };
};

// Envoyer une notification push de test via le service worker
export const sendTestPushNotification = async (userId: string): Promise<void> => {
  try {
    // Récupérer le token de l'utilisateur depuis Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || !userDoc.data().fcmToken) {
      throw new Error('Token FCM non trouvé pour cet utilisateur');
    }

    const token = userDoc.data().fcmToken;

    // Utiliser notre service de notification pour envoyer un test
    const { sendTestNotificationToUser } = await import('./notificationSender');
    await sendTestNotificationToUser(token);
  } catch (error) {
    console.error('❌ Erreur envoi notification de test:', error);
    throw error;
  }
};