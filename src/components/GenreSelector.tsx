import { useState } from "react";
import { Lightbulb } from "phosphor-react";
import {
  categorySuggestions,
  CURATED_GENRES,
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
  const isSameGenre = (first: string, second: string) =>
    first.localeCompare(second, "fr", { sensitivity: "base" }) === 0;
  const existingGenres = mergeGenreOptions(usedGenres).filter(
    (genre) => !CURATED_GENRES.some((curated) => isSameGenre(curated, genre)),
  );
  const categoryOptions = categorySuggestions(suggestedCategories).filter(
    (category) =>
      !existingGenres.some((existing) => isSameGenre(existing, category)),
  );
  const selectableGenres = [
    ...CURATED_GENRES,
    ...existingGenres,
    ...categoryOptions,
  ];
  const matchingGenre = selectableGenres.find((genre) =>
    isSameGenre(genre, value),
  );
  const [customMode, setCustomMode] = useState(
    Boolean(value && !matchingGenre),
  );
  const suggestions = categoryOptions.slice(0, 4);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "__custom__") {
      setCustomMode(true);
      onChange("");
      return;
    }

    setCustomMode(false);
    onChange(selectedValue);
  };

  return (
    <div className="space-y-2">
      <select
        id={id}
        value={customMode ? "__custom__" : matchingGenre || ""}
        onChange={(event) => handleSelect(event.target.value)}
        className="kodeks-field"
      >
        <option value="">Choisir un genre…</option>
        <optgroup label="Genres principaux">
          {CURATED_GENRES.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </optgroup>
        {existingGenres.length > 0 && (
          <optgroup label="Déjà utilisés">
            {existingGenres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </optgroup>
        )}
        {categoryOptions.length > 0 && (
          <optgroup label="Suggestions de la fiche">
            {categoryOptions.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </optgroup>
        )}
        <option value="__custom__">Créer un genre personnalisé…</option>
      </select>

      {customMode && (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="kodeks-field"
          placeholder="Nom du genre personnalisé"
          autoComplete="new-password"
          data-1p-ignore="true"
          data-lpignore="true"
          autoFocus
        />
      )}

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
                onClick={() => {
                  setCustomMode(false);
                  onChange(suggestion);
                }}
                className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Choisissez une proposition ou créez explicitement un genre personnalisé.
      </p>
    </div>
  );
}
