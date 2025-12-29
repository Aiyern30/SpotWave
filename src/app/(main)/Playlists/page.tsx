"use client";

import { Music } from "lucide-react";
import PublicLibrary from "../Profile/PublicLibrary";

export default function PlaylistsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
            <Music className="h-6 w-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Your Playlists
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Manage and explore all your curated collections.
            </p>
          </div>
        </div>
      </div>

      {/* Reusing PublicLibrary component to show user's playlists */}
      <div className="bg-zinc-900/10 rounded-2xl p-0">
        <PublicLibrary />
      </div>
    </div>
  );
}
