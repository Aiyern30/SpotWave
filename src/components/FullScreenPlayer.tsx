"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  Button,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
} from "@/components/ui";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  Loader2,
  X,
  Music,
  Users,
  TrendingUp,
  Clock,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import {
  checkUserSavedTracks,
  saveTracksForUser,
  removeTracksFromUser,
} from "@/lib/spotify";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LyricsLine {
  time: number;
  text: string;
}

interface TopTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  uri: string;
}

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const FullScreenPlayer = ({
  isOpen,
  onClose,
}: FullScreenPlayerProps) => {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    isReady,
    playTrack,
    repeatMode,
    toggleRepeat,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  // View toggle state
  const [viewMode, setViewMode] = useState<"image" | "lyrics">("image");

  // Top tracks state
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [loadingTopTracks, setLoadingTopTracks] = useState(false);

  // Lyrics state
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<LyricsLine[] | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Add display mode and current artist tracking
  const [topTracksDisplayUI, setTopTracksDisplayUI] = useState<"Table" | "Grid">("Table");
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<string | null>(null);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Prevent body scroll
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        // Restore body scroll
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Fetch saved status
  useEffect(() => {
    const checkIfTrackIsSaved = async () => {
      if (currentTrack?.id) {
        try {
          const saved = await checkUserSavedTracks([currentTrack.id]);
          setIsSaved(saved[0]);
        } catch (error) {
          console.error("Failed to check if track is saved:", error);
        }
      }
    };
    checkIfTrackIsSaved();
  }, [currentTrack]);

  // Fetch top tracks when opening
  useEffect(() => {
    if (isOpen && currentTrack?.artists[0]?.id) {
      const artistId = currentTrack.artists[0].id;
      
      // Only fetch if artist changed or no tracks loaded
      if (artistId !== currentArtistId || topTracks.length === 0) {
        setCurrentArtistId(artistId);
        fetchTopTracks(artistId);
        fetchLyrics(
          currentTrack.artists[0].name,
          currentTrack.name,
          currentTrack.album.name,
          currentTrack.duration_ms
        );
      }
    }
  }, [isOpen, currentTrack?.artists[0]?.id]); // Remove currentTrack from dependencies

  // Sync lyrics
  useEffect(() => {
    if (!syncedLyrics || syncedLyrics.length === 0 || !isPlaying) return;

    const adjustedPosition = position + 300;
    let newIndex = -1;
    for (let i = syncedLyrics.length - 1; i >= 0; i--) {
      if (adjustedPosition >= syncedLyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
      if (lyricsContainerRef.current && newIndex >= 0) {
        const activeElement = lyricsContainerRef.current.querySelector(
          `[data-index="${newIndex}"]`
        );
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [position, syncedLyrics, currentLyricIndex, isPlaying]);

  const fetchTopTracks = async (artistId: string) => {
    setLoadingTopTracks(true);
    try {
      const token = localStorage.getItem("Token");
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setTopTracks(data.tracks?.slice(0, 10) || []);
    } catch (error) {
      console.error("Error fetching top tracks:", error);
    } finally {
      setLoadingTopTracks(false);
    }
  };

  const parseSyncedLyrics = (lrcText: string): LyricsLine[] => {
    const lines: LyricsLine[] = [];
    const lrcLines = lrcText.split("\n");
    for (const line of lrcLines) {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const centiseconds = parseInt(match[3].padEnd(3, "0"));
        const time = (minutes * 60 + seconds) * 1000 + centiseconds;
        const text = match[4].trim();
        if (text) lines.push({ time, text });
      }
    }
    return lines.sort((a, b) => a.time - b.time);
  };

  const fetchLyrics = async (
    artist: string,
    title: string,
    album: string,
    durationMs: number
  ) => {
    setLoadingLyrics(true);
    try {
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: title,
        album_name: album,
        duration: Math.round(durationMs / 1000).toString(),
      });
      const response = await fetch(
        `https://lrclib.net/api/get?${params.toString()}`
      );
      const data = await response.json();

      if (data.syncedLyrics && data.syncedLyrics.trim()) {
        setSyncedLyrics(parseSyncedLyrics(data.syncedLyrics));
        setLyrics(
          data.plainLyrics ||
            data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim()
        );
      } else if (data.plainLyrics && data.plainLyrics.trim()) {
        setLyrics(data.plainLyrics);
        setSyncedLyrics(null);
      } else {
        setLyrics(data.instrumental ? "🎵 Instrumental" : "Lyrics not found");
        setSyncedLyrics(null);
      }
    } catch (error) {
      setLyrics("Unable to fetch lyrics");
      setSyncedLyrics(null);
    } finally {
      setLoadingLyrics(false);
    }
  };

  const handleToggleSave = async () => {
    if (!currentTrack?.id || isSaving) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        await removeTracksFromUser([currentTrack.id]);
        setIsSaved(false);
      } else {
        await saveTracksForUser([currentTrack.id]);
        setIsSaved(true);
      }
    } catch (error) {
      setIsSaved((prev) => !prev);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setLocalVolume(vol);
    setVolume(vol);
    if (vol > 0 && isMuted) setIsMuted(false);
    else if (vol === 0 && !isMuted) setIsMuted(true);
  };

  const handleMute = () => {
    if (isMuted) {
      const volumeToRestore = previousVolume > 0 ? previousVolume : 0.5;
      setVolume(volumeToRestore);
      setLocalVolume(volumeToRestore);
      setIsMuted(false);
    } else {
      setPreviousVolume(localVolume);
      setVolume(0);
      setLocalVolume(0);
      setIsMuted(true);
    }
  };

  const handlePlayPauseTopTrack = async (track: TopTrack) => {
    // Check if this track is currently playing
    if (currentPlayingTrackId === track.id) {
      // Same track - toggle play/pause
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      // Different track - play it
      await handlePlayTopTrack(track);
    }
  };

  const handlePlayTopTrack = async (track: TopTrack) => {
    setIsLoadingTrack(true);
    try {
      const token = localStorage.getItem("Token");
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${track.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const trackData = await response.json();

      await playTrack({
        id: trackData.id,
        name: trackData.name,
        artists: trackData.artists,
        album: {
          name: trackData.album.name,
          images: trackData.album.images,
          id: trackData.album.id,
          artists: trackData.album.artists,
          release_date: trackData.album.release_date || "",
          total_tracks: trackData.album.total_tracks || 0,
        },
        duration_ms: trackData.duration_ms,
        explicit: trackData.explicit || false,
        external_urls: { spotify: trackData.external_urls.spotify },
        popularity: trackData.popularity || 0,
        preview_url: trackData.preview_url || null,
        track_number: trackData.track_number || 0,
        disc_number: trackData.disc_number || 1,
        uri: trackData.uri,
      });

      setCurrentPlayingTrackId(trackData.id);
      // Wait a bit for the track to start loading
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error playing track:", error);
    } finally {
      setIsLoadingTrack(false);
    }
  };

  // Update current playing track ID when track changes
  useEffect(() => {
    if (currentTrack?.id) {
      setCurrentPlayingTrackId(currentTrack.id);
    }
  }, [currentTrack]);

  // Helper function to check if track is currently playing
  const isTrackPlaying = (trackId: string) => {
    return currentPlayingTrackId === trackId && isPlaying;
  };

  // Wrapper for PlaylistCard compatibility
  const handlePlayTopTrackWrapper = (trackId?: string) => {
    if (!trackId) return;
    const track = topTracks.find((t) => t.id === trackId);
    if (track) {
      handlePlayPauseTopTrack(track);
    }
  };

  const handleArtistClick =
    (artistId: string, artistName: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(
        `/Artists/${artistId}?name=${encodeURIComponent(artistName)}`
      );
    };

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-zinc-900 via-zinc-800 to-black z-50 overflow-y-auto overflow-x-hidden">
      {/* Header with View Toggle and Close Button */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewMode("image")}
          className={`h-10 w-10 ${
            viewMode === "image"
              ? "text-green-400 bg-zinc-800"
              : "text-white hover:text-green-400 hover:bg-zinc-800"
          }`}
          title="Show Album Art"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewMode("lyrics")}
          className={`h-10 w-10 ${
            viewMode === "lyrics"
              ? "text-green-400 bg-zinc-800"
              : "text-white hover:text-green-400 hover:bg-zinc-800"
          }`}
          title="Show Lyrics"
        >
          <FileText className="h-5 w-5" />
        </Button>
        <div className="w-px h-6 bg-zinc-700 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:text-green-400 hover:bg-zinc-800 h-10 w-10"
          title="Close"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Hero Section - Album Art or Lyrics */}
        <div className="relative w-full">
          {viewMode === "image" ? (
            <div className="relative w-full aspect-square max-w-2xl mx-auto">
              <Image
                src={currentTrack.album.images[0]?.url || "/default-artist.png"}
                fill
                className="object-cover rounded-2xl shadow-2xl"
                alt={currentTrack.name}
                priority
              />
            </div>
          ) : (
            <div className="w-full min-h-[600px] bg-zinc-900/50 rounded-2xl p-8 backdrop-blur-sm overflow-hidden">
              {loadingLyrics ? (
                <div className="flex justify-center items-center h-[600px]">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : syncedLyrics && syncedLyrics.length > 0 ? (
                <div
                  ref={lyricsContainerRef}
                  className="h-[600px] overflow-y-auto overflow-x-hidden scroll-smooth space-y-4 pr-4"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#3b82f6 #27272a",
                  }}
                >
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      width: 8px;
                    }
                    div::-webkit-scrollbar-track {
                      background: #27272a;
                      border-radius: 10px;
                    }
                    div::-webkit-scrollbar-thumb {
                      background: #3b82f6;
                      border-radius: 10px;
                    }
                    div::-webkit-scrollbar-thumb:hover {
                      background: #2563eb;
                    }
                  `}</style>
                  {syncedLyrics.map((line, index) => (
                    <div
                      key={index}
                      data-index={index}
                      className={`text-base leading-relaxed transition-all duration-300 py-1 break-words ${
                        index === currentLyricIndex
                          ? "text-green-400 font-semibold text-2xl"
                          : index < currentLyricIndex
                          ? "text-zinc-500"
                          : "text-zinc-300"
                      }`}
                      style={
                        index === currentLyricIndex
                          ? {
                              transform: "scale(1.05)",
                              transformOrigin: "left center",
                            }
                          : undefined
                      }
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[600px] overflow-y-auto overflow-x-hidden pr-4">
                  <pre className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap break-words">
                    {lyrics}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-bold text-white">{currentTrack.name}</h1>
          <div className="text-xl text-zinc-400 flex items-center justify-center flex-wrap gap-2">
            {currentTrack.artists.map((artist, index) => (
              <span key={artist.id} className="inline-flex items-center">
                <span
                  className="hover:underline hover:text-white cursor-pointer transition-colors"
                  onClick={handleArtistClick(artist.id, artist.name)}
                >
                  {artist.name}
                </span>
                {index < currentTrack.artists.length - 1 && (
                  <span className="mx-1">,</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 max-w-2xl mx-auto">
          <Slider
            value={[position]}
            max={duration}
            step={1000}
            onValueChange={(val) => seekTo(val[0])}
            className="cursor-pointer"
            disabled={!isReady || duration === 0}
          />
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSave}
            className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-10 w-10 transition-all"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-green-500" />
            ) : isSaved ? (
              <Heart className="h-5 w-5 fill-green-500 text-green-500" />
            ) : (
              <Heart className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-10 w-10 transition-all"
          >
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={previousTrack}
            className="text-white hover:text-green-400 hover:bg-zinc-800 h-12 w-12 transition-all"
            disabled={!isReady}
          >
            <SkipBack className="h-6 w-6 fill-current" />
          </Button>

          <Button
            onClick={isPlaying ? pauseTrack : resumeTrack}
            size="icon"
            className="bg-white hover:bg-green-500 hover:scale-105 text-black h-14 w-14 rounded-full transition-all"
            disabled={!isReady || isLoadingTrack}
          >
            {isLoadingTrack ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="h-7 w-7 ml-0.5 fill-current" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextTrack}
            className="text-white hover:text-green-400 hover:bg-zinc-800 h-12 w-12 transition-all"
            disabled={!isReady}
          >
            <SkipForward className="h-6 w-6 fill-current" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRepeat}
            className={`h-10 w-10 transition-all ${
              repeatMode === "off"
                ? "text-zinc-400 hover:text-green-400 hover:bg-zinc-800"
                : "text-green-500 hover:text-green-400 hover:bg-zinc-800"
            }`}
            title={
              repeatMode === "off"
                ? "Repeat Off"
                : repeatMode === "context"
                ? "Repeat All"
                : "Repeat One"
            }
          >
            {repeatMode === "track" ? (
              <Repeat1 className="h-5 w-5" />
            ) : (
              <Repeat className="h-5 w-5" />
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMute}
              className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-10 w-10 transition-all"
            >
              {isMuted || localVolume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              value={[localVolume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24 cursor-pointer"
              disabled={!isReady}
            />
          </div>
        </div>

        {/* Top Tracks Section with Table/Grid Toggle */}
        <div className="pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Popular tracks by {currentTrack.artists[0]?.name}
            </h2>
            <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTopTracksDisplayUI("Table")}
                className={`h-9 px-3 transition-all ${
                  topTracksDisplayUI === "Table"
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <PiTable className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTopTracksDisplayUI("Grid")}
                className={`h-9 px-3 transition-all ${
                  topTracksDisplayUI === "Grid"
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
            </div>
          </div>

          {loadingTopTracks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : topTracksDisplayUI === "Table" ? (
            <div className="bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-zinc-400">#</TableHead>
                    <TableHead className="text-zinc-400">Title</TableHead>
                    <TableHead className="hidden md:table-cell text-center text-zinc-400">
                      Popularity
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right text-zinc-400">
                      <Clock className="w-4 h-4 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTracks.map((track, index) => {
                    const isThisTrack = currentPlayingTrackId === track.id;
                    return (
                      <TableRow
                        key={track.id}
                        className="border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        onClick={() => handlePlayPauseTopTrack(track)}
                        onMouseEnter={() => setHoveredTrackId(track.id)}
                        onMouseLeave={() => setHoveredTrackId(null)}
                      >
                        <TableCell className="text-center">
                          {hoveredTrackId === track.id ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 rounded-full hover:bg-green-500 hover:text-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayPauseTopTrack(track);
                              }}
                            >
                              {isTrackPlaying(track.id) ? (
                                <Pause className="w-3 h-3" fill="currentColor" />
                              ) : (
                                <Play className="w-3 h-3" fill="currentColor" />
                              )}
                            </Button>
                          ) : (
                            <span
                              className={`text-sm ${
                                isThisTrack ? "text-green-400" : "text-zinc-400"
                              }`}
                            >
                              {index + 1}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div
                            className={`font-medium truncate transition-colors ${
                              isThisTrack
                                ? "text-green-400"
                                : "text-white group-hover:text-green-400"
                            }`}
                          >
                            {track.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <TrendingUp className="h-3 w-3 text-zinc-400" />
                            <span className="text-zinc-400 text-sm">
                              {track.popularity}/100
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right text-zinc-400 text-sm">
                          {formatTime(track.duration_ms)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {topTracks.map((track, index) => {
                const isThisTrack = currentPlayingTrackId === track.id;
                return (
                  <PlaylistCard
                    key={track.id}
                    id={track.id}
                    image={currentTrack.album.images[0]?.url || "/default-artist.png"}
                    title={track.name}
                    description={`Popularity: ${track.popularity}/100`}
                    badge={`#${index + 1}`}
                    duration={formatTime(track.duration_ms)}
                    isPlaying={isThisTrack && isPlaying}
                    isPaused={isThisTrack && !isPlaying}
                    onPlay={handlePlayTopTrackWrapper}
                    onPause={pauseTrack}
                    onResume={resumeTrack}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Track Details Section */}
        <div className="pt-8 pb-16">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Track Information
          </h2>
          <Card className="bg-zinc-800/30 border-zinc-700">
            <CardContent className="p-6 space-y-4 overflow-x-hidden">
              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-base">Duration</span>
                  <span className="text-white text-base">
                    {formatTime(currentTrack.duration_ms)}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-base">Explicit</span>
                  <span className="text-white text-base">
                    {currentTrack.explicit ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-base">Popularity</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${currentTrack.popularity}%` }}
                      />
                    </div>
                    <span className="text-white text-base">
                      {currentTrack.popularity}/100
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-zinc-400 text-base">Album</span>
                  <span
                    className="text-white hover:text-green-400 cursor-pointer hover:underline text-base truncate ml-4"
                    onClick={() =>
                      router.push(
                        `/Albums/${currentTrack.album.id}?name=${currentTrack.album.name}`
                      )
                    }
                  >
                    {currentTrack.album.name}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
