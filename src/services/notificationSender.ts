import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { Announcement } from '../types/announcement';

interface NotificationDeliverySummary {
  total: number;
  sent: number;
  failed: number;
}

export const triggerNotificationForAnnouncement = async (
  announcement: Announcement,
): Promise<NotificationDeliverySummary> => {
  const sendNotification = httpsCallable<
    { announcementId: string },
    NotificationDeliverySummary
  >(functions, 'sendAnnouncementNotification');
  const result = await sendNotification({ announcementId: announcement.id });
  return result.data;
};

export const sendTestNotificationToUser = async (): Promise<void> => {
  const sendTestNotification = httpsCallable(functions, 'sendTestNotification');
  await sendTestNotification();
};

export const retryFailedNotifications = async (
  announcementId: string,
): Promise<NotificationDeliverySummary> => {
  const retryNotifications = httpsCallable<
    { announcementId: string },
    NotificationDeliverySummary
  >(functions, 'retryFailedNotifications');
  const result = await retryNotifications({ announcementId });
  return result.data;
};
