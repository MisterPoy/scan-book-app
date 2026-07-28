import { Check, Desktop, Moon, Sun } from "phosphor-react";
import {
  useTheme,
  type ThemePreference,
} from "../theme/themeContext";

const options: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Desktop;
}> = [
  {
    value: "system",
    label: "Automatique",
    description: "Suit votre appareil",
    icon: Desktop,
  },
  {
    value: "light",
    label: "Clair",
    description: "Toujours lumineux",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Sombre",
    description: "Confort nocturne",
    icon: Moon,
  },
];

export default function ThemeSelector() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <section aria-labelledby="appearance-title">
      <div className="mb-4">
        <h3 id="appearance-title" className="text-lg font-semibold text-gray-900">
          Apparence
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Choisissez l’ambiance de lecture qui vous convient.
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">Thème de l’application</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = preference === option.value;

            return (
              <label
                key={option.value}
                className={`theme-choice relative flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-3 py-4 text-center transition-all ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-100"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="theme-preference"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => setPreference(option.value)}
                  className="sr-only"
                />
                {isSelected && (
                  <span className="absolute right-2 top-2 rounded-full bg-blue-600 p-0.5 text-white">
                    <Check size={12} weight="bold" aria-hidden="true" />
                  </span>
                )}
                <Icon size={26} weight={isSelected ? "fill" : "regular"} aria-hidden="true" />
                <span className="mt-2 text-sm font-semibold">{option.label}</span>
                <span className="mt-0.5 text-xs text-gray-500">{option.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-3 text-xs text-gray-500" aria-live="polite">
        {preference === "system"
          ? `Mode automatique actif : l’appareil utilise actuellement le thème ${
              resolvedTheme === "dark" ? "sombre" : "clair"
            }.`
          : `Le thème ${preference === "dark" ? "sombre" : "clair"} est forcé sur cet appareil.`}
      </p>
    </section>
  );
}
