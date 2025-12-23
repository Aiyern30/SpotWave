"use client";

import { useState } from "react";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Toaster } from "@/components/ui/Toaster";
import AuthProvider from "@/app/AuthProvider";
import InQueueWindow from "@/components/InQueueWindow";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  return (
    <AuthProvider>
      <PlayerProvider>
        {children}
        <MusicPlayer onToggleQueue={() => setIsQueueOpen((prev) => !prev)} />
        <InQueueWindow
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
        />
        <Toaster />
      </PlayerProvider>
    </AuthProvider>
  );
}
