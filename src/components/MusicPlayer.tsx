"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  Button,
  Slider,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  HeartOff,
  Shuffle,
  Repeat,
  Repeat1,
  Mic2,
  List,
  Maximize2,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  checkUserSavedTracks,
  saveTracksForUser,
  removeTracksFromUser,
} from "@/lib/spotify";

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

interface LyricsLine {
  time: number;
  text: string;
}

interface LyricsCache {
  plainLyrics: string | null;
  syncedLyrics: LyricsLine[] | null;
  instrumental: boolean;
  timestamp: number;
}

interface MusicPlayerProps {
  onToggleQueue?: () => void;
  onToggleFullScreen?: () => void;
}

export const MusicPlayer = ({
  onToggleQueue,
  onToggleFullScreen,
}: MusicPlayerProps = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    currentTrack,
    isPlaying,
    isPaused,
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
    isConnecting,
    repeatMode,
    toggleRepeat,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [isVisible, setIsVisible] = useState(false);
  const [hasConnected, setHasConnected] = useState(false); // Track if ever connected
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLyricsSheetOpen, setIsLyricsSheetOpen] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<LyricsLine[] | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const lyricsCache = useRef<Map<string, LyricsCache>>(new Map());
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(!!currentTrack || isConnecting);
  }, [currentTrack, isConnecting]);

  // Track if we've ever connected successfully
  useEffect(() => {
    if (isReady && !hasConnected) {
      setHasConnected(true);
    }
  }, [isReady, hasConnected]);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

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

  const handleToggleSave = async () => {
    if (!currentTrack?.id || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        await removeTracksFromUser([currentTrack.id]);
        setIsSaved(false);
        console.log(`Removed "${currentTrack.name}" from your library`);
      } else {
        await saveTracksForUser([currentTrack.id]);
        setIsSaved(true);
        console.log(`Added "${currentTrack.name}" to your library`);
      }
    } catch (error) {
      console.error("Failed to toggle track save status:", error);
      // Revert the state if there's an error
      setIsSaved((prev) => !prev);
    } finally {
      setIsSaving(false);
    }
  };

  // Parse synced lyrics (LRC format)
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

        if (text) {
          lines.push({ time, text });
        }
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
    const cacheKey = `${artist}-${title}-${album}`;

    const cached = lyricsCache.current.get(cacheKey);
    if (cached) {
      console.log("Using cached lyrics");
      setLyrics(cached.plainLyrics);
      setSyncedLyrics(cached.syncedLyrics);
      setCurrentLyricIndex(-1);
      return;
    }

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let plainLyricsText = null;
      let syncedLyricsData = null;
      let isInstrumental = false;

      if (data.syncedLyrics && data.syncedLyrics.trim()) {
        syncedLyricsData = parseSyncedLyrics(data.syncedLyrics);
        plainLyricsText =
          data.plainLyrics ||
          data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();
      } else if (data.plainLyrics && data.plainLyrics.trim()) {
        plainLyricsText = data.plainLyrics;
      } else if (data.instrumental) {
        plainLyricsText = "🎵 This track is instrumental (no lyrics available)";
        isInstrumental = true;
      } else {
        plainLyricsText = "Lyrics not found for this track.";
      }

      lyricsCache.current.set(cacheKey, {
        plainLyrics: plainLyricsText,
        syncedLyrics: syncedLyricsData,
        instrumental: isInstrumental,
        timestamp: Date.now(),
      });

      setLyrics(plainLyricsText);
      setSyncedLyrics(syncedLyricsData);
      setCurrentLyricIndex(-1);
    } catch (error) {
      console.error("Error fetching lyrics from LRCLIB:", error);
      const errorMessage = "Unable to fetch lyrics at this time.";
      setLyrics(errorMessage);
      setSyncedLyrics(null);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Sync lyrics with current playback position
  useEffect(() => {
    if (
      !syncedLyrics ||
      syncedLyrics.length === 0 ||
      !isLyricsSheetOpen ||
      !isPlaying
    ) {
      return;
    }

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
          activeElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }, [position, syncedLyrics, currentLyricIndex, isLyricsSheetOpen, isPlaying]);

  const handleLyricsClick = () => {
    if (!currentTrack) return;

    if (!lyrics && !loadingLyrics) {
      fetchLyrics(
        currentTrack.artists[0].name,
        currentTrack.name,
        currentTrack.album.name,
        currentTrack.duration_ms
      );
    }
    setIsLyricsSheetOpen(true);
  };

  const handlePlayPause = useCallback(() => {
    isPlaying ? pauseTrack() : resumeTrack();
  }, [isPlaying, pauseTrack, resumeTrack]);

  const handleVolumeChange = useCallback(
    (newVolume: number[]) => {
      const vol = newVolume[0];
      setLocalVolume(vol);
      setVolume(vol);
      if (vol > 0 && isMuted) setIsMuted(false);
      else if (vol === 0 && !isMuted) setIsMuted(true);
    },
    [setVolume, isMuted]
  );

  const handleMute = useCallback(() => {
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
  }, [isMuted, previousVolume, localVolume, setVolume]);

  const handleSeek = useCallback(
    (newPosition: number[]) => {
      seekTo(newPosition[0]);
    },
    [seekTo]
  );

  const handleTrackClick = () => {
    if (currentTrack?.album?.id) {
      router.push(
        `/Albums/${currentTrack.album.id}?name=${encodeURIComponent(
          currentTrack.album.name
        )}`
      );
    }
  };

  const handleArtistClick =
    (artistId: string, artistName: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(
        `/Artists/${artistId}?name=${encodeURIComponent(artistName)}`
      );
    };

  const handleQueueClick = () => {
    if (onToggleQueue) {
      onToggleQueue();
    }
  };

  const handleFullScreenClick = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 lg:left-16 right-0 bg-black border-t border-zinc-800 z-40">
      <div className="h-[90px] flex items-center justify-between px-4 gap-4">
        {/* Left Section - Track Info */}
        <div className="flex items-center gap-3 min-w-[240px] w-[30%]">
          <div
            className="w-14 h-14 rounded overflow-hidden flex-shrink-0 group relative cursor-pointer"
            onClick={handleTrackClick}
          >
            {currentTrack ? (
              <>
                <Image
                  src={
                    currentTrack.album.images[0]?.url || "/default-artist.png"
                  }
                  width={56}
                  height={56}
                  alt={currentTrack.name}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ChevronUp className="h-5 w-5 text-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {currentTrack ? (
              pathname?.includes("/Games/artist-quiz/") ? (
                <>
                  <h4 className="text-white text-sm font-medium truncate">
                    Guess the Song!
                  </h4>
                  <div className="text-zinc-400 text-xs truncate">
                    Playing from Quiz
                  </div>
                </>
              ) : (
                <>
                  <h4
                    className="text-white text-sm font-medium truncate hover:underline cursor-pointer"
                    onClick={handleTrackClick}
                  >
                    {currentTrack.name}
                  </h4>
                  <div className="text-zinc-400 text-xs truncate flex items-center gap-1">
                    {currentTrack.artists.map((artist, index) => (
                      <span
                        key={artist.id}
                        className="inline-flex items-center"
                      >
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
                </>
              )
            ) : (
              <>
                <h4 className="text-white text-sm font-medium">
                  Connecting to Spotify...
                </h4>
                <p className="text-zinc-400 text-xs">Setting up player</p>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 flex-shrink-0 transition-all duration-200"
            onClick={handleToggleSave}
            disabled={!currentTrack || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin text-green-500" />
            ) : isSaved ? (
              <Heart className="h-4 w-4 fill-green-500 text-green-500 animate-in zoom-in-50 duration-200" />
            ) : (
              <Heart className="h-4 w-4 hover:scale-110 transition-transform" />
            )}
          </Button>
        </div>

        {/* Center Section - Player Controls */}
        <div className="flex flex-col items-center justify-center max-w-[722px] w-[40%]">
          {/* Control Buttons */}
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 transition-all"
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={previousTrack}
              className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 transition-all"
              disabled={!isReady}
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </Button>

            <Button
              onClick={handlePlayPause}
              size="icon"
              className="bg-white hover:bg-green-500 hover:scale-105 text-black h-8 w-8 rounded-full transition-all"
              disabled={!isReady}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 ml-0.5 fill-current" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextTrack}
              className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 transition-all"
              disabled={!isReady}
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={`h-8 w-8 transition-all ${
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
                <Repeat1 className="h-4 w-4" />
              ) : (
                <Repeat className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[11px] text-zinc-400 w-10 text-right tabular-nums">
              {formatTime(position)}
            </span>
            <Slider
              value={[position]}
              max={duration}
              step={1000}
              onValueChange={handleSeek}
              className="flex-1 cursor-pointer"
              disabled={!isReady || duration === 0}
            />
            <span className="text-[11px] text-zinc-400 w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Section - Additional Controls */}
        <div className="flex items-center justify-end gap-2 min-w-[240px] w-[30%]">
          <Sheet open={isLyricsSheetOpen} onOpenChange={setIsLyricsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 hidden lg:flex transition-all"
                onClick={handleLyricsClick}
                disabled={!currentTrack}
              >
                <Mic2 className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
              <SheetHeader className="space-y-4 flex-shrink-0">
                {currentTrack && (
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden">
                      <Image
                        src={
                          currentTrack.album?.images[0]?.url ||
                          "/default-artist.png"
                        }
                        width={64}
                        height={64}
                        className="object-cover"
                        alt={currentTrack.name}
                      />
                    </div>
                    <div>
                      <SheetTitle className="text-white text-lg font-semibold">
                        {currentTrack.name}
                      </SheetTitle>
                      <p className="text-zinc-400 text-sm">
                        by{" "}
                        {currentTrack.artists
                          .map((artist) => artist.name)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </SheetHeader>
              <div className="flex-1 overflow-hidden mt-6">
                {loadingLyrics ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                    <span className="ml-3 text-zinc-400">
                      Loading lyrics...
                    </span>
                  </div>
                ) : syncedLyrics && syncedLyrics.length > 0 ? (
                  <div
                    ref={lyricsContainerRef}
                    className="bg-zinc-800/30 rounded-lg p-4 h-full overflow-y-auto scroll-smooth"
                    style={{ maxHeight: "calc(100vh - 200px)" }}
                  >
                    <div className="space-y-3 pb-32">
                      {syncedLyrics.map((line, index) => (
                        <div
                          key={index}
                          data-index={index}
                          className={`text-sm leading-relaxed transition-all duration-300 py-1 ${
                            index === currentLyricIndex
                              ? "text-green-400 font-semibold text-lg scale-105"
                              : index < currentLyricIndex
                              ? "text-zinc-500"
                              : "text-zinc-300"
                          }`}
                        >
                          {line.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-zinc-800/30 rounded-lg p-4 h-full overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 200px)" }}
                  >
                    <pre className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {lyrics}
                    </pre>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 hidden lg:flex transition-all"
            onClick={handleQueueClick}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleMute}
            className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 transition-all"
            disabled={!isReady}
          >
            {isMuted || localVolume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <Slider
            value={[localVolume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24 cursor-pointer hidden lg:flex"
            disabled={!isReady}
          />

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-green-400 hover:bg-zinc-800 h-8 w-8 hidden lg:flex transition-all"
            onClick={handleFullScreenClick}
            disabled={!currentTrack}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Overlays - Only show on initial connection */}
      {isConnecting && !hasConnected && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent" />
            <span className="text-sm">Connecting to Spotify Player...</span>
          </div>
        </div>
      )}
      {!isReady && !isConnecting && hasConnected && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-zinc-400 text-sm">
            Player not ready. Please refresh the page.
          </div>
        </div>
      )}
    </div>
  );
};
