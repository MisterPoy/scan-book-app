import { useState } from 'react';

export interface FilterState {
  readingStatus: string[];
  bookType: string[];
  genre: string[];
  yearRange: [number | null, number | null];
  pageRange: [number | null, number | null];
  authors: string[];
  favorites: boolean | null; // null = tous, true = favoris, false = non favoris
  libraries: string[]; // IDs des bibliothèques sélectionnées
}

interface FiltersPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableGenres: string[];
  bookCount: number;
  filteredCount: number;
  userLibraries?: any[]; // Ajout des bibliothèques utilisateur
}

const READING_STATUS_OPTIONS = [
  { value: 'lu', label: '✅ Lu', color: 'bg-green-100 text-green-800' },
  { value: 'non_lu', label: '⭕ Non lu', color: 'bg-gray-100 text-gray-800' },
  { value: 'a_lire', label: '📖 À lire', color: 'bg-blue-100 text-blue-800' },
  { value: 'en_cours', label: '🔄 En cours', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'abandonne', label: '❌ Abandonné', color: 'bg-red-100 text-red-800' }
];

const BOOK_TYPE_OPTIONS = [
  { value: 'physique', label: '📚 Physique', color: 'bg-brown-100 text-brown-800' },
  { value: 'numerique', label: '💻 Numérique', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'audio', label: '🎧 Audio', color: 'bg-purple-100 text-purple-800' }
];

export default function FiltersPanel({ 
  filters, 
  onFiltersChange, 
  availableGenres, 
  bookCount, 
  filteredCount,
  userLibraries = []
}: FiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFilter = (category: 'readingStatus' | 'bookType' | 'genre' | 'authors' | 'libraries', value: string) => {
    const newFilters = { ...filters };
    const currentValues = newFilters[category] as string[];
    
    if (currentValues.includes(value)) {
      newFilters[category] = currentValues.filter(v => v !== value);
    } else {
      newFilters[category] = [...currentValues, value];
    }
    
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      readingStatus: [],
      bookType: [],
      genre: [],
      yearRange: [null, null],
      pageRange: [null, null],
      authors: [],
      favorites: null,
      libraries: []
    });
  };

  const hasActiveFilters = filters.readingStatus.length > 0 || 
                          filters.bookType.length > 0 || 
                          filters.genre.length > 0 ||
                          filters.yearRange[0] !== null || 
                          filters.yearRange[1] !== null ||
                          filters.pageRange[0] !== null || 
                          filters.pageRange[1] !== null ||
                          filters.authors.length > 0 ||
                          filters.favorites !== null ||
                          filters.libraries.length > 0;

  const activeFiltersCount = filters.readingStatus.length + 
                            filters.bookType.length + 
                            filters.genre.length +
                            filters.authors.length +
                            filters.libraries.length +
                            (filters.yearRange[0] !== null || filters.yearRange[1] !== null ? 1 : 0) +
                            (filters.pageRange[0] !== null || filters.pageRange[1] !== null ? 1 : 0) +
                            (filters.favorites !== null ? 1 : 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6">
      {/* Header avec toggle */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900">🔍 Filtres</h3>
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {filteredCount} / {bookCount} livre{bookCount > 1 ? 's' : ''}
          </span>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            {isExpanded ? '🔼' : '🔽'}
          </button>
        </div>
      </div>

      {/* Contenu des filtres */}
      <div className={`transition-all duration-300 ${
        isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4 border-t overflow-y-auto max-h-[580px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            
            {/* Statut de lecture */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 text-sm">📊 Statut de lecture</h4>
              <div className="space-y-2">
                {READING_STATUS_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.readingStatus.includes(option.value)}
                      onChange={() => toggleFilter('readingStatus', option.value)}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type de livre */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 text-sm">📱 Type de livre</h4>
              <div className="space-y-2">
                {BOOK_TYPE_OPTIONS.map(option => (
                  <label key={option.value} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.bookType.includes(option.value)}
                      onChange={() => toggleFilter('bookType', option.value)}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 text-sm">🏷️ Genres</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableGenres.length > 0 ? (
                  availableGenres.map(genre => (
                    <label key={genre} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.genre.includes(genre)}
                        onChange={() => toggleFilter('genre', genre)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {genre}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Aucun genre disponible
                  </p>
                )}
              </div>
            </div>

            {/* Bibliothèques */}
            {userLibraries.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 text-sm">🗂️ Bibliothèques</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {userLibraries.map(library => (
                    <label key={library.id} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.libraries.includes(library.id)}
                        onChange={() => toggleFilter('libraries', library.id)}
                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded flex items-center justify-center text-xs text-white"
                          style={{ backgroundColor: library.color || '#3B82F6' }}
                        >
                          {library.icon}
                        </div>
                        <span className="text-sm text-gray-700">
                          {library.name}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filtres avancés - Deuxième ligne */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t mt-6">
            
            {/* Filtre par année */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 text-sm">📅 Année de publication</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="De"
                  value={filters.yearRange[0] || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    onFiltersChange({
                      ...filters,
                      yearRange: [value, filters.yearRange[1]]
                    });
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="À"
                  value={filters.yearRange[1] || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    onFiltersChange({
                      ...filters,
                      yearRange: [filters.yearRange[0], value]
                    });
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filtre par nombre de pages */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 text-sm">📄 Nombre de pages</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.pageRange[0] || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    onFiltersChange({
                      ...filters,
                      pageRange: [value, filters.pageRange[1]]
                    });
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.pageRange[1] || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    onFiltersChange({
                      ...filters,
                      pageRange: [filters.pageRange[0], value]
                    });
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Favoris */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 text-sm">⭐ Favoris</h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="favorites"
                    checked={filters.favorites === null}
                    onChange={() => onFiltersChange({ ...filters, favorites: null })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Tous</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="favorites"
                    checked={filters.favorites === true}
                    onChange={() => onFiltersChange({ ...filters, favorites: true })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">⭐ Favoris uniquement</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="favorites"
                    checked={filters.favorites === false}
                    onChange={() => onFiltersChange({ ...filters, favorites: false })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Non favoris</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          {hasActiveFilters && (
            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                🧹 Effacer tous les filtres
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}