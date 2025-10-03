import { useState, useEffect, useCallback } from 'react';
import {
  getMessagingToken,
  disableNotifications,
  getNotificationStatus,
  onForegroundMessage
} from '../services/messaging';

interface NotificationState {
  supported: boolean;
  permission: NotificationPermission;
  enabled: boolean;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export const useNotifications = (userId: string | null) => {
  const [state, setState] = useState<NotificationState>({
    supported: false,
    permission: 'default',
    enabled: false,
    token: null,
    loading: false,
    error: null
  });

  // Initialiser le statut des notifications
  useEffect(() => {
    const status = getNotificationStatus();
    setState(prev => ({
      ...prev,
      supported: status.supported,
      permission: status.permission,
      enabled: status.permission === 'granted'
    }));
  }, []);

  // Écouter les messages en premier plan
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Message reçu en premier plan:', payload);

      // Afficher une notification locale si l'app est au premier plan
      if (Notification.permission === 'granted') {
        const notifPayload = payload as { notification?: { title?: string; body?: string } };
        new Notification(notifPayload.notification?.title || 'Nouvelle notification', {
          body: notifPayload.notification?.body,
          icon: '/icons/icon-192x192.png',
          tag: 'kodeks-foreground'
        });
      }
    });

    return unsubscribe;
  }, [userId]);

  // Activer les notifications
  const enableNotifications = useCallback(async () => {
    if (!userId) {
      setState(prev => ({ ...prev, error: 'Utilisateur non connecté' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const token = await getMessagingToken(userId);

      if (token) {
        setState(prev => ({
          ...prev,
          enabled: true,
          token,
          permission: 'granted',
          loading: false
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          enabled: false,
          loading: false,
          error: 'Impossible d\'obtenir le token de notification'
        }));
        return false;
      }
    } catch (error) {
      console.error('Erreur activation notifications:', error);
      setState(prev => ({
        ...prev,
        enabled: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
      return false;
    }
  }, [userId]);

  // Désactiver les notifications
  const disableNotificationsHandler = useCallback(async () => {
    if (!userId) return false;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await disableNotifications(userId);
      setState(prev => ({
        ...prev,
        enabled: false,
        token: null,
        loading: false
      }));
      return true;
    } catch (error) {
      console.error('Erreur désactivation notifications:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
      return false;
    }
  }, [userId]);

  // Tester une notification
  const testNotification = useCallback(() => {
    if (Notification.permission === 'granted') {
      new Notification('Test - Kodeks', {
        body: 'Les notifications fonctionnent correctement !',
        icon: '/icons/icon-192x192.png',
        tag: 'kodeks-test'
      });
      return true;
    }
    return false;
  }, []);

  return {
    ...state,
    enableNotifications,
    disableNotifications: disableNotificationsHandler,
    testNotification
  };
};