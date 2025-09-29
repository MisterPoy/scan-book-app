import React, { useState } from 'react';
import type { UserLibrary } from '../types/library';
import { Book, BookOpen, Notebook, Star, Heart, Bookmark, Target, Rocket, Diamond, Palette, Pencil, MaskHappy, CircleWavy, Umbrella, GameController, X, Folder, Trash, Sparkle, Timer, PencilSimple } from 'phosphor-react';

interface LibraryManagerProps {
  libraries: UserLibrary[];
  onCreateLibrary: (library: Omit<UserLibrary, 'id' | 'createdAt'>) => Promise<string | undefined>;
  onUpdateLibrary?: (id: string, library: Omit<UserLibrary, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteLibrary: (id: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
];

const PRESET_ICONS = [
  'BK', 'BO', 'NB', 'ST', 'HT', 'BM', 'TG', 'RK',
  'DM', 'PL', 'PN', 'MH', 'GM', 'UM', 'SP', 'GC'
];

const renderIcon = (iconCode: string, size: number = 16): React.ReactElement => {
  const iconMap: { [key: string]: React.ReactElement } = {
    'BK': <Book size={size} weight="regular" />,
    'BO': <BookOpen size={size} weight="regular" />,
    'NB': <Notebook size={size} weight="regular" />,
    'ST': <Star size={size} weight="regular" />,
    'HT': <Heart size={size} weight="regular" />,
    'BM': <Bookmark size={size} weight="regular" />,
    'TG': <Target size={size} weight="regular" />,
    'RK': <Rocket size={size} weight="regular" />,
    'DM': <Diamond size={size} weight="regular" />,
    'PL': <Palette size={size} weight="regular" />,
    'PN': <Pencil size={size} weight="regular" />,
    'MH': <MaskHappy size={size} weight="regular" />,
    'GM': <CircleWavy size={size} weight="regular" />,
    'UM': <Umbrella size={size} weight="regular" />,
    'SP': <Sparkle size={size} weight="regular" />,
    'GC': <GameController size={size} weight="regular" />
  };
  return iconMap[iconCode] || <Book size={size} weight="regular" />;
};

export default function LibraryManager({
  libraries,
  onCreateLibrary,
  onUpdateLibrary,
  onDeleteLibrary,
  isOpen,
  onClose
}: LibraryManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<UserLibrary | null>(null);
  const [newLibrary, setNewLibrary] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    icon: PRESET_ICONS[0]
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleCreateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLibrary.name.trim()) {
      alert("Le nom de la bibliothèque est obligatoire");
      return;
    }

    setCreating(true);
    try {
      await onCreateLibrary({
        name: newLibrary.name.trim(),
        description: newLibrary.description.trim() || undefined,
        color: newLibrary.color,
        icon: newLibrary.icon
      });
      
      // Reset form
      setNewLibrary({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: PRESET_ICONS[0]
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Erreur création bibliothèque:', error);
      alert('Erreur lors de la création de la bibliothèque');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLibrary = async (library: UserLibrary) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la bibliothèque "${library.name}" ? Cette action est irréversible.`)) {
      try {
        await onDeleteLibrary(library.id);
      } catch (error) {
        console.error('Erreur suppression bibliothèque:', error);
        alert('Erreur lors de la suppression de la bibliothèque');
      }
    }
  };

  const handleEditLibrary = (library: UserLibrary) => {
    setEditingLibrary(library);
    setNewLibrary({
      name: library.name,
      description: library.description || '',
      color: library.color || PRESET_COLORS[0],
      icon: library.icon || PRESET_ICONS[0]
    });
    setShowCreateForm(true);
  };

  const handleUpdateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingLibrary || !onUpdateLibrary) return;

    if (!newLibrary.name.trim()) {
      alert("Le nom de la bibliothèque est obligatoire");
      return;
    }

    setUpdating(true);
    try {
      await onUpdateLibrary(editingLibrary.id, {
        name: newLibrary.name.trim(),
        description: newLibrary.description.trim() || undefined,
        color: newLibrary.color,
        icon: newLibrary.icon
      });

      // Reset form
      setNewLibrary({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: PRESET_ICONS[0]
      });
      setEditingLibrary(null);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Erreur modification bibliothèque:', error);
      alert('Erreur lors de la modification de la bibliothèque');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingLibrary(null);
    setNewLibrary({
      name: '',
      description: '',
      color: PRESET_COLORS[0],
      icon: PRESET_ICONS[0]
    });
    setShowCreateForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 max-md:p-0">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto md:max-h-[90vh] md:rounded-lg max-md:rounded-none max-md:max-h-full max-md:h-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Folder size={24} weight="bold" />
            Gestion des bibliothèques
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={20} weight="regular" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Header avec bouton créer */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mes bibliothèques ({libraries.length})
              </h3>
              <p className="text-sm text-gray-600">
                Organisez vos livres dans des bibliothèques personnalisées
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              ➕ Nouvelle bibliothèque
            </button>
          </div>

          {/* Formulaire de création */}
          {showCreateForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                {editingLibrary ? <PencilSimple size={20} weight="regular" /> : <Sparkle size={20} weight="regular" />}
                {editingLibrary ? 'Modifier la bibliothèque' : 'Créer une nouvelle bibliothèque'}
              </h4>
              
              <form onSubmit={editingLibrary ? handleUpdateLibrary : handleCreateLibrary} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de la bibliothèque *
                    </label>
                    <input
                      type="text"
                      value={newLibrary.name}
                      onChange={(e) => setNewLibrary(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Romans de science-fiction"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optionnelle)
                    </label>
                    <input
                      type="text"
                      value={newLibrary.description}
                      onChange={(e) => setNewLibrary(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Description de la bibliothèque"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sélecteur d'icône */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icône
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESET_ICONS.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewLibrary(prev => ({ ...prev, icon }))}
                          className={`p-2 text-lg rounded-md border-2 transition-colors ${
                            newLibrary.icon === icon 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center">
                            {renderIcon(icon, 20)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sélecteur de couleur */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Couleur
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLibrary(prev => ({ ...prev, color }))}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            newLibrary.color === color 
                              ? 'border-gray-800 scale-110' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Aperçu */}
                <div className="bg-white p-3 rounded-md border">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Aperçu :</h5>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: newLibrary.color }}
                    >
                      {renderIcon(newLibrary.icon, 18)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {newLibrary.name || 'Nom de la bibliothèque'}
                      </div>
                      {newLibrary.description && (
                        <div className="text-sm text-gray-600">
                          {newLibrary.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={editingLibrary ? handleCancelEdit : () => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating || updating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {(creating || updating) ? (
                      <>
                        <Timer size={16} className="inline mr-2" />
                        {editingLibrary ? 'Modification...' : 'Création...'}
                      </>
                    ) : (
                      <>
                        {editingLibrary ? <PencilSimple size={16} className="inline mr-2" /> : <Sparkle size={16} className="inline mr-2" />}
                        {editingLibrary ? 'Modifier la bibliothèque' : 'Créer la bibliothèque'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des bibliothèques */}
          {libraries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Folder size={64} weight="regular" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune bibliothèque</h3>
              <p className="text-gray-600">Créez votre première bibliothèque pour organiser vos livres</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {libraries.map(library => (
                <div key={library.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-lg"
                        style={{ backgroundColor: library.color || PRESET_COLORS[0] }}
                      >
                        {renderIcon(library.icon || PRESET_ICONS[0])}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{library.name}</h4>
                        {library.description && (
                          <p className="text-sm text-gray-600">{library.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onUpdateLibrary && (
                        <button
                          onClick={() => handleEditLibrary(library)}
                          className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer"
                          title="Modifier cette bibliothèque"
                        >
                          <PencilSimple size={16} weight="regular" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteLibrary(library)}
                        className="text-red-600 hover:text-red-700 p-1 cursor-pointer"
                        title="Supprimer cette bibliothèque"
                      >
                        <Trash size={16} weight="regular" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Créée le {new Date(library.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}