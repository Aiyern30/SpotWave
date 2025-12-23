"use client";

import { PlayerProvider } from "@/contexts/PlayerContext";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Toaster } from "@/components/ui/Toaster";
import AuthProvider from "@/app/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlayerProvider>
        {children}
        <MusicPlayer />
        <Toaster />
      </PlayerProvider>
    </AuthProvider>
  );
}
