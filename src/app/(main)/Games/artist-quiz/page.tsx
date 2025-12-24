"use client";

import React, { useEffect, useState } from "react";
import { Search, User, ArrowLeft, Loader2, Music } from "lucide-react";
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

  // Initialize Token
  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

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
            Artist Quiz
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
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
                <Loader2 className="h-5 w-5 animate-spin text-green-500" />
              </div>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown &&
            (searchQuery.trim().length > 0 || searchResults.length > 0) && (
              <div className="absolute w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => handleArtistSelect(artist)}
                      className="flex items-center gap-4 p-3 hover:bg-zinc-800 transition-colors cursor-pointer group"
                    >
                      <Avatar className="h-12 w-12 rounded-lg">
                        <AvatarImage
                          src={artist.image}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-lg bg-zinc-800 text-zinc-400">
                          {artist.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="text-white font-medium group-hover:text-green-400 transition-colors">
                          {artist.name}
                        </h4>
                        <p className="text-sm text-zinc-500 capitalize">
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

        {/* Following Artists Carousel */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-2xl font-semibold text-white px-4 md:px-0">
            <User className="w-6 h-6 text-green-500" />
            <h2>Your Following Artists</h2>
          </div>

          {loadingFollowed ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : followedArtists.length > 0 ? (
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full relative group"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {followedArtists.map((artist) => (
                  <CarouselItem
                    key={artist.id}
                    className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                  >
                    <Card
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
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-semibold bg-green-500 px-4 py-1 rounded-full transform scale-90 group-hover/card:scale-100 transition-transform">
                              Start Quiz
                            </span>
                          </div>
                        </div>
                        <div className="text-center space-y-1">
                          <h3 className="font-bold text-white truncate w-full group-hover/card:text-green-400 transition-colors">
                            {artist.name}
                          </h3>
                          <p className="text-xs text-zinc-500 truncate w-full max-w-[150px]">
                            {artist.genres?.[0] || "Artist"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-4 bg-black/50 border-none text-white hover:bg-green-500 hover:text-black" />
              <CarouselNext className="hidden md:flex -right-4 bg-black/50 border-none text-white hover:bg-green-500 hover:text-black" />
            </Carousel>
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
