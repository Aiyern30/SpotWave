"use client";

import { useState } from "react";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { MusicPlayer } from "@/components/MusicPlayer";
import { FullScreenPlayer } from "@/components/FullScreenPlayer";
import { Toaster } from "@/components/ui/Toaster";
import AuthProvider from "@/app/AuthProvider";
import InQueueWindow from "@/components/InQueueWindow";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  return (
    <AuthProvider>
      <PlayerProvider>
        {children}
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
        <Toaster />
      </PlayerProvider>
    </AuthProvider>
  );
}
