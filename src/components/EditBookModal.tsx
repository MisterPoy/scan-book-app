import { useState, useEffect } from "react";
import { resizeImage } from "../firebase";
import type { UserLibrary } from "../types/library";

interface CollectionBook {
  isbn: string;
  title: string;
  authors: string[];
  addedAt: string;
  isRead: boolean;
  customCoverUrl?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  isManualEntry?: boolean;
  readingStatus?: 'lu' | 'non_lu' | 'a_lire' | 'en_cours' | 'abandonne';
  bookType?: 'physique' | 'numerique' | 'audio';
  genre?: string;
  tags?: string[];
  libraries?: string[];
}

interface EditBookModalProps {
  book: CollectionBook;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBook: CollectionBook) => void;
  userLibraries?: UserLibrary[];
  onCreateLibrary?: (library: Omit<UserLibrary, 'id' | 'createdAt'>) => Promise<string | undefined>;
}

export default function EditBookModal({ book, isOpen, onClose, onSave, userLibraries = [] }: EditBookModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    authors: "",
    publisher: "",
    publishedDate: "",
    description: "",
    pageCount: "",
    customCoverUrl: "",
    readingStatus: "a_lire" as 'lu' | 'non_lu' | 'a_lire' | 'en_cours' | 'abandonne',
    bookType: "physique" as 'physique' | 'numerique' | 'audio',
    genre: "",
    tags: "",
    libraries: [] as string[]
  });
  const [uploading, setUploading] = useState(false);

  // Initialiser le formulaire avec les données du livre
  useEffect(() => {
    if (book && isOpen) {
      setFormData({
        title: book.title || "",
        authors: book.authors?.join(", ") || "",
        publisher: book.publisher || "",
        publishedDate: book.publishedDate || "",
        description: book.description || "",
        pageCount: book.pageCount?.toString() || "",
        customCoverUrl: book.customCoverUrl || "",
        readingStatus: book.readingStatus || "a_lire",
        bookType: book.bookType || "physique",
        genre: book.genre || "",
        tags: book.tags?.join(", ") || "",
        libraries: book.libraries || []
      });
    }
  }, [book, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert("Le titre est obligatoire");
      return;
    }

    const updatedBook: CollectionBook = {
      ...book,
      title: formData.title.trim(),
      authors: formData.authors ? formData.authors.split(',').map(a => a.trim()) : [],
      publisher: formData.publisher.trim() || undefined,
      publishedDate: formData.publishedDate.trim() || undefined,
      description: formData.description.trim() || undefined,
      pageCount: formData.pageCount ? parseInt(formData.pageCount) : undefined,
      customCoverUrl: formData.customCoverUrl || undefined,
      readingStatus: formData.readingStatus,
      bookType: formData.bookType,
      genre: formData.genre.trim() || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
      libraries: formData.libraries.length > 0 ? formData.libraries : undefined
    };

    onSave(updatedBook);
    onClose();
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier doit faire moins de 5MB');
      return;
    }

    setUploading(true);
    try {
      const base64Image = await resizeImage(file, 400, 0.8);
      setFormData(prev => ({ ...prev, customCoverUrl: base64Image }));
    } catch (error) {
      console.error('Erreur traitement image:', error);
      alert('Erreur lors du traitement de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = () => {
    setFormData(prev => ({ ...prev, customCoverUrl: "" }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4 max-md:p-0">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto md:max-h-[90vh] md:rounded-lg max-md:rounded-none max-md:max-h-full max-md:h-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">✏️ Modifier le livre</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche - Informations */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre * (obligatoire)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Titre du livre"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auteur(s) (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.authors}
                  onChange={(e) => setFormData(prev => ({ ...prev, authors: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auteur 1, Auteur 2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Éditeur
                </label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData(prev => ({ ...prev, publisher: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de l'éditeur"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Année de publication
                  </label>
                  <input
                    type="text"
                    value={formData.publishedDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, publishedDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2024"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de pages
                  </label>
                  <input
                    type="number"
                    value={formData.pageCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, pageCount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="250"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description / Résumé
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Résumé du livre..."
                />
              </div>
              
              {/* Nouveaux champs pour les filtres */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📊 Statut de lecture
                  </label>
                  <select
                    value={formData.readingStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, readingStatus: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="non_lu">⭕ Non lu</option>
                    <option value="a_lire">📖 À lire</option>
                    <option value="en_cours">🔄 En cours</option>
                    <option value="lu">✅ Lu</option>
                    <option value="abandonne">❌ Abandonné</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📱 Type de livre
                  </label>
                  <select
                    value={formData.bookType}
                    onChange={(e) => setFormData(prev => ({ ...prev, bookType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="physique">📚 Physique</option>
                    <option value="numerique">💻 Numérique</option>
                    <option value="audio">🎧 Audio</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏷️ Genre / Catégorie
                </label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Science-fiction, Romance, Thriller..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏷️ Tags (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="fantasy, magie, épique..."
                />
              </div>
              
              {/* Sélecteur de bibliothèques */}
              {userLibraries.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🗂️ Bibliothèques (multi-sélection)
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto bg-gray-50">
                    {userLibraries.map(library => (
                      <label key={library.id} className="flex items-center cursor-pointer mb-2 last:mb-0">
                        <input
                          type="checkbox"
                          checked={formData.libraries.includes(library.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                libraries: [...prev.libraries, library.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                libraries: prev.libraries.filter(id => id !== library.id)
                              }));
                            }
                          }}
                          className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded flex items-center justify-center text-xs text-white"
                            style={{ backgroundColor: library.color }}
                          >
                            {library.icon}
                          </div>
                          <span className="text-sm text-gray-700">{library.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {formData.libraries.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      {formData.libraries.length} bibliothèque{formData.libraries.length > 1 ? 's' : ''} sélectionnée{formData.libraries.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Colonne droite - Couverture */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couverture du livre
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {formData.customCoverUrl ? (
                    <div className="relative">
                      <img
                        src={formData.customCoverUrl}
                        alt="Aperçu couverture"
                        className="w-48 h-64 object-cover mx-auto rounded shadow-md"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 shadow-md"
                        title="Supprimer la couverture"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <div className="text-gray-400 text-6xl mb-4">📚</div>
                      <p className="text-gray-600 text-sm mb-4">Aucune couverture personnalisée</p>
                    </div>
                  )}
                  
                  <label className={`inline-block px-4 py-2 rounded-md cursor-pointer transition-colors mt-4 ${
                    uploading 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                    {uploading ? "⏳ Traitement..." : formData.customCoverUrl ? "📷 Changer l'image" : "📷 Ajouter une image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              
              {/* Aperçu des informations */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">📋 Aperçu</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Titre:</span> {formData.title || "Non défini"}</div>
                  <div><span className="font-medium">Auteur(s):</span> {formData.authors || "Non défini"}</div>
                  {formData.publisher && <div><span className="font-medium">Éditeur:</span> {formData.publisher}</div>}
                  {formData.publishedDate && <div><span className="font-medium">Année:</span> {formData.publishedDate}</div>}
                  {formData.pageCount && <div><span className="font-medium">Pages:</span> {formData.pageCount}</div>}
                </div>
              </div>
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? "⏳ Traitement..." : "💾 Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}