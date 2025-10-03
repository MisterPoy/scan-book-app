// Types pour le système de notifications

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface NotificationHistory {
  id?: string;
  announcementId: string;
  userId: string;
  fcmToken: string;
  sentAt: string;
  deliveredAt?: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    language?: string;
  };
}

export interface NotificationStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  totalDelivered: number;
  totalUsers: number;
  failureRate: number;
  deliveryRate: number;
}

export interface NotificationError {
  code: string;
  message: string;
  retryable: boolean;
}

// Codes d'erreur standardisés
export const NOTIFICATION_ERROR_CODES = {
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type NotificationErrorCode = typeof NOTIFICATION_ERROR_CODES[keyof typeof NOTIFICATION_ERROR_CODES];
