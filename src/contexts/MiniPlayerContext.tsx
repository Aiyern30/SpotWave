"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type MiniPlayerDesign = "deck" | "card" | "pill" | "gradient";
export const PIP_DIMENSIONS: Record<MiniPlayerDesign, { width: number; height: number }> = {
  deck: { width: 480, height: 250 },
  gradient: { width: 380, height: 350 },
  card: { width: 372, height: 480 },
  pill: { width: 340, height: 280 },
};
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
      if (savedDesign === "deck" || savedDesign === "card" || savedDesign === "pill" || savedDesign === "gradient") {
        setDesignState(savedDesign);
      }
    } catch { }
  }, []);
  useEffect(() => {
    if (!pipWindow) return;
    const dims = PIP_DIMENSIONS[design];
    try {
      pipWindow.resizeTo(dims.width, dims.height);
    } catch { }
  }, [design, pipWindow]);

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
        const dims = PIP_DIMENSIONS[design];
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: dims.width,
          height: dims.height,
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
  }, [design]);

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