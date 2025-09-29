export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  displayMode: 'banner' | 'modal' | 'both';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  targetAudience?: 'all' | 'admins' | 'specific';
  targetUserIds?: string[];
}

export interface CreateAnnouncementData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  displayMode: 'banner' | 'modal' | 'both';
  priority: 'low' | 'medium' | 'high';
  expiresAt?: string;
  targetAudience?: 'all' | 'admins' | 'specific';
  targetUserIds?: string[];
}