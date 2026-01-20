import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { UserData, UserStats, UserWithStats, UsersOverview } from "../types/user";

/**
 * Hook personnalisé pour récupérer et gérer les données utilisateurs (Admin uniquement)
 *
 * IMPORTANT: Ce hook ne récupère PAS directement depuis Firebase Auth (nécessite Admin SDK backend)
 * On utilise la collection Firestore 'user_profiles' pour stocker les métadonnées
 * et les statistiques utilisateurs (totalBooks, totalLibraries, lastActivity).
 *
 * Pour une implémentation complète avec Firebase Auth Admin SDK, il faudrait :
 * - Une Cloud Function qui sync Auth → Firestore
 * - Ou un endpoint backend sécurisé
 */
export function useUsers() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [overview, setOverview] = useState<UsersOverview>({
    totalUsers: 0,
    activeUsers: 0,
    googleUsers: 0,
    emailUsers: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer tous les profils utilisateurs depuis Firestore
      // Note: En production, il faudrait paginer cette requête
      const usersSnapshot = await getDocs(collection(db, "user_profiles"));

      const usersData: UserWithStats[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as UserData;

        const stats: UserStats = {
          totalBooks: userData.totalBooks ?? 0,
          totalLibraries: userData.totalLibraries ?? 0,
          lastActivity: userData.lastActivity ?? undefined,
        };

        usersData.push({
          ...userData,
          stats,
        });
      }

      setUsers(usersData);
      calculateOverview(usersData);
    } catch (err) {
      console.error("Erreur lors de la récupération des utilisateurs:", err);
      setError("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calcule les statistiques globales
   */
  const calculateOverview = (usersData: UserWithStats[]) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats: UsersOverview = {
      totalUsers: usersData.length,
      activeUsers: 0,
      googleUsers: 0,
      emailUsers: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
    };

    usersData.forEach((user) => {
      // Compter par méthode d'authentification
      const hasGoogle = user.providerData.some((p) => p.providerId === "google.com");
      const hasPassword = user.providerData.some((p) => p.providerId === "password");

      if (hasGoogle) stats.googleUsers++;
      if (hasPassword) stats.emailUsers++;

      // Compter les nouveaux utilisateurs
      const createdDate = new Date(user.createdAt);
      if (createdDate >= oneWeekAgo) stats.newUsersThisWeek++;
      if (createdDate >= oneMonthAgo) stats.newUsersThisMonth++;

      // Compter les utilisateurs actifs (connectés dans les 30 derniers jours)
      const lastLogin = new Date(user.lastLoginAt);
      if (lastLogin >= thirtyDaysAgo) stats.activeUsers++;
    });

    setOverview(stats);
  };

  /**
   * Rafraîchir les données
   */
  const refresh = () => {
    fetchUsers();
  };

  /**
   * Rechercher des utilisateurs par email
   */
  const searchByEmail = (searchQuery: string): UserWithStats[] => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user) =>
      user.email?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query)
    );
  };

  /**
   * Filtrer par méthode d'authentification
   */
  const filterByProvider = (providerId: "google" | "email" | "all"): UserWithStats[] => {
    if (providerId === "all") return users;

    const providerMap = {
      google: "google.com",
      email: "password",
    };

    return users.filter((user) =>
      user.providerData.some((p) => p.providerId === providerMap[providerId])
    );
  };

  /**
   * Filtrer par activité
   */
  const filterByActivity = (filter: "active" | "inactive" | "all"): UserWithStats[] => {
    if (filter === "all") return users;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return users.filter((user) => {
      const lastLogin = new Date(user.lastLoginAt);
      const isActive = lastLogin >= thirtyDaysAgo;

      return filter === "active" ? isActive : !isActive;
    });
  };

  return {
    users,
    overview,
    loading,
    error,
    refresh,
    searchByEmail,
    filterByProvider,
    filterByActivity,
  };
}
