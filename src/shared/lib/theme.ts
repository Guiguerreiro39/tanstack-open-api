import { useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ThemePreset = "warm-tactile" | "editorial-slate" | "neo-brutalist";

export const THEME_MODE_KEY = "theme-mode";
export const THEME_PRESET_KEY = "theme-preset";
export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const DEFAULT_THEME_PRESET: ThemePreset = "warm-tactile";

export const THEME_PRESETS: ReadonlyArray<{
  readonly id: ThemePreset;
  readonly label: string;
  readonly description: string;
}> = [
  {
    id: "warm-tactile",
    label: "Warm Tactile Studio",
    description: "Terracotta, sage & parchment with offset tactile elevation",
  },
  {
    id: "editorial-slate",
    label: "Editorial Slate",
    description: "Cool slate, indigo & emerald with diffuse elevation",
  },
  {
    id: "neo-brutalist",
    label: "Neo Brutalist",
    description: "High-contrast cobalt, citron & crisp hard shadows",
  },
];

type ThemeListener = () => void;
const listeners = new Set<ThemeListener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getThemeMode(): ThemeMode {
  if (!isBrowser()) return DEFAULT_THEME_MODE;
  const stored = localStorage.getItem(THEME_MODE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return DEFAULT_THEME_MODE;
}

export function getThemePreset(): ThemePreset {
  if (!isBrowser()) return DEFAULT_THEME_PRESET;
  const stored = localStorage.getItem(THEME_PRESET_KEY);
  if (stored === "warm-tactile" || stored === "editorial-slate" || stored === "neo-brutalist") {
    return stored;
  }
  return DEFAULT_THEME_PRESET;
}

export function resolveThemeMode(mode: ThemeMode = getThemeMode()): "light" | "dark" {
  if (!isBrowser()) return "light";
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(
  mode: ThemeMode = getThemeMode(),
  preset: ThemePreset = getThemePreset(),
): void {
  if (!isBrowser()) return;

  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.setAttribute("data-theme", preset);
  root.style.colorScheme = resolved;
}

export function setThemeMode(mode: ThemeMode): void {
  if (!isBrowser()) return;
  localStorage.setItem(THEME_MODE_KEY, mode);
  applyTheme(mode, getThemePreset());
  notify();
}

export function setThemePreset(preset: ThemePreset): void {
  if (!isBrowser()) return;
  localStorage.setItem(THEME_PRESET_KEY, preset);
  applyTheme(getThemeMode(), preset);
  notify();
}

function subscribe(callback: ThemeListener): () => void {
  listeners.add(callback);

  if (isBrowser()) {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_MODE_KEY || event.key === THEME_PRESET_KEY) {
        applyTheme();
        callback();
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMedia = () => {
      if (getThemeMode() === "system") {
        applyTheme();
        callback();
      }
    };

    window.addEventListener("storage", handleStorage);
    mediaQuery.addEventListener("change", handleMedia);

    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", handleStorage);
      mediaQuery.removeEventListener("change", handleMedia);
    };
  }

  return () => {
    listeners.delete(callback);
  };
}

interface ThemeSnapshot {
  mode: ThemeMode;
  preset: ThemePreset;
  resolvedMode: "light" | "dark";
}

let cachedSnapshot: ThemeSnapshot = {
  mode: DEFAULT_THEME_MODE,
  preset: DEFAULT_THEME_PRESET,
  resolvedMode: "light",
};

function getSnapshot(): ThemeSnapshot {
  const mode = getThemeMode();
  const preset = getThemePreset();
  const resolvedMode = resolveThemeMode(mode);

  if (
    cachedSnapshot.mode !== mode ||
    cachedSnapshot.preset !== preset ||
    cachedSnapshot.resolvedMode !== resolvedMode
  ) {
    cachedSnapshot = { mode, preset, resolvedMode };
  }
  return cachedSnapshot;
}

function getServerSnapshot(): ThemeSnapshot {
  return {
    mode: DEFAULT_THEME_MODE,
    preset: DEFAULT_THEME_PRESET,
    resolvedMode: "light",
  };
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(snapshot.mode, snapshot.preset);
  }, [snapshot.mode, snapshot.preset]);

  const toggleMode = () => {
    const nextMode: ThemeMode = snapshot.resolvedMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
  };

  return {
    mode: snapshot.mode,
    preset: snapshot.preset,
    resolvedMode: snapshot.resolvedMode,
    setMode: setThemeMode,
    setPreset: setThemePreset,
    toggleMode,
  };
}
