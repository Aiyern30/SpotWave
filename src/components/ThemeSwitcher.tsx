"use client";

import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from "@/components/ui";

const themes = [
  { name: "Green", class: "", color: "#22c55e" }, // Default
  { name: "Blue", class: "theme-blue", color: "#3b82f6" },
  { name: "Purple", class: "theme-purple", color: "#a855f7" },
  { name: "Red", class: "theme-red", color: "#ef4444" },
  { name: "Orange", class: "theme-orange", color: "#f97316" },
  { name: "Pink", class: "theme-pink", color: "#ec4899" },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState(themes[0]);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme) {
      const theme = themes.find((t) => t.class === savedTheme) || themes[0];
      applyTheme(theme);
    }
  }, []);

  const applyTheme = (theme: (typeof themes)[0]) => {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-white border border-zinc-700/50 transition-all"
        >
          <Palette className="h-5 w-5" style={{ color: currentTheme.color }} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-zinc-900 border-zinc-800 p-2 min-w-[150px]"
      >
        <div className="text-xs font-semibold text-zinc-500 px-2 py-1 uppercase tracking-wider">
          Premium Themes
        </div>
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.class}
            onClick={() => applyTheme(theme)}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-zinc-800 cursor-pointer group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full border border-white/10"
                style={{ backgroundColor: theme.color }}
              />
              <span
                className={`text-sm ${
                  currentTheme.class === theme.class
                    ? "text-white font-medium"
                    : "text-zinc-400 group-hover:text-black"
                }`}
              >
                {theme.name}
              </span>
            </div>
            {currentTheme.class === theme.class && (
              <Check className="h-4 w-4 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
