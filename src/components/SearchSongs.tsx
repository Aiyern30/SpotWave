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
  Pause,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui";
import { useEffect, useState, useRef, useCallback } from "react";
import type { Artist, Track } from "@/lib/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { toast } from "react-toastify";
import { analyzePlaylistGenres } from "@/utils/analyzePlaylistGenres";
import { getPlaylistRecommendations } from "@/utils/getPlaylistRecommendations";

interface SearchSongsProps {
  playlistID: string;
  playlistName: string;
  refetch: (silent?: boolean) => void;
}

export default function SearchSongs({
  playlistID,
  playlistName,
  refetch,
}: SearchSongsProps) {
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
  const [discoveryCount, setDiscoveryCount] = useState(10);
  const [searchProgress, setSearchProgress] = useState(0);
  const [duplicateTrack, setDuplicateTrack] = useState<Track | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [pendingBatchTracks, setPendingBatchTracks] = useState<Track[] | null>(
    null
  );

  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(
    new Set()
  );

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTrackIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  const handleAddSelectedTracks = async () => {
    if (selectedTrackIds.size === 0) return;

    setIsLoading(true);
    try {
      const tracksToAdd = [
        ...searchResults,
        ...recommendedTracks,
        ...aiRecTracks,
      ].filter((t) => selectedTrackIds.has(t.id));

      if (tracksToAdd.length === 0) return;

      // Check if any selected tracks are already in the playlist
      const duplicates = tracksToAdd.filter((t) =>
        existingTrackIds.includes(t.id)
      );

      if (duplicates.length > 0 && !pendingBatchTracks) {
        setPendingBatchTracks(tracksToAdd);
        setIsDuplicateDialogOpen(true);
        return;
      }

      const tracksToExecute = pendingBatchTracks || tracksToAdd;
      const uris = tracksToExecute.map((t) => t.uri);
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
        toast.success(`Successfully added ${tracksToExecute.length} tracks!`);
        setSelectedTrackIds(new Set());
        // Update local existing tracks to prevent immediate duplicate warnings
        setExistingTrackIds((prev) => [
          ...prev,
          ...tracksToExecute.map((t) => t.id),
        ]);
        setPendingBatchTracks(null);
        refetch(true); // SILENT REFRESH
      } else {
        throw new Error("Failed to add tracks");
      }
    } catch (error) {
      console.error("Error adding selected tracks:", error);
      toast.error("Failed to add selected tracks");
    } finally {
      setIsLoading(false);
    }
  };

  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    currentTrack,
    isPlaying: isGlobalPlaying,
    isPaused,
  } = usePlayer();

  const VIBE_TAGS = [
    { label: "Pop", value: "pop" },
    { label: "Hip Hop", value: "hip-hop" },
    { label: "Rock", value: "rock" },
    { label: "Lo-Fi", value: "lo-fi" },
    { label: "EDM", value: "edm" },
    { label: "R&B", value: "rainy-day" },
    { label: "Jazz", value: "jazz" },
    { label: "Classical", value: "classical" },
    { label: "Night Drive", value: "synthwave" },
    { label: "Chill", value: "chill" },
    { label: "Gym", value: "workout" },
    { label: "Sadness", value: "sad" },
    { label: "Party", value: "party" },
    { label: "Acoustic", value: "acoustic" },
    { label: "K-Pop", value: "k-pop" },
  ];

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

  const searchSpotifyTrack = async (song: string, artist: string) => {
    try {
      console.log(`🔍 Searching: "${song}" by "${artist}"`);

      // Try exact search first
      let query = `track:${song} artist:${artist}`;
      let response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          query
        )}&type=track&limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.tracks.items[0]) {
          console.log(`✅ Found: ${data.tracks.items[0].name}`);
          return data.tracks.items[0];
        }
      }

      // Fallback: Try broader search with just song and artist name
      console.log(`⚠️ Exact search failed, trying broader search...`);
      query = `${song} ${artist}`;
      response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          query
        )}&type=track&limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.tracks.items[0]) {
          console.log(`✅ Found (broad): ${data.tracks.items[0].name}`);
          return data.tracks.items[0];
        }
      }

      console.log(`❌ Not found: "${song}" by "${artist}"`);
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
    setSearchProgress(0);
    try {
      const promptContext = `count:${discoveryCount} ${aiPrompt.trim()}${
        selectedGenre ? ` (Genre: ${selectedGenre})` : ""
      }`;

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

      // Search Spotify for tracks in parallel batches of 5 to avoid browser/API strain
      const foundTracks: Track[] = [];
      const trackIds = new Set<string>();
      const batchSize = 5;

      for (let i = 0; i < recs.length; i += batchSize) {
        const batch = recs.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((rec: any) => searchSpotifyTrack(rec.song, rec.artist))
        );

        // Filter out nulls and duplicates
        results.forEach((track) => {
          if (track && track.id && track.name && !trackIds.has(track.id)) {
            trackIds.add(track.id);
            foundTracks.push(track);
          }
        });

        // Update progress
        setSearchProgress(Math.min(i + batchSize, recs.length));
      }

      // Update UI once with all unique tracks
      setAiRecTracks(foundTracks);
      setSearchProgress(0);

      if (foundTracks.length === 0) {
        toast.info("AI suggested songs but they couldn't be found on Spotify");
      } else {
        toast.success(
          `Found ${foundTracks.length} out of ${recs.length} tracks!`
        );
      }
    } catch (error) {
      console.error("Error in AI recommendation:", error);
      toast.error("AI recommendation failed. Please try again.");
    } finally {
      setIsAiProcessing(false);
      setSearchProgress(0);
    }
  };

  const handleAddAllTracks = async () => {
    if (aiRecTracks.length === 0) return;

    setIsAddingAll(true);
    try {
      // First, fetch current playlist tracks to check for duplicates
      const playlistRes = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!playlistRes.ok) {
        throw new Error("Failed to fetch playlist tracks");
      }

      const playlistData = await playlistRes.json();
      const existingTrackIds = new Set(
        playlistData.items.map((item: any) => item.track.id)
      );

      // Filter out tracks that already exist in the playlist
      const newTracks = aiRecTracks.filter(
        (track) => !existingTrackIds.has(track.id)
      );

      if (newTracks.length === 0) {
        toast.info("All tracks are already in the playlist!");
        return;
      }

      const uris = newTracks.map((t) => t.uri);
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
        const skipped = aiRecTracks.length - newTracks.length;
        if (skipped > 0) {
          toast.success(
            `Added ${newTracks.length} new tracks! (${skipped} already in playlist)`
          );
        } else {
          toast.success(`Successfully added ${newTracks.length} tracks!`);
        }
        setSelectedTrackIds(new Set());
        refetch(true); // SILENT REFRESH
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

  const executeAddTrack = async (track: Track) => {
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
      // Update local existing tracks
      setExistingTrackIds((prev) => [...prev, track.id]);
      refetch(true); // SILENT REFRESH

      // Remove from recommendations after adding
      setRecommendedTracks((prev) => prev.filter((t) => t.id !== track.id));
      setAiRecTracks((prev) => prev.filter((t) => t.id !== track.id));
    } catch (error) {
      console.error("Error adding track to playlist:", error);
      toast.error("Failed to add track to playlist");
    } finally {
      setAddingTracks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(track.id);
        return newSet;
      });
      setDuplicateTrack(null);
    }
  };

  const handleAddTrackToPlaylist = async (track: Track) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    // Check if track already exists in playlist
    if (existingTrackIds.includes(track.id)) {
      setDuplicateTrack(track);
      setIsDuplicateDialogOpen(true);
      return;
    }

    await executeAddTrack(track);
  };

  const handleTogglePlay = (track: Track) => {
    const isCurrentTrack = currentTrack?.id === track.id;
    if (isCurrentTrack && isGlobalPlaying) {
      pauseTrack();
    } else if (isCurrentTrack && isPaused) {
      resumeTrack();
    } else {
      playTrack(track);
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
              className="w-full sm:w-[500px] sm:max-w-none bg-zinc-900/95 backdrop-blur-sm border-zinc-700/50 text-white overflow-x-hidden"
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
                    className="rounded-lg data-[state=active]:bg-brand/20 data-[state=active]:text-brand flex items-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    AI Assistant
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-6 mt-0">
                  <SheetHeader className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand/20 rounded-lg">
                        <Search className="h-5 w-5 text-brand" />
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
                        className="pl-10 pr-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-brand/50 focus:ring-brand/20"
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

                  <ScrollArea className="h-[calc(100vh-320px)] w-full overflow-x-hidden">
                    {/* Standard Search Content */}
                    {!searchQuery.trim() ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-brand font-semibold uppercase tracking-wider text-xs">
                            <Sparkles className="h-3.5 w-3.5" />
                            Based on your playlist
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshRecommendations}
                            disabled={isLoadingRecommendations}
                            className="h-8 text-[10px] text-zinc-400 hover:bg-brand "
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
                                key={`rec-${track.id}`}
                                track={track}
                                onAdd={() => handleAddTrackToPlaylist(track)}
                                isAdding={addingTracks.has(track.id)}
                                onPlay={() => handleTogglePlay(track)}
                                isCurrentTrack={currentTrack?.id === track.id}
                                isPlaying={
                                  currentTrack?.id === track.id &&
                                  isGlobalPlaying
                                }
                                isSelected={selectedTrackIds.has(track.id)}
                                onSelect={() => toggleTrackSelection(track.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {isLoading ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-brand" />
                            <p className="text-zinc-500 text-sm">
                              Searching Spotify...
                            </p>
                          </div>
                        ) : (
                          searchResults.map((track) => (
                            <TrackItem
                              key={`search-${track.id}`}
                              track={track}
                              onAdd={() => handleAddTrackToPlaylist(track)}
                              isAdding={addingTracks.has(track.id)}
                              onPlay={() => handleTogglePlay(track)}
                              isCurrentTrack={currentTrack?.id === track.id}
                              isPlaying={
                                currentTrack?.id === track.id && isGlobalPlaying
                              }
                              isSelected={selectedTrackIds.has(track.id)}
                              onSelect={() => toggleTrackSelection(track.id)}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="ai" className="space-y-6 mt-0">
                  <div className="bg-gradient-to-br from-brand/10 via-emerald-500/5 to-transparent p-6 rounded-2xl border border-brand/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-brand rounded-xl shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]">
                        <Wand2 className="h-5 w-5 text-brand-foreground" />
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
                          className="bg-black/40 border-zinc-800 placeholder:text-zinc-600 focus:border-brand/50 resize-none h-24"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">
                          Select a Vibe
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {VIBE_TAGS.map((vibe) => (
                            <button
                              key={vibe.value}
                              onClick={() =>
                                setSelectedGenre(
                                  selectedGenre === vibe.value ? "" : vibe.value
                                )
                              }
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                                selectedGenre === vibe.value
                                  ? "bg-brand border-brand text-brand-foreground shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.4)]"
                                  : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                              }`}
                            >
                              {vibe.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Discovery Amount
                          </label>
                          <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                            {discoveryCount} Songs
                          </span>
                        </div>
                        <div className="px-1">
                          <input
                            type="range"
                            min="5"
                            max="20"
                            step="5"
                            value={discoveryCount}
                            onChange={(e) =>
                              setDiscoveryCount(parseInt(e.target.value))
                            }
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand"
                          />
                          <div className="flex justify-between mt-2 px-0.5">
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">
                              5
                            </span>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">
                              10
                            </span>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">
                              15
                            </span>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">
                              20
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-brand hover:bg-brand/90 text-brand-foreground font-bold h-11 transition-all active:scale-95 shadow-lg shadow-brand/10 mt-2"
                        onClick={handleAiRecommend}
                        disabled={
                          isAiProcessing || (!aiPrompt.trim() && !selectedGenre)
                        }
                      >
                        {isAiProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {searchProgress > 0
                              ? `Finding songs... ${searchProgress}/${discoveryCount}`
                              : "Gemini is thinking..."}
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

                  <ScrollArea className="h-[calc(100vh-500px)] w-full overflow-x-hidden">
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
                              key={`ai-${track.id}`}
                              track={track}
                              onAdd={() => handleAddTrackToPlaylist(track)}
                              isAdding={addingTracks.has(track.id)}
                              onPlay={() => handleTogglePlay(track)}
                              isCurrentTrack={currentTrack?.id === track.id}
                              isPlaying={
                                currentTrack?.id === track.id && isGlobalPlaying
                              }
                              isSelected={selectedTrackIds.has(track.id)}
                              onSelect={() => toggleTrackSelection(track.id)}
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

              {/* Floating Batch Add Button */}
              {selectedTrackIds.size > 0 && (
                <div className="absolute bottom-6 left-6 right-6 animate-in slide-in-from-bottom-4 duration-300">
                  <Button
                    className="w-full bg-brand hover:bg-brand/90 text-brand-foreground font-bold h-12 shadow-[0_8px_30px_rgb(var(--brand-primary-rgb),0.3)] rounded-xl flex items-center justify-between px-6"
                    onClick={handleAddSelectedTracks}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-brand-foreground/20 px-2 py-0.5 rounded text-xs">
                        {selectedTrackIds.size}
                      </div>
                      <span>Add Selected Tracks</span>
                    </div>
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Add songs to playlist</p>
        </TooltipContent>
      </Tooltip>

      <AlertDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-[400px] rounded-2xl p-6">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-xl font-bold">
              Already added
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              {pendingBatchTracks
                ? `Some of these songs are already in your '${playlistName}' playlist.`
                : `This is already in your '${playlistName}' playlist.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 mt-6">
            <AlertDialogCancel
              onClick={() => {
                setDuplicateTrack(null);
                setPendingBatchTracks(null);
              }}
              className="mt-0 border-none bg-transparent hover:bg-transparent text-zinc-400 hover:text-white font-bold h-11 px-6 transition-colors"
            >
              Don't add
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingBatchTracks) {
                  handleAddSelectedTracks();
                } else if (duplicateTrack) {
                  executeAddTrack(duplicateTrack);
                }
              }}
              className="bg-brand hover:bg-brand/90 text-black rounded-full font-bold h-11 px-8 shadow-[0_8px_30px_rgb(var(--brand-primary-rgb),0.3)]"
            >
              Add anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

interface TrackItemProps {
  track: Track;
  onAdd: () => void;
  isAdding: boolean;
  onPlay: () => void;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

function TrackItem({
  track,
  onAdd,
  isAdding,
  onPlay,
  isCurrentTrack,
  isPlaying,
  isSelected,
  onSelect,
}: TrackItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border cursor-pointer w-full min-w-0 ${
        isSelected
          ? "bg-brand/20 border-brand/50 shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.1)]"
          : "hover:bg-zinc-800/40 border-transparent hover:border-zinc-800/50"
      }`}
    >
      <div
        className="relative flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Avatar className="h-11 w-11 rounded-lg">
          <AvatarImage
            src={track.album.images[2]?.url || track.album.images[0]?.url}
            alt={track.album.name}
          />
          <AvatarFallback className="bg-zinc-800 text-zinc-500 rounded-lg">
            <Music className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        <Button
          variant="ghost"
          size="icon"
          onClick={onPlay}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hover:bg-brand transition-all duration-200 rounded-full h-9 w-9 border border-white/10 flex items-center justify-center p-0 ${
            isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white translate-x-0.5" />
          )}
        </Button>
      </div>

      <div className="flex-1 min-w-0 overflow-hidden text-left">
        <div className="flex items-center gap-2 w-full">
          <h4
            className={`font-medium text-sm truncate transition-colors flex-1 ${
              isCurrentTrack ? "text-brand" : "text-zinc-200"
            }`}
          >
            {track.name}
          </h4>
          {track.explicit && (
            <span className="text-[9px] font-bold bg-zinc-800 text-zinc-500 px-1 rounded-sm border border-zinc-700 flex-shrink-0">
              E
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {track.artists.map((a) => a.name).join(", ")}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          disabled={isAdding}
          size="icon"
          variant="ghost"
          className={`h-8 w-8 rounded-full transition-all ${
            isSelected
              ? "bg-brand text-brand-foreground"
              : "hover:bg-brand hover:text-black"
          }`}
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSelected ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
