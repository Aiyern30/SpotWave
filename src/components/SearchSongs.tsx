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
  Wand2,
  ListMusic,
  CheckCircle2,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
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
  const [activeTab, setActiveTab] = useState("search");
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [genreList, setGenreList] = useState<string[]>([]);
  const [aiRecTracks, setAiRecTracks] = useState<Track[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAddingAll, setIsAddingAll] = useState(false);

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

  // Fetch recommendations and genres when sheet opens
  useEffect(() => {
    if (isSheetOpen && token) {
      fetchRecommendations();
      fetchGenres();
    }
  }, [isSheetOpen, token, fetchRecommendations]);

  const fetchGenres = async () => {
    if (!token) return;
    try {
      const response = await fetch(
        "https://api.spotify.com/v1/recommendations/available-genre-seeds",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setGenreList(data.genres);
      }
    } catch (error) {
      console.error("Error fetching genres:", error);
    }
  };

  const searchSpotifyTrack = async (song: string, artist: string) => {
    try {
      const query = `track:${song} artist:${artist}`;
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          query
        )}&type=track&limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.tracks.items[0] || null;
      }
    } catch (error) {
      console.error(`Error searching track: ${song} by ${artist}`, error);
    }
    return null;
  };

  const handleAiRecommend = async () => {
    if (!aiPrompt.trim() && !selectedGenre) {
      toast.info("Please enter a prompt or select a genre");
      return;
    }

    setIsAiProcessing(true);
    setAiRecTracks([]);
    try {
      const promptContext = aiPrompt.trim()
        ? `${aiPrompt}${selectedGenre ? ` (Genre: ${selectedGenre})` : ""}`
        : `Genre: ${selectedGenre}`;

      const response = await fetch("/api/ai-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ai-search",
          context: promptContext,
        }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const data = await response.json();
      const recs = data.recommendations || [];

      // Search each recommendation on Spotify
      const foundTracks: Track[] = [];
      for (const rec of recs) {
        const track = await searchSpotifyTrack(rec.song, rec.artist);
        if (track) foundTracks.push(track);
      }

      setAiRecTracks(foundTracks);
      if (foundTracks.length === 0) {
        toast.info("AI suggested songs but they couldn't be found on Spotify");
      }
    } catch (error) {
      console.error("Error in AI recommendation:", error);
      toast.error("AI recommendation failed. Please try again.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAddAllTracks = async () => {
    if (aiRecTracks.length === 0) return;

    setIsAddingAll(true);
    try {
      const uris = aiRecTracks.map((t) => t.uri);
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris }),
        }
      );

      if (response.ok) {
        toast.success(`Successfully added ${uris.length} tracks!`);
        setAiRecTracks([]);
        setAiPrompt("");
        refetch(playlistID);
      } else {
        throw new Error("Failed to add tracks");
      }
    } catch (error) {
      console.error("Error adding all tracks:", error);
      toast.error("Failed to add all tracks");
    } finally {
      setIsAddingAll(false);
    }
  };

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
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50 p-1 rounded-xl mb-6">
                  <TabsTrigger
                    value="search"
                    className="rounded-lg data-[state=active]:bg-zinc-700 data-[state=active]:text-white flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Standard Search
                  </TabsTrigger>
                  <TabsTrigger
                    value="ai"
                    className="rounded-lg data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 flex items-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    AI Assistant
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-6 mt-0">
                  <SheetHeader className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Search className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <SheetTitle className="text-white text-xl">
                          Smart Search
                        </SheetTitle>
                        <SheetDescription className="text-zinc-400">
                          Search million of tracks on Spotify
                        </SheetDescription>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="Song, artist, or album..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-green-500/50 focus:ring-green-500/20"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSearch}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-zinc-700"
                        >
                          <X className="h-4 w-4 text-zinc-400" />
                        </Button>
                      )}
                    </div>
                  </SheetHeader>

                  <Separator className="bg-zinc-800/50" />

                  <ScrollArea className="h-[calc(100vh-320px)] pr-4 -mr-4">
                    {/* Standard Search Content */}
                    {!searchQuery.trim() ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-400 font-semibold uppercase tracking-wider text-xs">
                            <Sparkles className="h-3.5 w-3.5" />
                            Based on your playlist
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshRecommendations}
                            disabled={isLoadingRecommendations}
                            className="h-8 text-[10px] text-zinc-400 hover:text-green-400 hover:bg-green-400/10"
                          >
                            <RefreshCw
                              className={`h-3 w-3 mr-2 ${
                                isLoadingRecommendations ? "animate-spin" : ""
                              }`}
                            />
                            Refresh
                          </Button>
                        </div>

                        {isLoadingRecommendations ? (
                          <div className="grid grid-cols-1 gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="h-16 w-full rounded-lg bg-zinc-800/30 animate-pulse"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {recommendedTracks.map((track) => (
                              <TrackItem
                                key={track.id}
                                track={track}
                                onAdd={() => handleAddTrackToPlaylist(track)}
                                isAdding={addingTracks.has(track.id)}
                                onPreview={() =>
                                  handlePlayPreview(track.preview_url, track.id)
                                }
                                isPlaying={playingPreview === track.id}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {isLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                            <p className="text-zinc-500 text-sm">
                              Searching Spotify...
                            </p>
                          </div>
                        ) : (
                          searchResults.map((track) => (
                            <TrackItem
                              key={track.id}
                              track={track}
                              onAdd={() => handleAddTrackToPlaylist(track)}
                              isAdding={addingTracks.has(track.id)}
                              onPreview={() =>
                                handlePlayPreview(track.preview_url, track.id)
                              }
                              isPlaying={playingPreview === track.id}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="ai" className="space-y-6 mt-0">
                  <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-6 rounded-2xl border border-green-500/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-green-500 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                        <Wand2 className="h-5 w-5 text-black" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          AI Discovery
                        </h3>
                        <p className="text-zinc-400 text-xs">
                          Tell AI what vibe you're looking for
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                          Personal Prompt
                        </label>
                        <Textarea
                          placeholder="e.g. 'Upbeat summer songs with 80s synth vibes' or 'Chill acoustic covers of rock hits'"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="bg-black/40 border-zinc-800 placeholder:text-zinc-600 focus:border-green-500/50 resize-none h-24"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                          Filter by Genre (Optional)
                        </label>
                        <Select
                          value={selectedGenre}
                          onValueChange={setSelectedGenre}
                        >
                          <SelectTrigger className="bg-black/40 border-zinc-800">
                            <SelectValue placeholder="Select a genre..." />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            {genreList.map((genre) => (
                              <SelectItem
                                key={genre}
                                value={genre}
                                className="capitalize"
                              >
                                {genre.replace("-", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full bg-green-600 hover:bg-green-500 text-black font-bold h-11 transition-all active:scale-95 shadow-lg shadow-green-500/10"
                        onClick={handleAiRecommend}
                        disabled={
                          isAiProcessing || (!aiPrompt.trim() && !selectedGenre)
                        }
                      >
                        {isAiProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Gemini is thinking...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Get AI Recommendations
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[calc(100vh-500px)] pr-4 -mr-4">
                    {aiRecTracks.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <div className="text-sm text-zinc-400 flex items-center gap-2">
                            <ListMusic className="h-4 w-4" />
                            Found {aiRecTracks.length} tracks
                          </div>
                          <Button
                            size="sm"
                            className="bg-zinc-100 hover:bg-white text-black font-bold h-8 text-xs px-4 rounded-full"
                            onClick={handleAddAllTracks}
                            disabled={isAddingAll}
                          >
                            {isAddingAll ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-2" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-2" />
                            )}
                            Add All to Playlist
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {aiRecTracks.map((track) => (
                            <TrackItem
                              key={track.id}
                              track={track}
                              onAdd={() => handleAddTrackToPlaylist(track)}
                              isAdding={addingTracks.has(track.id)}
                              onPreview={() =>
                                handlePlayPreview(track.preview_url, track.id)
                              }
                              isPlaying={playingPreview === track.id}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      !isAiProcessing && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center px-6">
                          <div className="p-6 rounded-full bg-zinc-800 mb-4">
                            <Wand2 className="h-10 w-10 text-zinc-500" />
                          </div>
                          <p className="text-sm text-zinc-400 font-medium max-w-[200px]">
                            Your recommendations will appear here after AI
                            analysis
                          </p>
                        </div>
                      )
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
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

interface TrackItemProps {
  track: Track;
  onAdd: () => void;
  isAdding: boolean;
  onPreview: () => void;
  isPlaying: boolean;
}

function TrackItem({
  track,
  onAdd,
  isAdding,
  onPreview,
  isPlaying,
}: TrackItemProps) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/40 transition-all duration-300 border border-transparent hover:border-zinc-800/50">
      <div className="relative">
        <Avatar className="h-11 w-11 rounded-lg">
          <AvatarImage
            src={track.album.images[2]?.url || track.album.images[0]?.url}
            alt={track.album.name}
          />
          <AvatarFallback className="bg-zinc-800 text-zinc-500 rounded-lg">
            <Music className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        {track.preview_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center"
          >
            {isPlaying ? (
              <X className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white fill-current" />
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4
            className={`font-medium text-sm truncate ${
              isPlaying ? "text-green-400" : "text-zinc-200"
            }`}
          >
            {track.name}
          </h4>
          {track.explicit && (
            <span className="text-[9px] font-bold bg-zinc-800 text-zinc-500 px-1 rounded-sm border border-zinc-700">
              E
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {track.artists.map((a) => a.name).join(", ")}
        </p>
      </div>

      <Button
        onClick={onAdd}
        disabled={isAdding}
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full hover:bg-green-500 hover:text-black transition-all"
      >
        {isAdding ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
