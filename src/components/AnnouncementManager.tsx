import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  X,
  Eye,
  EyeClosed,
  Pencil,
  Trash,
  Info,
  Warning,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Shield,
  Monitor,
  ChartBar,
  Clock
} from 'phosphor-react';
import type { Announcement, CreateAnnouncementData } from '../types/announcement';
import {
  createAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus
} from '../services/announcements';
import NotificationStats from './NotificationStats';
import ScheduledNotifications from './ScheduledNotifications';

interface AnnouncementManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    uid: string;
    role: 'admin' | 'user';
  };
}

const TYPE_ICONS = {
  info: <Info size={16} />,
  warning: <Warning size={16} />,
  success: <CheckCircle size={16} />,
  error: <XCircle size={16} />
};

const TYPE_COLORS = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-orange-100 text-orange-700',
  high: 'bg-red-100 text-red-700'
};

export default function AnnouncementManager({ isOpen, onClose, currentUser }: AnnouncementManagerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'announcements' | 'stats' | 'scheduled'>('announcements');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: '',
    message: '',
    type: 'info',
    displayMode: 'banner',
    priority: 'medium',
    targetAudience: 'all'
  });

  useEffect(() => {
    if (isOpen) {
      loadAnnouncements();
    }
  }, [isOpen]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await getAllAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Erreur chargement annonces:', error);
      alert('Erreur lors du chargement des annonces');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Le titre et le message sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, formData);
      } else {
        await createAnnouncement(formData);
      }

      resetForm();
      loadAnnouncements();
    } catch (error) {
      console.error('Erreur sauvegarde annonce:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      displayMode: announcement.displayMode,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience || 'all',
      targetUserIds: announcement.targetUserIds,
      expiresAt: announcement.expiresAt
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (announcement: Announcement) => {
    if (confirm(`Supprimer l'annonce "${announcement.title}" ?`)) {
      setLoading(true);
      try {
        await deleteAnnouncement(announcement.id);
        loadAnnouncements();
      } catch (error) {
        console.error('Erreur suppression annonce:', error);
        alert('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (announcement: Announcement) => {
    setLoading(true);
    try {
      await toggleAnnouncementStatus(announcement.id, !announcement.isActive);
      loadAnnouncements();
    } catch (error) {
      console.error('Erreur changement statut:', error);
      alert('Erreur lors du changement de statut');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      displayMode: 'banner',
      priority: 'medium',
      targetAudience: 'all'
    });
    setEditingAnnouncement(null);
    setShowCreateForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 max-md:p-0">
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto md:max-h-[90vh] md:rounded-lg max-md:rounded-none max-md:max-h-full max-md:h-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={24} weight="bold" />
            Gestion des annonces
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        {/* Onglets de navigation */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'announcements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Megaphone size={16} />
                Annonces ({announcements.length})
              </div>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ChartBar size={16} />
                Statistiques
              </div>
            </button>

            <button
              onClick={() => setActiveTab('scheduled')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scheduled'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={16} />
                Programmées
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'announcements' && (
            <>
              {/* Header avec bouton créer */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Annonces ({announcements.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    Gérez les messages diffusés aux utilisateurs
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium cursor-pointer"
                  disabled={loading}
                >
                  <Plus size={16} className="inline mr-2" />
                  Nouvelle annonce
                </button>
              </div>

          {/* Formulaire de création/édition */}
          {showCreateForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
              <h4 className="font-medium text-gray-900 mb-4">
                {editingAnnouncement ? 'Modifier l\'annonce' : 'Créer une nouvelle annonce'}
              </h4>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Titre de l'annonce"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Avertissement</option>
                      <option value="success">Succès</option>
                      <option value="error">Erreur</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contenu du message"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode d'affichage
                    </label>
                    <select
                      value={formData.displayMode}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayMode: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="banner">Bandeau</option>
                      <option value="modal">Modal</option>
                      <option value="both">Bandeau + Modal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorité
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Faible</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Élevée</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Public cible
                    </label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tous les utilisateurs</option>
                      <option value="admins">Administrateurs uniquement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'expiration (optionnelle)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt ? new Date(formData.expiresAt).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {loading ? 'Sauvegarde...' : (editingAnnouncement ? 'Modifier' : 'Créer')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des annonces */}
          {loading && !showCreateForm ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Chargement...</div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone size={64} className="text-gray-400 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune annonce</h3>
              <p className="text-gray-600">Créez votre première annonce</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map(announcement => (
                <div key={announcement.id} className={`bg-white border rounded-lg p-4 ${announcement.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[announcement.type]}`}>
                        {TYPE_ICONS[announcement.type]}
                        {announcement.type}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[announcement.priority]}`}>
                        {announcement.priority === 'low' ? 'Faible' : announcement.priority === 'medium' ? 'Moyenne' : 'Élevée'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {announcement.displayMode === 'banner' && <Monitor size={12} />}
                        {announcement.displayMode === 'modal' && <Eye size={12} />}
                        {announcement.displayMode === 'both' && <><Monitor size={12} /><Eye size={12} /></>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(announcement)}
                        className={`p-1 cursor-pointer ${announcement.isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                        title={announcement.isActive ? 'Désactiver' : 'Activer'}
                      >
                        {announcement.isActive ? <Eye size={16} /> : <EyeClosed size={16} />}
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer"
                        title="Modifier"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement)}
                        className="text-red-600 hover:text-red-700 p-1 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{announcement.title}</h4>
                    <p className="text-gray-700 text-sm mb-3">{announcement.message}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        Créée le {new Date(announcement.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center gap-1">
                        {announcement.targetAudience === 'all' ? <Users size={12} /> : <Shield size={12} />}
                        {announcement.targetAudience === 'all' ? 'Tous' : 'Admins'}
                      </div>
                      {announcement.expiresAt && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          Expire le {new Date(announcement.expiresAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}

          {/* Onglet Statistiques des notifications */}
          {activeTab === 'stats' && (
            <NotificationStats />
          )}

          {/* Onglet Notifications programmées */}
          {activeTab === 'scheduled' && (
            <ScheduledNotifications
              userId={currentUser?.uid || ''}
              userRole={currentUser?.role || 'user'}
            />
          )}
        </div>
      </div>
    </div>
  );
}