import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeSelector from "../components/ThemeSelector";
import { ThemeProvider } from "./ThemeProvider";
import { themeStorageKey } from "./themeContext";

function installMatchMedia(initiallyDark: boolean) {
  let matches = initiallyDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQuery = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

  return (isDark: boolean) => {
    matches = isDark;
    const event = { matches: isDark, media: mediaQuery.media } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  };
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
    document.head.innerHTML = '<meta name="theme-color" content="#3B82F6">';
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses the system preference by default", () => {
    installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    expect(screen.getByRole("radio", { name: /Automatique/i })).toBeChecked();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("persists and applies the dark preference", () => {
    installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Sombre/i }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#0B1120",
    );
  });

  it("follows system changes only in automatic mode", () => {
    const changeSystemTheme = installMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>,
    );

    act(() => changeSystemTheme(true));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    fireEvent.click(screen.getByRole("radio", { name: /Clair/i }));
    act(() => changeSystemTheme(false));
    act(() => changeSystemTheme(true));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
