/**
 * Types pour la gestion des utilisateurs (Admin)
 */

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: string; // ISO timestamp
  lastLoginAt: string; // ISO timestamp
  totalBooks?: number;
  totalLibraries?: number;
  lastActivity?: string | null;
  providerData: {
    providerId: string; // 'google.com', 'password', etc.
    email: string | null;
  }[];
  disabled: boolean;
  isAdmin?: boolean;
}

export interface UserStats {
  totalBooks: number;
  totalLibraries: number;
  lastActivity?: string; // ISO timestamp
}

export interface UserWithStats extends UserData {
  stats: UserStats;
}

export interface UsersOverview {
  totalUsers: number;
  activeUsers: number; // Connectés dans les 30 derniers jours
  googleUsers: number;
  emailUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
