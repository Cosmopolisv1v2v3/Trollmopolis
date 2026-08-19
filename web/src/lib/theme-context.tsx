"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light" | "night";
const KEY = "cosmopolis:theme";
const ORDER: Theme[] = ["dark", "light", "night"];

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* noop */
    }
    if (stored === "light" || stored === "dark" || stored === "night") {
      queueMicrotask(() => setTheme(stored as Theme));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]);
  }, []);

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}

/** Icono y título según el tema activo (para los botones de cambio de tema). */
export function themeButtonInfo(theme: Theme): { icon: "sun" | "moon" | "bolt"; title: string } {
  switch (theme) {
    case "light":
      return { icon: "sun", title: "Tema claro — cambia a oscuro" };
    case "night":
      return { icon: "bolt", title: "Tema neón — cambia a oscuro" };
    default:
      return { icon: "moon", title: "Tema oscuro — cambia a claro" };
  }
}