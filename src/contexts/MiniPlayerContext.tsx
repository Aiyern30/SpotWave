"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type MiniPlayerDesign = "deck" | "card" | "pill";

export type MiniPlayerContextValue = {
  isMiniPlayerOpen: boolean;
  isPipActive: boolean;
  isPipSupported: boolean;
  pipWindow: Window | null;
  design: MiniPlayerDesign;
  setDesign: (design: MiniPlayerDesign) => void;
  setIsMiniPlayerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMiniPlayer: () => Promise<void>;
  closeMiniPlayer: () => void;
  toggleMiniPlayer: () => void;
};

const MiniPlayerContext = createContext<MiniPlayerContextValue | null>(null);

const DESIGN_STORAGE_KEY = "mini-player-design";

function copyStylesToPip(pipWin: Window) {
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    try {
      pipWin.document.head.appendChild(node.cloneNode(true));
    } catch { }
  });

  pipWin.document.documentElement.className = document.documentElement.className + " dark";
  pipWin.document.documentElement.style.cssText = document.documentElement.style.cssText;
  pipWin.document.title = "SpotWave Mini Player";

  const body = pipWin.document.body;
  body.style.backgroundColor = "#121214";
  body.style.color = "#ffffff";
  body.style.margin = "0";
  body.style.padding = "0";
  body.style.overflow = "hidden";
  body.style.userSelect = "none";
  body.style.webkitUserSelect = "none";
  body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
}

export function MiniPlayerProvider({ children }: { children: ReactNode }) {
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [design, setDesignState] = useState<MiniPlayerDesign>("deck");

  useEffect(() => {
    setIsPipSupported(
      typeof window !== "undefined" && "documentPictureInPicture" in window
    );
    try {
      const savedDesign = localStorage.getItem(DESIGN_STORAGE_KEY) as MiniPlayerDesign | null;
      if (savedDesign === "deck" || savedDesign === "card" || savedDesign === "pill") {
        setDesignState(savedDesign);
      }
    } catch { }
  }, []);

  const setDesign = useCallback((next: MiniPlayerDesign) => {
    setDesignState(next);
    try {
      localStorage.setItem(DESIGN_STORAGE_KEY, next);
    } catch { }
  }, []);

  const closeMiniPlayer = useCallback(() => {
    if (pipWindow) {
      try {
        pipWindow.close();
      } catch { }
      setPipWindow(null);
    }
    setIsMiniPlayerOpen(false);
    try {
      localStorage.setItem("mini-player-open", "false");
    } catch { }
  }, [pipWindow]);

  const openMiniPlayer = useCallback(async () => {
    if (typeof window !== "undefined" && "documentPictureInPicture" in window) {
      try {
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: 440,
          height: 150,
        });

        copyStylesToPip(pip);

        pip.addEventListener("pagehide", () => {
          setPipWindow(null);
          setIsMiniPlayerOpen(false);
          try {
            localStorage.setItem("mini-player-open", "false");
          } catch { }
        });

        setPipWindow(pip);
        setIsMiniPlayerOpen(true);
        try {
          localStorage.setItem("mini-player-open", "true");
        } catch { }
        return;
      } catch (err) {
        console.warn("Could not open Document PiP, falling back to in-page player:", err);
      }
    }

    setIsMiniPlayerOpen(true);
    try {
      localStorage.setItem("mini-player-open", "true");
    } catch { }
  }, []);

  const toggleMiniPlayer = useCallback(() => {
    if (pipWindow || isMiniPlayerOpen) {
      closeMiniPlayer();
    } else {
      void openMiniPlayer();
    }
  }, [pipWindow, isMiniPlayerOpen, closeMiniPlayer, openMiniPlayer]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pipWindow) {
        try {
          pipWindow.close();
        } catch { }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pipWindow]);

  return (
    <MiniPlayerContext.Provider
      value={{
        isMiniPlayerOpen,
        isPipActive: !!pipWindow,
        isPipSupported,
        pipWindow,
        design,
        setDesign,
        setIsMiniPlayerOpen,
        openMiniPlayer,
        closeMiniPlayer,
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