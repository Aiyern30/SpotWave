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
  const [myPlaylists, setMyPlaylists] = useState<PlaylistProps[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaylistProps[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    setToken(storedToken);
  }, []);

  // Fetch My Playlists
  useEffect(() => {
    const getMyPlaylists = async () => {
      if (!token) return;
      setLoadingMy(true);
      try {
        const data = await fetchSpotifyPlaylists(token);
        if (data) setMyPlaylists(data);
      } catch (err) {
        console.error("Failed to load my playlists", err);
      } finally {
        setLoadingMy(false);
      }
    };

    getMyPlaylists();
  }, [token]);

  // Handle Search Results Effect
  useEffect(() => {
    const getSearchResults = async () => {
      if (!searchQuery.trim() || !token) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchPlaylists(searchQuery, token, 6);
        setSearchResults(results);
      } catch (err) {
        console.error("Failed to search playlists", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(getSearchResults, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, token]);

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

      <div className="max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600">
            Playlist Quiz
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Test your ear! Search for any public playlist or select one from
            your library to start.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto relative z-30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              placeholder="Search for any playlist..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full h-14 pl-12 bg-zinc-900/80 border-zinc-700 text-lg text-white rounded-xl focus-visible:ring-green-500 placeholder:text-zinc-500 backdrop-blur-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-green-500" />
              </div>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchQuery.trim().length > 0 && (
            <div className="absolute w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto z-50">
              {searchResults.length > 0 ? (
                searchResults.map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handlePlaylistClick(playlist)}
                    className="flex items-center gap-4 p-3 hover:bg-zinc-800 transition-colors cursor-pointer group"
                  >
                    <div className="h-12 w-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                      {playlist.images?.[0]?.url ? (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ListMusic className="w-full h-full p-2 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium group-hover:text-green-400 transition-colors truncate">
                        {playlist.name}
                      </h4>
                      <p className="text-sm text-zinc-500 truncate">
                        By {playlist.owner?.display_name || "Spotify"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-zinc-500">
                  {isSearching ? "Searching..." : "No playlists found"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* My Playlists Grid */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 text-2xl font-semibold text-white">
            <User className="w-6 h-6 text-green-500" />
            <h2>Your Library Playlists</h2>
          </div>

          {loadingMy ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-zinc-900/50 animate-pulse border border-zinc-800"
                />
              ))}
            </div>
          ) : myPlaylists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {myPlaylists.map((playlist) => (
                <Card
                  key={playlist.id}
                  onClick={() => handlePlaylistClick(playlist)}
                  className="bg-zinc-900/40 border-zinc-800 overflow-hidden hover:bg-zinc-800 transition-all cursor-pointer group hover:scale-[1.02]"
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
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-green-500 text-black font-bold px-4 py-1.5 rounded-full transform scale-90 group-hover:scale-100 transition-all shadow-xl">
                          Play
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <h3 className="font-bold text-white truncate group-hover:text-green-400 transition-colors">
                        {playlist.name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {playlist.tracks?.total || 0} Tracks
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
              <ListMusic className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-lg">
                Your library is currently empty.
              </p>
              <p className="text-zinc-600 text-sm mt-1">
                Try searching for a playlist above!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistQuizPage;
