"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  ListMusic,
  ArrowLeft,
  RefreshCw,
  Globe,
  User,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { fetchSpotifyPlaylists } from "@/utils/Songs/fetchSpotifyPlaylists";
import { searchPlaylists } from "@/utils/searchPlaylists";
import { PlaylistProps } from "@/lib/types";

const PlaylistQuizPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "my">("my");
  const [playlists, setPlaylists] = useState<PlaylistProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
      loadPlaylists();
    }
  }, [token, activeTab, searchQuery]);

  const loadPlaylists = async () => {
    if (!token) return;
    setLoading(true);

    try {
      if (activeTab === "my") {
        const data = await fetchSpotifyPlaylists(token);
        if (data) setPlaylists(data);
      } else {
        // "all" tab - search mode
        if (searchQuery.trim()) {
          const results = await searchPlaylists(searchQuery, token);
          setPlaylists(results);
        } else {
          setPlaylists([]); // Clear if no query
        }
      }
    } catch (err) {
      console.error("Failed to load playlists", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistClick = (playlist: PlaylistProps) => {
    router.push(
      `/Games/playlist-quiz/${playlist.id}?name=${encodeURIComponent(
        playlist.name
      )}`
    );
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-black/50 p-6 md:p-12 space-y-8">
      <Link
        href="/Games"
        className="text-zinc-400 hover:text-white flex items-center gap-2 w-fit transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Games
      </Link>

      <div className="max-w-5xl mx-auto w-full space-y-10">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">
              Select Your Playlist
            </h1>
            <p className="text-zinc-400 text-lg">
              Search for playlists or choose from your library.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-zinc-900/80 rounded-lg border border-zinc-800">
              <button
                onClick={() => {
                  setActiveTab("my");
                  setSearchQuery("");
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "my"
                    ? "bg-green-500 text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <User className="w-4 h-4" />
                My Playlists
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "all"
                    ? "bg-green-500 text-black shadow-lg"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Globe className="w-4 h-4" />
                Search All
              </button>
            </div>
          </div>
        </div>

        {activeTab === "all" && (
          <div className="relative animate-in fade-in slide-in-from-top-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              placeholder="Search for playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 bg-zinc-900/50 border-zinc-700 text-lg text-white rounded-xl focus-visible:ring-green-500 placeholder:text-zinc-500"
            />
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xl font-semibold text-white">
            <ListMusic className="w-6 h-6 text-green-500" />
            <h2>{activeTab === "my" ? "My Collection" : "Search Results"}</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
            </div>
          ) : playlists?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {playlists.map((playlist) => (
                <Card
                  key={playlist.id}
                  onClick={() => handlePlaylistClick(playlist)}
                  className="bg-zinc-800/40 border-zinc-800 overflow-hidden hover:bg-zinc-800 transition-all cursor-pointer group hover:scale-[1.02]"
                >
                  <CardContent className="p-0">
                    <div className="aspect-square w-full bg-zinc-800 relative">
                      {playlist.images?.[0]?.url ? (
                        <div
                          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                          style={{
                            backgroundImage: `url(${playlist.images[0].url})`,
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                          <ListMusic className="w-16 h-16 text-zinc-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ListMusic className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <h3 className="font-bold text-white truncate">
                        {playlist.name}
                      </h3>
                      <p className="text-sm text-zinc-400 line-clamp-1">
                        By {playlist.owner?.display_name || "Spotify"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {playlist.tracks?.total || 0} tracks
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-zinc-500">
              {activeTab === "all" && !searchQuery
                ? "Type to search for playlists..."
                : "No playlists found."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistQuizPage;
