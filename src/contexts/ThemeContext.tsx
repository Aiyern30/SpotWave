"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export const themes = [
  { name: "Green", class: "", color: "#22c55e" }, // Default
  { name: "Blue", class: "theme-blue", color: "#3b82f6" },
  { name: "Purple", class: "theme-purple", color: "#a855f7" },
  { name: "Red", class: "theme-red", color: "#ef4444" },
  { name: "Orange", class: "theme-orange", color: "#f97316" },
  { name: "Pink", class: "theme-pink", color: "#ec4899" },
] as const;

export type Theme = (typeof themes)[number];

interface ThemeContextType {
  currentTheme: Theme;
  setColorTheme: (themeClass: string) => void;
  themes: typeof themes;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  // Initial load from localStorage
  useEffect(() => {
    const savedThemeClass = localStorage.getItem("app-theme");
    if (savedThemeClass !== null) {
      const theme =
        themes.find((t) => t.class === savedThemeClass) || themes[0];
      applyTheme(theme);
    }
  }, []);

  const applyTheme = (theme: Theme) => {
    const doc = document.documentElement;

    // Remove all theme classes
    themes.forEach((t) => {
      if (t.class) doc.classList.remove(t.class);
    });

    // Add new theme class
    if (theme.class) {
      doc.classList.add(theme.class);
    }

    setCurrentTheme(theme);
    localStorage.setItem("app-theme", theme.class);
  };

  const setColorTheme = (themeClass: string) => {
    const theme = themes.find((t) => t.class === themeClass) || themes[0];
    applyTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setColorTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
