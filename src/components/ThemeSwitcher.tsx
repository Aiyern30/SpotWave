"use client";

import { Palette, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from "@/components/ui";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeSwitcher() {
  const { currentTheme, setColorTheme, themes } = useTheme();

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
            onClick={() => setColorTheme(theme.class)}
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
                    : "text-zinc-400"
                }`}
              >
                {theme.name}
              </span>
            </div>
            {currentTheme.class === theme.class && (
              <Check className="h-4 w-4 text-brand" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
