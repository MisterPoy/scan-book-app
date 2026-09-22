import { Lightbulb } from "phosphor-react";
import {
  categorySuggestions,
  mergeGenreOptions,
} from "../utils/genreOptions";

interface GenreSelectorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  usedGenres?: string[];
  suggestedCategories?: string[];
}

export default function GenreSelector({
  id,
  value,
  onChange,
  usedGenres = [],
  suggestedCategories = [],
}: GenreSelectorProps) {
  const options = mergeGenreOptions(usedGenres, suggestedCategories);
  const suggestions = categorySuggestions(suggestedCategories).slice(0, 4);
  const listId = `${id}-options`;

  return (
    <div className="space-y-2">
      <input
        id={id}
        type="text"
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="kodeks-field"
        placeholder="Choisir ou créer un genre…"
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((genre) => (
          <option key={genre} value={genre} />
        ))}
      </datalist>

      {suggestions.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-800">
            <Lightbulb size={14} aria-hidden="true" />
            Suggestions de la fiche
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onChange(suggestion)}
                className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Sélectionnez une proposition ou saisissez librement votre propre genre.
      </p>
    </div>
  );
}
