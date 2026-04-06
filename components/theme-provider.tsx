"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

function resolve(t: Theme): ResolvedTheme {
  if (t !== "system") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function readInitialResolved(defaultTheme: Theme): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  try {
    if (document.documentElement.classList.contains("dark")) return "dark";
    const stored = localStorage.getItem("theme") as Theme | null;
    const t = stored ?? defaultTheme;
    return resolve(t);
  } catch {
    return "light";
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    readInitialResolved(defaultTheme),
  );

  const applyTheme = useCallback(
    (t: Theme) => {
      const r = resolve(t);
      setResolvedTheme(r);
      applyClass(r);
    },
    [],
  );

  // Initialise from localStorage after mount (client-only).
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme") as Theme | null;
      const initial = stored ?? defaultTheme;
      setThemeState(initial);
      applyTheme(initial);
    } catch {}
  }, [defaultTheme, applyTheme]);

  // Re-resolve when the OS preference changes while "system" is active.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      try {
        localStorage.setItem("theme", t);
      } catch {}
      applyTheme(t);
    },
    [applyTheme],
  );

  return (
    <ThemeCtx.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}
