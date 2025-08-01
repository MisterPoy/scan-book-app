import { useState } from 'react';

export interface FilterState {
  readingStatus: string[];
  bookType: string[];
  genre: string[];
}

interface FiltersPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableGenres: string[];
  bookCount: number;
  filteredCount: number;
}

const READING_STATUS_OPTIONS = [
  { value: 'lu', label: '✅ Lu', color: 'bg-green-100 text-green-800' },
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
  filteredCount 
}: FiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFilter = (category: keyof FilterState, value: string) => {
    const newFilters = { ...filters };
    const currentValues = newFilters[category];
    
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
      genre: []
    });
  };

  const hasActiveFilters = filters.readingStatus.length > 0 || 
                          filters.bookType.length > 0 || 
                          filters.genre.length > 0;

  const activeFiltersCount = filters.readingStatus.length + 
                            filters.bookType.length + 
                            filters.genre.length;

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
      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            
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
          </div>

          {/* Actions */}
          {hasActiveFilters && (
            <div className="flex justify-end mt-4 pt-4 border-t">
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