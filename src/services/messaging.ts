import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { app } from '../firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// VAPID Key de Firebase Console
const VAPID_KEY = 'BKaUGPhun4u6WYA2df24FxSB7mexr7PCahJmsYPL-G3MNWMu_vNSlb2dn4Y5AR479s5QCCYWn_hSNCytvmFeKbQ';

let messaging: Messaging | null = null;

// Initialiser Firebase Messaging
export const initializeMessaging = () => {
  try {
    messaging = getMessaging(app);
    console.log('✅ Firebase Messaging initialisé');
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
    console.log('Permission notifications:', permission);
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
      console.log('Permission refusée pour les notifications');
      return null;
    }

    // Enregistrer le service worker Firebase avec un scope spécifique
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-sw-scope/'
      });
      console.log('✅ Service Worker Firebase enregistré:', registration);
    } catch (error) {
      console.log('⚠️ Service Worker Firebase échoué, utilisation du SW principal');
      registration = await navigator.serviceWorker.ready;
    }

    // Obtenir le token FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('✅ Token FCM obtenu:', token);
      // Sauvegarder le token en base pour cet utilisateur
      await saveTokenToFirestore(userId, token);
      return token;
    } else {
      console.log('Pas de token FCM disponible');
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
    console.log('✅ Token FCM sauvegardé en Firestore');
  } catch (error) {
    // Si le document n'existe pas, le créer
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmToken: token,
        notificationsEnabled: true,
        lastTokenUpdate: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Token FCM sauvegardé en Firestore (nouveau document)');
    } catch (createError) {
      console.error('❌ Erreur sauvegarde token:', createError);
      throw createError;
    }
  }
};

// Écouter les messages en premier plan
export const onForegroundMessage = (callback: (payload: any) => void) => {
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
    console.log('✅ Notifications désactivées');
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

    console.log('✅ Notification de test envoyée');
  } catch (error) {
    console.error('❌ Erreur envoi notification de test:', error);
    throw error;
  }
};