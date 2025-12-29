"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  User,
  ArrowLeft,
  Loader2,
  Music,
  Sparkles,
  Play,
} from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Input,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
} from "@/components/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import type { Artist } from "@/lib/types";

const ArtistQuizPage = () => {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [loadingFollowed, setLoadingFollowed] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiArtists, setAiArtists] = useState<Artist[]>([]);

  // Initialize Token
  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleAiRecommendation = async () => {
    if (!token) return;
    setIsAiLoading(true);
    try {
      // 1. Get names from Gemini
      const response = await fetch("/api/ai-recommendations", {
        method: "POST",
        body: JSON.stringify({
          type: "artist",
          context:
            followedArtists.length > 0
              ? `I like artists like ${followedArtists
                  .slice(0, 3)
                  .map((a) => a.name)
                  .join(", ")}`
              : "Popular global and local hits",
        }),
      });

      const { recommendations, error } = await response.json();
      if (error) throw new Error(error);

      // 2. Search each on Spotify to get real objects
      const fetchedAiArtists: Artist[] = [];
      for (const name of recommendations) {
        const searchRes = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            name
          )}&type=artist&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (searchRes.ok) {
          const data = await searchRes.json();
          const artist = data.artists.items[0];
          if (artist) {
            fetchedAiArtists.push({
              id: artist.id,
              name: artist.name,
              image: artist.images?.[0]?.url,
              genres: artist.genres,
              followers: artist.followers?.total,
            });
          }
        }
      }
      setAiArtists(fetchedAiArtists);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fetch Followed Artists
  useEffect(() => {
    const getFollowedArtists = async () => {
      if (!token) return;
      try {
        setLoadingFollowed(true);
        const artists = await fetchFollowedArtists(token);
        setFollowedArtists(artists || []);
      } catch (error) {
        console.error("Error fetching followed artists:", error);
      } finally {
        setLoadingFollowed(false);
      }
    };

    getFollowedArtists();
  }, [token]);

  // Handle Search
  useEffect(() => {
    const searchArtists = async () => {
      if (!searchQuery.trim() || !token) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            searchQuery
          )}&type=artist&limit=5`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const mappedArtists: Artist[] = (data.artists.items || []).map(
            (item: any) => ({
              id: item.id,
              name: item.name,
              image: item.images?.[0]?.url,
              genres: item.genres,
              followers: item.followers?.total,
            })
          );
          setSearchResults(mappedArtists);
        }
      } catch (error) {
        console.error("Error searching artists:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchArtists, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, token]);

  const handleArtistSelect = (artist: Artist) => {
    router.push(
      `/Games/artist-quiz/${artist.id}?name=${encodeURIComponent(artist.name)}`
    );
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto w-full space-y-12 px-4 sm:px-0">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600">
            Artist Quiz
          </h1>
          <p className="text-zinc-400 text-sm md:text-lg max-w-2xl mx-auto">
            Test your knowledge! Select an artist from your library or search
            for anyone to start the challenge.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto relative z-20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              placeholder="Search for any artist..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay to allow click
              className="w-full h-14 pl-12 bg-zinc-900/80 border-zinc-700 text-lg text-white rounded-xl focus-visible:ring-green-500 placeholder:text-zinc-500 backdrop-blur-sm"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin bg-brand" />
              </div>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown &&
            (searchQuery.trim().length > 0 || searchResults.length > 0) && (
              <div className="absolute w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-50">
                {searchResults.length > 0 ? (
                  searchResults.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => handleArtistSelect(artist)}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors cursor-pointer group"
                    >
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex-shrink-0">
                        <AvatarImage
                          src={artist.image}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-lg bg-zinc-800 text-zinc-400">
                          {artist.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium group-hover:bg-brand transition-colors truncate">
                          {artist.name}
                        </h4>
                        <p className="text-xs text-zinc-500 capitalize truncate">
                          {artist.genres?.[0] || "Artist"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-zinc-500">
                    {isSearching ? "Searching..." : "No artists found"}
                  </div>
                )}
              </div>
            )}
        </div>

        {/* AI Recommendations Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
            <div className="flex items-center gap-3 text-xl md:text-2xl font-semibold text-white">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
              <h2>AI Picks For You</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiRecommendation}
              disabled={isAiLoading}
              className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2 rounded-full px-4 w-fit"
            >
              {isAiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {aiArtists.length > 0 ? "Refresh Picks" : "Get AI Suggestions"}
            </Button>
          </div>

          {aiArtists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {aiArtists.map((artist) => (
                <Card
                  key={artist.id}
                  onClick={() => handleArtistSelect(artist)}
                  className="bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/80 transition-all cursor-pointer group/ai overflow-hidden"
                >
                  <CardContent className="p-4 flex flex-col items-center gap-3">
                    <div className="relative w-full aspect-square rounded-full overflow-hidden">
                      <Avatar className="w-full h-full">
                        <AvatarImage
                          src={artist.image}
                          className="object-cover"
                        />
                        <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ai:opacity-100 transition-all flex items-center justify-center">
                        <div className="bg-brand text-black p-3 rounded-full shadow-xl transform scale-90 group-hover/ai:scale-100 transition-all">
                          <Play className="w-6 h-6 fill-current" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-center truncate w-full group-hover/ai:bg-brand">
                      {artist.name}
                    </h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            !isAiLoading && (
              <div className="p-8 md:p-12 text-center bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm md:text-base">
                  Let AI suggest some artists for your next quiz!
                </p>
              </div>
            )
          )}
        </div>

        {/* Following Artists Carousel */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xl md:text-2xl font-semibold text-white px-4 md:px-0">
            <Music className="w-5 h-5 md:w-6 md:h-6 bg-brand" />
            <h2>Your Following Artists</h2>
          </div>

          {loadingFollowed ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin bg-brand" />
            </div>
          ) : followedArtists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {followedArtists.map((artist) => (
                <Card
                  key={artist.id}
                  onClick={() => handleArtistSelect(artist)}
                  className="bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/80 transition-all duration-300 cursor-pointer group/card h-full overflow-hidden"
                >
                  <CardContent className="p-4 flex flex-col items-center gap-4 h-full">
                    <div className="relative w-full aspect-square rounded-full overflow-hidden shadow-lg group-hover/card:scale-105 transition-transform duration-500">
                      <Avatar className="w-full h-full">
                        <AvatarImage
                          src={artist.image}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-zinc-800 text-3xl">
                          {artist.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center">
                        <div className="bg-brand text-black p-3 rounded-full shadow-xl transform scale-90 group-hover/card:scale-100 transition-all">
                          <Play className="w-6 h-6 fill-current" />
                        </div>
                      </div>
                    </div>
                    <div className="text-center space-y-1 w-full">
                      <h3 className="font-bold text-white truncate w-full group-hover/card:bg-brand transition-colors px-1">
                        {artist.name}
                      </h3>
                      <p className="text-xs text-zinc-500 truncate w-full px-1">
                        {artist.genres?.[0] || "Artist"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800 border-dashed">
              <Music className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">
                You are not following any artists yet.
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Try searching for one above!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistQuizPage;
