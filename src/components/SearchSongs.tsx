"use client";

import {
  Plus,
  Search,
  Music,
  Clock,
  User,
  Disc,
  Play,
  Loader2,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Badge,
  ScrollArea,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui";
import { useEffect, useState, useRef, useCallback } from "react";
import type { Artist, Track } from "@/lib/types";
import { toast } from "react-toastify";
import { analyzePlaylistGenres } from "@/utils/analyzePlaylistGenres";
import { getPlaylistRecommendations } from "@/utils/getPlaylistRecommendations";

interface SearchSongsProps {
  playlistID: string;
  refetch: (playlistID: string) => void;
}

export default function SearchSongs({ playlistID, refetch }: SearchSongsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string>("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [addingTracks, setAddingTracks] = useState<Set<string>>(new Set());
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  const [existingTrackIds, setExistingTrackIds] = useState<string[]>([]);
  const [recommendationOffset, setRecommendationOffset] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_COOLDOWN = 3000; // 3 seconds cooldown between fetches

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          searchQuery
        )}&type=track&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.tracks.items);
    } catch (error) {
      console.error("Error searching for tracks:", error);
      toast.error("Failed to search for tracks");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, token]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [handleSearch, searchQuery]);

  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      if (!token || !isSheetOpen) return;

      // Check cooldown to prevent rate limiting
      const now = Date.now();
      if (!forceRefresh && now - lastFetchTimeRef.current < FETCH_COOLDOWN) {
        console.log("Skipping fetch - cooldown period");
        return;
      }

      setIsLoadingRecommendations(true);
      lastFetchTimeRef.current = now;

      try {
        console.log("=== Fetching recommendations ===");

        // Fetch playlist tracks
        const playlistRes = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!playlistRes.ok) {
          throw new Error("Failed to fetch playlist tracks");
        }

        const playlistData = await playlistRes.json();
        console.log(
          "Fetched playlist data:",
          playlistData.items.length,
          "tracks"
        );

        // Store existing track IDs to filter duplicates
        const trackIds = playlistData.items.map((item: any) => item.track.id);
        setExistingTrackIds(trackIds);

        // Get genres and recommendations with offset for variety
        const analysis = await analyzePlaylistGenres(playlistData.items, token);
        console.log("AI Analysis:", analysis);

        const recs = await getPlaylistRecommendations(
          analysis,
          token,
          trackIds,
          recommendationOffset
        );

        console.log("Final recommendations:", recs.length);
        setRecommendedTracks(recs);

        if (recs.length === 0) {
          toast.info("No new recommendations found. Try refreshing!");
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        toast.error("Failed to load recommendations. Please try again later.");
      } finally {
        setIsLoadingRecommendations(false);
      }
    },
    [token, playlistID, isSheetOpen, recommendationOffset]
  );

  const handleRefreshRecommendations = () => {
    // Increment offset to get different recommendations
    setRecommendationOffset((prev) => prev + 10);
    fetchRecommendations(true);
  };

  // Fetch recommendations when sheet opens
  useEffect(() => {
    if (isSheetOpen && token) {
      fetchRecommendations();
    }
  }, [isSheetOpen, token, fetchRecommendations]);

  const handleAddTrackToPlaylist = async (track: Track) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setAddingTracks((prev) => new Set(prev).add(track.id));

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [track.uri],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to add track: ${response.status}`);
      }

      toast.success(`Added "${track.name}" to playlist!`);
      refetch(playlistID);

      // Remove from recommendations after adding
      setRecommendedTracks((prev) => prev.filter((t) => t.id !== track.id));
    } catch (error) {
      console.error("Error adding track to playlist:", error);
      toast.error("Failed to add track to playlist");
    } finally {
      setAddingTracks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(track.id);
        return newSet;
      });
    }
  };

  const handlePlayPreview = (
    previewUrl: string | null | undefined,
    trackId: string
  ) => {
    if (!previewUrl) {
      toast.info("No preview available for this track");
      return;
    }

    if (playingPreview === trackId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingPreview(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(previewUrl);
      audio.volume = 0.5;
      audio.play();
      audioRef.current = audio;
      setPlayingPreview(trackId);

      audio.onended = () => {
        setPlayingPreview(null);
        audioRef.current = null;
      };
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 hover:border-white/20 transition-all duration-200 hover:scale-105"
              >
                <Plus className="h-5 w-5 text-white" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-full sm:w-[500px] bg-zinc-900/95 backdrop-blur-sm border-zinc-700/50 text-white overflow-y-auto"
            >
              <SheetHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Music className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <SheetTitle className="text-white text-xl">
                      Add Songs
                    </SheetTitle>
                    <SheetDescription className="text-zinc-400">
                      Search and add tracks to your playlist
                    </SheetDescription>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search for songs, artists, or albums..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-400 focus:border-green-500 focus:ring-green-500/20"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-zinc-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Music className="h-4 w-4" />
                    <span>Found {searchResults.length} tracks</span>
                  </div>
                )}
              </SheetHeader>

              <Separator className="my-6 bg-zinc-700/50" />

              <ScrollArea className="flex-1 -mx-6 px-6 h-[calc(100vh-250px)]">
                {/* Recommended Songs Section */}
                {!searchQuery.trim() && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Sparkles className="h-4 w-4 text-green-400" />
                        </div>
                        <h4 className="text-green-400 font-semibold text-lg">
                          Recommended for you
                        </h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshRecommendations}
                        disabled={isLoadingRecommendations}
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${
                            isLoadingRecommendations ? "animate-spin" : ""
                          }`}
                        />
                        Refresh
                      </Button>
                    </div>

                    {isLoadingRecommendations ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                          <p className="text-sm text-zinc-400">
                            Finding perfect matches...
                          </p>
                        </div>
                      </div>
                    ) : recommendedTracks.length > 0 ? (
                      <div className="space-y-1">
                        {recommendedTracks.map((track) => (
                          <div
                            key={track.id}
                            className="group flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-all duration-200"
                          >
                            <div className="relative">
                              <Avatar className="h-12 w-12 rounded-md">
                                <AvatarImage
                                  src={
                                    track.album.images[2]?.url ||
                                    track.album.images[0]?.url
                                  }
                                  alt={track.album.name}
                                />
                                <AvatarFallback className="bg-zinc-700 text-zinc-300 rounded-md">
                                  <Disc className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>

                              {track.preview_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handlePlayPreview(
                                      track.preview_url,
                                      track.id
                                    )
                                  }
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md"
                                >
                                  <Play
                                    className={`h-4 w-4 text-white ${
                                      playingPreview === track.id
                                        ? "animate-pulse"
                                        : ""
                                    }`}
                                  />
                                </Button>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white truncate">
                                  {track.name}
                                </h4>
                                {track.explicit && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs px-1.5 py-0.5"
                                  >
                                    E
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-sm text-zinc-400 truncate">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {track.artists
                                    .map((artist: Artist) => artist.name)
                                    .join(", ")}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-zinc-500">
                                <span className="truncate">
                                  {track.album.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {formatDuration(track.duration_ms)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <Button
                              onClick={() => handleAddTrackToPlaylist(track)}
                              disabled={addingTracks.has(track.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              {addingTracks.has(track.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-zinc-800/50 rounded-full mb-4">
                          <Sparkles className="h-8 w-8 text-zinc-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">
                          No recommendations yet
                        </h3>
                        <p className="text-sm text-zinc-400 max-w-sm">
                          We'll find perfect songs based on your playlist. Try
                          refreshing!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Search Results */}
                {searchQuery.trim() && (
                  <div className="space-y-1">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                          <p className="text-sm text-zinc-400">
                            Searching for tracks...
                          </p>
                        </div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((track) => (
                        <div
                          key={track.id}
                          className="group flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-all duration-200"
                        >
                          <div className="relative">
                            <Avatar className="h-12 w-12 rounded-md">
                              <AvatarImage
                                src={
                                  track.album.images[2]?.url ||
                                  track.album.images[0]?.url
                                }
                                alt={track.album.name}
                              />
                              <AvatarFallback className="bg-zinc-700 text-zinc-300 rounded-md">
                                <Disc className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>

                            {track.preview_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handlePlayPreview(track.preview_url, track.id)
                                }
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md"
                              >
                                <Play
                                  className={`h-4 w-4 text-white ${
                                    playingPreview === track.id
                                      ? "animate-pulse"
                                      : ""
                                  }`}
                                />
                              </Button>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white truncate">
                                {track.name}
                              </h4>
                              {track.explicit && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0.5"
                                >
                                  E
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-sm text-zinc-400 truncate">
                              <User className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {track.artists
                                  .map((artist: Artist) => artist.name)
                                  .join(", ")}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span className="truncate">
                                {track.album.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(track.duration_ms)}</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleAddTrackToPlaylist(track)}
                            disabled={addingTracks.has(track.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            {addingTracks.has(track.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-zinc-800/50 rounded-full mb-4">
                          <Search className="h-8 w-8 text-zinc-400" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">
                          No results found
                        </h3>
                        <p className="text-sm text-zinc-400 max-w-sm">
                          Try searching with different keywords or check your
                          spelling.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Add songs to playlist</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
