"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "book-the-lakehouse-theme";
const THEME_CHANGE_EVENT = "book-the-lakehouse-theme-change";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(stored) ? stored : "system";
}

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  media.addEventListener("change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    media.removeEventListener("change", onStoreChange);
  };
}

function resolvedTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== "system") return mode;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function getResolvedTheme(): ResolvedTheme {
  return resolvedTheme(getStoredMode());
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<ResolvedTheme>(
    subscribe,
    getResolvedTheme,
    () => "light",
  );
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.add("theme-ready");
    return () => document.documentElement.classList.remove("theme-ready");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme: ResolvedTheme = isDark ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      data-theme-state={theme}
      className={[
        "group relative grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-full border border-rule bg-paper text-ink shadow-control transition-[background-color,border-color,transform] duration-300 ease-out hover:border-ink data-[theme-state=dark]:hover:bg-soft active:scale-95",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "theme-toggle-orb absolute inset-1 rounded-full bg-ink",
          isDark
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-[38px] scale-75 opacity-0",
        ].join(" ")}
      />
      <Sun
        aria-hidden
        size={15}
        strokeWidth={2.25}
        className={[
          "theme-toggle-icon absolute",
          isDark
            ? "-translate-y-[24px] rotate-180 scale-80 text-paper opacity-0 [filter:blur(5px)]"
            : "translate-y-0 rotate-0 scale-100 text-ink opacity-100 [filter:blur(0)]",
        ].join(" ")}
      />
      <Moon
        aria-hidden
        size={15}
        strokeWidth={2.25}
        className={[
          "theme-toggle-icon absolute",
          isDark
            ? "translate-y-0 rotate-0 scale-100 text-paper opacity-100 [filter:blur(0)]"
            : "translate-y-[38px] -rotate-180 scale-80 text-ink opacity-0 [filter:blur(5px)]",
        ].join(" ")}
      />
    </button>
  );
}
