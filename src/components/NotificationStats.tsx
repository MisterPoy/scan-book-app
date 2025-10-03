import { useState, useEffect } from 'react';
import { ChartBar, Bell, CheckCircle, XCircle, Users, Calendar, ArrowClockwise } from 'phosphor-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  getNotificationStats,
  cleanupOldNotificationHistory,
  getAnnouncementNotificationHistory
} from '../services/notificationHistory';
import { getAllAnnouncements } from '../services/announcements';
import type { NotificationHistory } from '../types/notification';

interface NotificationStatsData {
  announcementId: string;
  announcementTitle: string;
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  totalDelivered: number;
  totalUsers: number;
  failureRate: number;
  deliveryRate: number;
  createdAt: string;
}

const COLORS = {
  sent: '#10b981', // green-500
  failed: '#ef4444', // red-500
  pending: '#f59e0b', // amber-500
  delivered: '#3b82f6', // blue-500
};

export default function NotificationStats() {
  const [stats, setStats] = useState<NotificationStatsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<string | null>(null);
  const [failedNotifications, setFailedNotifications] = useState<NotificationHistory[]>([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    loadNotificationStats();
  }, []);

  const loadNotificationStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Récupérer toutes les annonces
      const announcements = await getAllAnnouncements();

      // 2. Pour chaque annonce, récupérer ses statistiques de notification
      const statsPromises = announcements.map(async (announcement) => {
        const notificationStats = await getNotificationStats(announcement.id);
        return {
          announcementId: announcement.id,
          announcementTitle: announcement.title,
          totalSent: notificationStats.totalSent,
          totalFailed: notificationStats.totalFailed,
          totalPending: notificationStats.totalPending,
          totalDelivered: notificationStats.totalDelivered,
          totalUsers: notificationStats.totalUsers,
          failureRate: notificationStats.failureRate,
          deliveryRate: notificationStats.deliveryRate,
          createdAt: announcement.createdAt
        };
      });

      const allStats = await Promise.all(statsPromises);

      // 3. Filtrer seulement les annonces qui ont eu des notifications
      const filteredStats = allStats.filter(stat => stat.totalSent > 0 || stat.totalFailed > 0);

      // 4. Trier par date de création (plus récent en premier)
      filteredStats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setStats(filteredStats);
    } catch (err) {
      console.error('Erreur chargement statistiques notifications:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      await cleanupOldNotificationHistory();
      await loadNotificationStats(); // Recharger après nettoyage
      alert('Nettoyage de l\'historique lancé (vérifiez les logs de la console)');
    } catch (err) {
      console.error('Erreur nettoyage historique:', err);
      alert('Erreur lors du nettoyage');
    }
  };

  const handleViewDetails = async (announcementId: string) => {
    try {
      setSelectedAnnouncement(announcementId);
      const history = await getAnnouncementNotificationHistory(announcementId);
      const failed = history.filter(h => h.status === 'failed');
      setFailedNotifications(failed);
    } catch (err) {
      console.error('Erreur chargement détails:', err);
    }
  };

  const handleRetryFailed = async (announcementId: string) => {
    setRetrying(true);
    try {
      const history = await getAnnouncementNotificationHistory(announcementId);
      const failed = history.filter(h => h.status === 'failed');

      // TODO: Implémenter la logique de relance via le backend
      // Pour l'instant, on simule la relance
      console.log(`Relance de ${failed.length} notifications échouées pour l'annonce ${announcementId}`);

      // Attendre 2 secondes pour simuler la relance
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Recharger les stats
      await loadNotificationStats();
      await handleViewDetails(announcementId);
    } catch (err) {
      console.error('Erreur relance notifications:', err);
    } finally {
      setRetrying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalStats = () => {
    return stats.reduce(
      (acc, stat) => ({
        totalSent: acc.totalSent + stat.totalSent,
        totalFailed: acc.totalFailed + stat.totalFailed,
        totalUsers: Math.max(acc.totalUsers, stat.totalUsers), // Approximation
        totalAnnouncements: acc.totalAnnouncements + 1
      }),
      { totalSent: 0, totalFailed: 0, totalUsers: 0, totalAnnouncements: 0 }
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBar size={24} weight="bold" className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Statistiques des Notifications</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBar size={24} weight="bold" className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Statistiques des Notifications</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle size={20} />
            <div>
              <h4 className="font-medium">Erreur de chargement</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalStats = getTotalStats();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ChartBar size={24} weight="bold" className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Statistiques des Notifications</h3>
        </div>
        <button
          onClick={handleCleanup}
          className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Nettoyer l'historique
        </button>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-8">
          <Bell size={48} className="text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Aucune notification envoyée</h4>
          <p className="text-gray-600">
            Les statistiques apparaîtront ici une fois que des notifications auront été envoyées.
          </p>
        </div>
      ) : (
        <>
          {/* Statistiques globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">Envoyées</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-1">{totalStats.totalSent}</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-red-600" />
                <span className="text-sm font-medium text-red-800">Échouées</span>
              </div>
              <p className="text-2xl font-bold text-red-900 mt-1">{totalStats.totalFailed}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Utilisateurs</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">{totalStats.totalUsers}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Annonces</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-1">{totalStats.totalAnnouncements}</p>
            </div>
          </div>

          {/* Détail par annonce */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Détail par annonce</h4>
            {stats.map((stat) => {
              const isExpanded = selectedAnnouncement === stat.announcementId;
              const pieData = [
                { name: 'Envoyées', value: stat.totalSent, color: COLORS.sent },
                { name: 'Échouées', value: stat.totalFailed, color: COLORS.failed },
                { name: 'En attente', value: stat.totalPending, color: COLORS.pending },
                { name: 'Délivrées', value: stat.totalDelivered, color: COLORS.delivered },
              ].filter(item => item.value > 0);

              const barData = [{
                name: 'Stats',
                envoyées: stat.totalSent,
                échouées: stat.totalFailed,
                'en attente': stat.totalPending,
                délivrées: stat.totalDelivered,
              }];

              return (
                <div key={stat.announcementId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{stat.announcementTitle}</h5>
                      <p className="text-xs text-gray-500">{formatDate(stat.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => isExpanded ? setSelectedAnnouncement(null) : handleViewDetails(stat.announcementId)}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        {isExpanded ? 'Masquer' : 'Voir détails'}
                      </button>
                      {stat.totalFailed > 0 && (
                        <button
                          onClick={() => handleRetryFailed(stat.announcementId)}
                          disabled={retrying}
                          className="flex items-center gap-1 text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          <ArrowClockwise size={14} className={retrying ? 'animate-spin' : ''} />
                          Relancer
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-green-800">{stat.totalSent} envoyées</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-red-600" />
                      <span className="text-red-800">{stat.totalFailed} échouées</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-amber-600" />
                      <span className="text-amber-800">{stat.totalPending} en attente</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-blue-600" />
                      <span className="text-blue-800">{stat.totalUsers} utilisateurs</span>
                    </div>
                  </div>

                  {/* Métriques */}
                  <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-600">Taux d'échec:</span>
                      <span className="ml-2 font-medium text-gray-900">{stat.failureRate.toFixed(2)}%</span>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-gray-600">Taux de délivrance:</span>
                      <span className="ml-2 font-medium text-gray-900">{stat.deliveryRate.toFixed(2)}%</span>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Taux de succès</span>
                      <span>
                        {stat.totalSent + stat.totalFailed > 0
                          ? Math.round((stat.totalSent / (stat.totalSent + stat.totalFailed)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: stat.totalSent + stat.totalFailed > 0
                            ? `${(stat.totalSent / (stat.totalSent + stat.totalFailed)) * 100}%`
                            : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Section détaillée avec graphiques */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Graphique camembert */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h6 className="text-sm font-medium text-gray-900 mb-3">Distribution des statuts</h6>
                          {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={(entry) => `${entry.value}`}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-8">Aucune donnée</p>
                          )}
                        </div>

                        {/* Graphique barres */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h6 className="text-sm font-medium text-gray-900 mb-3">Vue d'ensemble</h6>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={barData}>
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="envoyées" fill={COLORS.sent} />
                              <Bar dataKey="échouées" fill={COLORS.failed} />
                              <Bar dataKey="en attente" fill={COLORS.pending} />
                              <Bar dataKey="délivrées" fill={COLORS.delivered} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Liste des erreurs */}
                      {failedNotifications.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-4">
                          <h6 className="text-sm font-medium text-red-900 mb-3">
                            Détails des erreurs ({failedNotifications.length})
                          </h6>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {failedNotifications.slice(0, 10).map((notification) => (
                              <div
                                key={notification.id}
                                className="text-xs bg-white border border-red-200 rounded p-2"
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium text-red-700">
                                    {notification.errorCode || 'UNKNOWN'}
                                  </span>
                                  <span className="text-gray-500">
                                    {new Date(notification.sentAt).toLocaleString('fr-FR')}
                                  </span>
                                </div>
                                {notification.errorMessage && (
                                  <p className="text-red-600 mt-1">{notification.errorMessage}</p>
                                )}
                                {notification.deviceInfo && (
                                  <p className="text-gray-500 mt-1">
                                    {notification.deviceInfo.platform} - {notification.deviceInfo.userAgent?.substring(0, 50)}...
                                  </p>
                                )}
                              </div>
                            ))}
                            {failedNotifications.length > 10 && (
                              <p className="text-xs text-gray-500 text-center">
                                ... et {failedNotifications.length - 10} autre{failedNotifications.length - 10 > 1 ? 's' : ''} erreur{failedNotifications.length - 10 > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}