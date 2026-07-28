import { useEffect, useRef, useState } from "react";
import { CaretDown, Check, Desktop, Moon, Sun } from "phosphor-react";
import {
  useTheme,
  type ResolvedTheme,
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

function getCurrentIcon(
  preference: ThemePreference,
  resolvedTheme: ResolvedTheme,
) {
  if (preference === "system") return Desktop;
  return resolvedTheme === "dark" ? Moon : Sun;
}

export default function ThemeSelector() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const CurrentIcon = getCurrentIcon(preference, resolvedTheme);
  const selectedOption = options.find((option) => option.value === preference);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectTheme = (nextPreference: ThemePreference) => {
    setPreference(nextPreference);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        aria-label={`Apparence : ${selectedOption?.label ?? "Automatique"}`}
        aria-expanded={isOpen}
        aria-controls="theme-selector-menu"
        aria-haspopup="dialog"
        title={`Apparence : ${selectedOption?.label ?? "Automatique"}`}
      >
        <CurrentIcon size={19} weight="bold" aria-hidden="true" />
        <CaretDown size={11} weight="bold" className="hidden sm:block" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id="theme-selector-menu"
          role="dialog"
          aria-label="Choisir l’apparence"
          className="absolute right-0 z-[100] mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-sm font-semibold text-gray-900">Apparence</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Thème actuel : {resolvedTheme === "dark" ? "sombre" : "clair"}
            </p>
          </div>

          <div role="radiogroup" aria-label="Thème de l’application" className="space-y-1">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = preference === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => selectTheme(option.value)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Icon size={20} weight={isSelected ? "fill" : "regular"} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.description}</span>
                  </span>
                  {isSelected && (
                    <Check size={17} weight="bold" className="text-blue-600" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
