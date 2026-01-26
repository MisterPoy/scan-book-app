import { useState, useEffect } from 'react';
import { MagnifyingGlass, Barcode, Book } from 'phosphor-react';
import { detectSearchType } from '../utils/searchHelpers';

interface UnifiedSearchBarProps {
  onSearch: (query: string, type: 'isbn' | 'text') => void;
  onScanClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showScanButton?: boolean;
}

export default function UnifiedSearchBar({
  onSearch,
  onScanClick,
  placeholder = "ISBN ou titre/auteur...",
  disabled = false,
  showScanButton = true,
}: UnifiedSearchBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'isbn' | 'text'>('text');

  useEffect(() => {
    const type = detectSearchType(searchValue);
    setSearchType(type);
  }, [searchValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearch(searchValue.trim(), searchType);
    }
  };

  const handleClear = () => {
    setSearchValue('');
  };

  const typeIndicator = searchType === 'isbn'
    ? { icon: <Barcode size={16} weight="bold" />, label: 'ISBN', color: 'text-blue-600' }
    : { icon: <Book size={16} weight="regular" />, label: 'Texte', color: 'text-gray-600' };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        {/* Champ de recherche unifié */}
        <div className="flex-1 relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-label="Rechercher un livre"
            />
            <MagnifyingGlass
              size={20}
              weight="bold"
              className="absolute left-3 text-gray-400"
            />

            {/* Indicateur de type détecté */}
            {searchValue && (
              <div className={`absolute right-3 flex items-center gap-1.5 ${typeIndicator.color} bg-white px-2 py-1 rounded text-xs font-medium`}>
                {typeIndicator.icon}
                <span>{typeIndicator.label}</span>
              </div>
            )}
          </div>

          {/* Bouton clear (si valeur saisie) */}
          {searchValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Effacer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Bouton Scanner */}
        {showScanButton && (
          <button
            type="button"
            onClick={onScanClick}
            disabled={disabled}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
            aria-label="Scanner un code-barres"
            title="Scanner un code-barres ISBN"
          >
            <Barcode size={20} weight="bold" />
            <span className="hidden sm:inline">Scanner</span>
          </button>
        )}

        {/* Bouton Rechercher */}
        <button
          type="submit"
          disabled={disabled || !searchValue.trim()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
          aria-label="Lancer la recherche"
        >
          <span className="hidden sm:inline">Rechercher</span>
          <MagnifyingGlass size={20} weight="bold" className="sm:hidden" />
        </button>
      </div>

      {/* Hint text */}
      {searchValue && (
        <p className="text-xs text-gray-500 mt-1.5 ml-1">
          {searchType === 'isbn'
            ? "🔍 Recherche par ISBN détectée"
            : "🔍 Recherche par titre ou auteur"}
        </p>
      )}
    </form>
  );
}
