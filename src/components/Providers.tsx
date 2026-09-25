"use client";

import { AudioCaptureProvider } from "@/contexts/AudioCaptureContext";
import { useState } from "react";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MusicPlayer } from "@/components/MusicPlayer";
import { FullScreenPlayer } from "@/components/FullScreenPlayer";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/app/AuthProvider";
import InQueueWindow from "@/components/InQueueWindow";
import { FullScreenPlayerProvider } from "@/contexts/FullScreenPlayerContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider>
        <PlayerProvider>
          <AudioCaptureProvider>
          <FullScreenPlayerProvider
            value={{ isFullScreenOpen, setIsFullScreenOpen }}
          >
            <MusicPlayer
              onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
              onToggleFullScreen={() => setIsFullScreenOpen((prev) => !prev)}
            />
            <FullScreenPlayer
              isOpen={isFullScreenOpen}
              onClose={() => setIsFullScreenOpen(false)}
            />
            <InQueueWindow
              isOpen={isQueueOpen}
              onClose={() => setIsQueueOpen(false)}
            />
            <Toaster position="top-right" richColors />
            {children}
          </FullScreenPlayerProvider>
          </AudioCaptureProvider>
        </PlayerProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
