import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getThemeMode, getThemePreset, setThemeMode, setThemePreset, useTheme } from "../theme";

describe("Theme Controller & Presets (src/shared/lib/theme.ts)", () => {
  let mediaQueryListeners: Array<(e: { matches: boolean }) => void> = [];
  let systemPrefersDark = false;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    mediaQueryListeners = [];
    systemPrefersDark = false;

    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark") ? systemPrefersDark : !systemPrefersDark,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_event: string, callback: (e: { matches: boolean }) => void) => {
          if (_event === "change") {
            mediaQueryListeners.push(callback);
          }
        }),
        removeEventListener: vi.fn(
          (_event: string, callback: (e: { matches: boolean }) => void) => {
            mediaQueryListeners = mediaQueryListeners.filter((cb) => cb !== callback);
          },
        ),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to 'system' mode and 'warm-tactile' preset when storage is empty", () => {
    expect(getThemeMode()).toBe("system");
    expect(getThemePreset()).toBe("warm-tactile");
  });

  it("persists theme mode and updates documentElement classes", () => {
    setThemeMode("dark");
    expect(localStorage.getItem("theme-mode")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(getThemeMode()).toBe("dark");

    setThemeMode("light");
    expect(localStorage.getItem("theme-mode")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(getThemeMode()).toBe("light");
  });

  it("persists theme preset and sets data-theme attribute on documentElement", () => {
    setThemePreset("editorial-slate");
    expect(localStorage.getItem("theme-preset")).toBe("editorial-slate");
    expect(document.documentElement.getAttribute("data-theme")).toBe("editorial-slate");
    expect(getThemePreset()).toBe("editorial-slate");

    setThemePreset("neo-brutalist");
    expect(localStorage.getItem("theme-preset")).toBe("neo-brutalist");
    expect(document.documentElement.getAttribute("data-theme")).toBe("neo-brutalist");
    expect(getThemePreset()).toBe("neo-brutalist");
  });

  it("resolves 'system' mode based on matchMedia preference", () => {
    systemPrefersDark = true;
    setThemeMode("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    systemPrefersDark = false;
    setThemeMode("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("reactively updates state in useTheme hook", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.mode).toBe("system");
    expect(result.current.preset).toBe("warm-tactile");

    act(() => {
      result.current.setMode("dark");
    });
    expect(result.current.mode).toBe("dark");
    expect(result.current.resolvedMode).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setPreset("editorial-slate");
    });
    expect(result.current.preset).toBe("editorial-slate");
    expect(document.documentElement.getAttribute("data-theme")).toBe("editorial-slate");

    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.mode).toBe("light");
    expect(result.current.resolvedMode).toBe("light");
  });
});
