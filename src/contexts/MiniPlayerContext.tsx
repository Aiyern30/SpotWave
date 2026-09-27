"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type MiniPlayerContextValue = {
  isMiniPlayerOpen: boolean;
  setIsMiniPlayerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMiniPlayer: () => void;
};

const MiniPlayerContext = createContext<MiniPlayerContextValue | null>(null);

export function MiniPlayerProvider({ children }: { children: ReactNode }) {
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mini-player-open");
      if (saved === "true") {
        setIsMiniPlayerOpen(true);
      }
    } catch {}
  }, []);

  const handleSetOpen: React.Dispatch<React.SetStateAction<boolean>> = (value) => {
    setIsMiniPlayerOpen((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        localStorage.setItem("mini-player-open", String(next));
      } catch {}
      return next;
    });
  };

  const toggleMiniPlayer = () => {
    handleSetOpen((prev) => !prev);
  };

  return (
    <MiniPlayerContext.Provider
      value={{
        isMiniPlayerOpen,
        setIsMiniPlayerOpen: handleSetOpen,
        toggleMiniPlayer,
      }}
    >
      {children}
    </MiniPlayerContext.Provider>
  );
}

export const useMiniPlayer = () => {
  const context = useContext(MiniPlayerContext);
  if (!context) {
    throw new Error("useMiniPlayer must be used within MiniPlayerProvider");
  }
  return context;
};
