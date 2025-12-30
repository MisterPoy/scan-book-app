import { useState, useEffect } from "react";
import { useUsers } from "../hooks/useUsers";
import type { UserWithStats } from "../types/user";
import {
  MagnifyingGlass,
  UsersThree,
  CheckCircle,
  GoogleLogo,
  EnvelopeSimple,
  ArrowsClockwise,
  X,
  Info
} from "phosphor-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useFocusTrap } from "../hooks/useFocusTrap";

/**
 * Composant de gestion des utilisateurs (Admin uniquement)
 *
 * Fonctionnalités :
 * - Vue d'ensemble des statistiques utilisateurs
 * - Liste paginée des utilisateurs avec recherche et filtres
 * - Graphiques visuels (répartition par provider, activité)
 * - Détails utilisateur individuel
 */
export function UserManagement() {
  const {
    users,
    overview,
    loading,
    error,
    refresh,
    searchByEmail,
    filterByProvider,
    filterByActivity,
  } = useUsers();

  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "google" | "email">("all");
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const detailModalRef = useFocusTrap<HTMLDivElement>(!!selectedUser);

  useEffect(() => {
    if (!selectedUser) return;
    const modal = detailModalRef.current;
    if (!modal) return;

    const handleCloseRequest = () => setSelectedUser(null);
    modal.addEventListener("modal-close-request", handleCloseRequest);

    return () => {
      modal.removeEventListener("modal-close-request", handleCloseRequest);
    };
  }, [selectedUser, detailModalRef]);

  // Appliquer tous les filtres
  const getFilteredUsers = (): UserWithStats[] => {
    let filtered = users;

    // Filtre par provider
    if (providerFilter !== "all") {
      filtered = filterByProvider(providerFilter);
    }

    // Filtre par activité
    if (activityFilter !== "all") {
      filtered = filterByActivity(activityFilter);
    }

    // Recherche par email/nom
    if (searchQuery.trim()) {
      filtered = searchByEmail(searchQuery);
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  // Données pour le graphique en camembert (répartition par provider)
  const providerData = [
    { name: "Google", value: overview.googleUsers, color: "#EA4335" },
    { name: "Email/Password", value: overview.emailUsers, color: "#2563eb" },
  ];

  // Données pour le graphique d'activité (exemple simplifié)
  const activityData = [
    { name: "Utilisateurs actifs", value: overview.activeUsers },
    { name: "Utilisateurs inactifs", value: overview.totalUsers - overview.activeUsers },
  ];

  // Format date lisible
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl mb-4">❌ {error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <ArrowsClockwise size={16} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600">
              Administration et surveillance des comptes
            </p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            aria-label="Rafraîchir les données"
          >
            <ArrowsClockwise size={16} />
            Rafraîchir
          </button>
        </div>

        {/* Cards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Utilisateurs</h3>
              <UsersThree size={24} weight="bold" className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1">
              {overview.newUsersThisWeek} nouveaux cette semaine
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Utilisateurs Actifs</h3>
              <CheckCircle size={24} weight="bold" className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.activeUsers}</p>
            <p className="text-xs text-gray-500 mt-1">
              Connectés dans les 30 derniers jours
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Google Auth</h3>
              <GoogleLogo size={24} weight="bold" className="text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.googleUsers}</p>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((overview.googleUsers / overview.totalUsers) * 100)}% du total
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Email/Password</h3>
              <EnvelopeSimple size={24} weight="bold" className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{overview.emailUsers}</p>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((overview.emailUsers / overview.totalUsers) * 100)}% du total
            </p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Répartition par Provider */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Répartition par Méthode d'Authentification
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={providerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: { name?: string; percent?: number }) =>
                    `${props.name || ""}: ${((props.percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {providerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Activité */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Activité Utilisateurs (30 jours)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filtres et Recherche */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recherche */}
            <div>
              <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher
              </label>
              <div className="relative">
                <MagnifyingGlass
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  id="user-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Email ou nom..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtre Provider */}
            <div>
              <label htmlFor="user-provider-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Méthode d'authentification
              </label>
              <select
                id="user-provider-filter"
                value={providerFilter}
                onChange={(e) =>
                  setProviderFilter(e.target.value as "all" | "google" | "email")
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes</option>
                <option value="google">Google</option>
                <option value="email">Email/Password</option>
              </select>
            </div>

            {/* Filtre Activité */}
            <div>
              <label htmlFor="user-activity-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Activité
              </label>
              <select
                id="user-activity-filter"
                value={activityFilter}
                onChange={(e) =>
                  setActivityFilter(e.target.value as "all" | "active" | "inactive")
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="active">Actifs (30 jours)</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </div>

          {/* Résultats filtrés */}
          <p className="text-sm text-gray-600 mt-4">
            {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""} trouvé
            {filteredUsers.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Tableau des utilisateurs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livres
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bibliothèques
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const hasGoogle = user.providerData.some(
                      (p) => p.providerId === "google.com"
                    );
                    const hasPassword = user.providerData.some(
                      (p) => p.providerId === "password"
                    );

                    return (
                      <tr key={user.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.displayName || "Avatar"}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {user.displayName?.[0]?.toUpperCase() ||
                                    user.email?.[0]?.toUpperCase() ||
                                    "?"}
                                </span>
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.displayName || "Sans nom"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.emailVerified ? "✓ Vérifié" : "⚠ Non vérifié"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-1">
                            {hasGoogle && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <GoogleLogo size={12} className="mr-1" />
                                Google
                              </span>
                            )}
                            {hasPassword && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <EnvelopeSimple size={12} className="mr-1" />
                                Email
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.stats.totalBooks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.stats.totalLibraries}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Info size={16} />
                            Détails
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de détails utilisateur */}
        {selectedUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedUser(null)}
          >
            <div
              ref={detailModalRef}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-details-title"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {selectedUser.photoURL ? (
                      <img
                        src={selectedUser.photoURL}
                        alt={selectedUser.displayName || "Avatar"}
                        className="h-16 w-16 rounded-full"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-2xl font-medium">
                          {selectedUser.displayName?.[0]?.toUpperCase() ||
                            selectedUser.email?.[0]?.toUpperCase() ||
                            "?"}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 id="user-details-title" className="text-2xl font-bold text-gray-900">
                        {selectedUser.displayName || "Sans nom"}
                      </h2>
                      <p className="text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Fermer"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Informations */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        UID
                      </h3>
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {selectedUser.uid}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Statut Email
                      </h3>
                      <p className="text-sm text-gray-900">
                        {selectedUser.emailVerified ? "✓ Vérifié" : "⚠ Non vérifié"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Créé le
                      </h3>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedUser.createdAt)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">
                        Dernière connexion
                      </h3>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedUser.lastLoginAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Méthodes d'authentification
                    </h3>
                    <div className="flex gap-2">
                      {selectedUser.providerData.map((provider, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            provider.providerId === "google.com"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {provider.providerId === "google.com" ? (
                            <>
                              <GoogleLogo size={14} className="mr-1" />
                              Google
                            </>
                          ) : (
                            <>
                              <EnvelopeSimple size={14} className="mr-1" />
                              Email/Password
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Statistiques
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          Livres dans la collection
                        </h4>
                        <p className="text-3xl font-bold text-blue-600">
                          {selectedUser.stats.totalBooks}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-purple-900 mb-1">
                          Bibliothèques créées
                        </h4>
                        <p className="text-3xl font-bold text-purple-600">
                          {selectedUser.stats.totalLibraries}
                        </p>
                      </div>
                    </div>
                    {selectedUser.stats.lastActivity && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">
                          Dernière activité (livre ajouté/modifié)
                        </h4>
                        <p className="text-sm text-gray-900">
                          {formatDate(selectedUser.stats.lastActivity)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
