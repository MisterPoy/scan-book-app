import { useState, useEffect } from 'react';
import { Clock, Plus, Trash, Calendar, Bell, Play, Pause, X } from 'phosphor-react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface ScheduledNotification {
  id?: string;
  title: string;
  message: string;
  scheduledFor: string; // ISO string
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  targetAudience: 'all' | 'admins';
}

interface ScheduledNotificationsProps {
  userId: string;
  userRole: 'admin' | 'user';
}

export default function ScheduledNotifications({ userId, userRole }: ScheduledNotificationsProps) {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    scheduledFor: '',
    recurring: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    targetAudience: 'all' as 'all' | 'admins'
  });

  const loadScheduledNotifications = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'scheduled_notifications'),
        orderBy('scheduledFor', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const notifs: ScheduledNotification[] = [];

      querySnapshot.forEach((doc) => {
        notifs.push({
          id: doc.id,
          ...doc.data()
        } as ScheduledNotification);
      });

      setNotifications(notifs);
    } catch (error) {
      console.error('Erreur chargement notifications programmées:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'admin') {
      loadScheduledNotifications();
    }
  }, [userRole]);

  // Seuls les admins peuvent accéder
  if (userRole !== 'admin') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <Clock size={20} />
          <div>
            <h4 className="font-medium">Accès restreint</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Seuls les administrateurs peuvent programmer des notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message || !formData.scheduledFor) return;

    try {
      setLoading(true);

      const scheduledNotification: Omit<ScheduledNotification, 'id'> = {
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: userId
      };

      await addDoc(collection(db, 'scheduled_notifications'), scheduledNotification);

      // Reset form
      setFormData({
        title: '',
        message: '',
        scheduledFor: '',
        recurring: 'none',
        targetAudience: 'all'
      });
      setShowCreateForm(false);

      await loadScheduledNotifications();
    } catch (error) {
      console.error('Erreur création notification programmée:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = async (id: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'scheduled_notifications', id), {
        isActive: !isActive
      });
      await loadScheduledNotifications();
    } catch (error) {
      console.error('Erreur toggle notification:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm('Supprimer cette notification programmée ?')) return;

    try {
      await deleteDoc(doc(db, 'scheduled_notifications', id));
      await loadScheduledNotifications();
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Calculer la prochaine date scheduledFor
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Minimum 5 minutes dans le futur
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton créer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={24} className="text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications programmées ({notifications.length})
            </h3>
            <p className="text-sm text-gray-600">
              Planifiez l'envoi automatique de notifications
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium cursor-pointer flex items-center gap-2"
        >
          <Plus size={16} />
          Programmer
        </button>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="bg-gray-50 rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Programmer une notification</h4>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all cursor-pointer"
              aria-label="Fermer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Titre de la notification"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date et heure *
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({...formData, scheduledFor: e.target.value})}
                  min={getMinDateTime()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contenu de la notification..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Récurrence
                </label>
                <select
                  value={formData.recurring}
                  onChange={(e) => setFormData({...formData, recurring: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">Une seule fois</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Public cible
                </label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({...formData, targetAudience: e.target.value as 'all' | 'admins'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tous les utilisateurs</option>
                  <option value="admins">Administrateurs uniquement</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
              >
                {loading ? 'Programmation...' : 'Programmer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des notifications programmées */}
      <div className="space-y-4">
        {loading && notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Chargement...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock size={64} className="text-gray-400 mb-4 mx-auto" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Aucune notification programmée</h4>
            <p className="text-gray-600">Créez votre première notification programmée</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white border rounded-lg p-4 ${
                isExpired(notification.scheduledFor) ? 'border-gray-300 opacity-75' :
                notification.isActive ? 'border-green-200' : 'border-yellow-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-medium text-gray-900">{notification.title}</h5>
                    <div className="flex items-center gap-2">
                      {isExpired(notification.scheduledFor) ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Expirée
                        </span>
                      ) : notification.isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Programmée
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          Suspendue
                        </span>
                      )}

                      {notification.recurring !== 'none' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {notification.recurring === 'daily' ? 'Quotidienne' :
                           notification.recurring === 'weekly' ? 'Hebdomadaire' :
                           'Mensuelle'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{notification.message}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDateTime(notification.scheduledFor)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Bell size={12} />
                      {notification.targetAudience === 'all' ? 'Tous' : 'Admins'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!isExpired(notification.scheduledFor) && (
                    <button
                      onClick={() => toggleNotification(notification.id!, notification.isActive)}
                      className={`p-2 rounded-md transition-colors ${
                        notification.isActive
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={notification.isActive ? 'Suspendre' : 'Activer'}
                      aria-label={notification.isActive ? "Suspendre la notification" : "Activer la notification"}
                      aria-pressed={notification.isActive}
                    >
                      {notification.isActive ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                  )}

                  <button
                    onClick={() => deleteNotification(notification.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Supprimer"
                    aria-label="Supprimer la notification"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info sur le fonctionnement */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">ℹ️ Comment ça marche ?</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• Les notifications sont envoyées automatiquement à l'heure programmée</div>
          <div>• Les récurrences créent de nouvelles notifications aux intervalles définis</div>
          <div>• Vous pouvez suspendre ou supprimer les notifications avant leur envoi</div>
          <div>• Les notifications expirées sont conservées pour historique</div>
        </div>
      </div>
    </div>
  );
}
