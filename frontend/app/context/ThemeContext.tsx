"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "nestera-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function isResolvedTheme(value: string | null | undefined): value is ResolvedTheme {
  return value === "light" || value === "dark";
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}

function readInitialTheme(): Theme {
  if (typeof document === "undefined") {
    return "system";
  }

  const fromDataset = document.documentElement.dataset.themePreference;
  if (isTheme(fromDataset)) {
    return fromDataset;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function readInitialResolvedTheme(theme: Theme): ResolvedTheme {
  if (typeof document === "undefined") {
    return "dark";
  }

  const fromDataset = document.documentElement.dataset.theme;
  if (isResolvedTheme(fromDataset)) {
    return fromDataset;
  }

  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: Theme, resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.themePreference = theme;
  root.dataset.theme = resolvedTheme;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    readInitialResolvedTheme(readInitialTheme())
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);

    const syncTheme = () => {
      const nextResolvedTheme = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(nextResolvedTheme);
      applyTheme(theme, nextResolvedTheme);

      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
    };

    syncTheme();

    const handleChange = () => {
      if (theme === "system") {
        syncTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const activeTheme = currentTheme === "system" ? getSystemTheme() : currentTheme;
      return activeTheme === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [resolvedTheme, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

export { THEME_STORAGE_KEY };
