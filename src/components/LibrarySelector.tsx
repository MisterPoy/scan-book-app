import { Check } from 'phosphor-react';
import type { UserLibrary } from '../types/library';

interface LibrarySelectorProps {
  libraries: UserLibrary[];
  selectedLibraries: string[];
  onSelectionChange: (libraryIds: string[]) => void;
  title?: string;
  emptyMessage?: string;
}

export default function LibrarySelector({
  libraries,
  selectedLibraries,
  onSelectionChange,
  title = "Ajouter à une bibliothèque",
  emptyMessage = "Aucune bibliothèque disponible"
}: LibrarySelectorProps) {
  const handleToggle = (libraryId: string) => {
    if (selectedLibraries.includes(libraryId)) {
      onSelectionChange(selectedLibraries.filter(id => id !== libraryId));
    } else {
      onSelectionChange([...selectedLibraries, libraryId]);
    }
  };

  if (libraries.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4" role="status">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {title}
      </label>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {libraries.map((library) => {
          const isSelected = selectedLibraries.includes(library.id);

          return (
            <button
              key={library.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => handleToggle(library.id)}
              aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} la bibliothèque ${library.name}`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* Checkbox visual */}
              <div
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-300'
                }`}
                aria-hidden="true"
              >
                {isSelected && <Check size={14} weight="bold" className="text-white" />}
              </div>

              {/* Library info */}
              <div className="flex-1 flex items-center gap-2 text-left">
                {library.icon && (
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: library.color || '#3B82F6' }}
                    aria-hidden="true"
                  >
                    {library.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {library.name}
                  </div>
                  {library.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {library.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedLibraries.length > 0 && (
        <div
          className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-md"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {selectedLibraries.length} bibliothèque{selectedLibraries.length > 1 ? 's' : ''} sélectionnée{selectedLibraries.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
