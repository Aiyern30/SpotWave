"use client";

import LyricsPanel from "@/components/LyricsPanel";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFullScreenPlayer } from "@/contexts/FullScreenPlayerContext";
import {
  Button,
  Slider,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  MonitorSmartphone,
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
  const searchParams = useSearchParams();
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
    activeDevice,
    deviceId,
  } = usePlayer();
  const { isFullScreenOpen } = useFullScreenPlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [isVisible, setIsVisible] = useState(false);
  const [hasConnected, setHasConnected] = useState(false); // Track if ever connected
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLyricsSheetOpen, setIsLyricsSheetOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [estimatedPosition, setEstimatedPosition] = useState(position);

  // Sync estimated position with global position (source of truth)
  useEffect(() => {
    setEstimatedPosition(position);
  }, [position]);

  // Interpolate position every 100ms for smooth UI updates
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const interval = setInterval(() => {
      setEstimatedPosition((prev) => Math.min(prev + 100, duration));
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, duration]);

  const isQuizPage =
    pathname?.startsWith("/Games/artist-quiz/") ||
    pathname === "/Games/liked-songs" ||
    pathname?.startsWith("/Games/playlist-quiz/") ||
    (pathname === "/Games/ai-generated" && searchParams.get("mode") === "quiz");

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
          if (Array.isArray(saved)) {
            setIsSaved(saved[0]);
          } else {
            setIsSaved(false);
          }
        } catch (error) {
          console.warn("Saving check failed silently:", error);
          setIsSaved(false);
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
      setEstimatedPosition(newPosition[0]); // Optimistic update
      seekTo(newPosition[0]);
    },
    [seekTo]
  );

  const handleTrackClick = () => {
    if (isQuizPage) return; // Disable clicking during quiz
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
      if (isQuizPage) return; // Disable clicking during quiz
      router.push(
        `/Artists/${artistId}?name=${encodeURIComponent(artistName)}`
      );
    };

  const handleExitQuizNavigation = (href: string) => {
    setPendingHref(href);
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    if (pendingHref) {
      router.push(pendingHref);
    }
    setShowExitDialog(false);
    setPendingHref(null);
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

  // Don't show the docked player on the landing/login callback pages
  const hideOnPaths = ["/", "/callback"];
  if (!isVisible || isFullScreenOpen || hideOnPaths.includes(pathname || ""))
    return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-zinc-800 z-[60] transition-all duration-300 cursor-pointer md:cursor-default"
      onClick={(event) => {
        if (event.currentTarget.contains(event.target as Node) && window.innerWidth < 768) handleFullScreenClick();
      }}
    >
      {/* Mobile Top Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-800 md:hidden">
        <div
          className="h-full bg-brand transition-all duration-300"
          style={{
            width:
              duration > 0 ? `${(estimatedPosition / duration) * 100}%` : "0%",
          }}
        />
      </div>

      <div className="h-[68px] md:h-[90px] flex items-center justify-between px-3 md:px-4 gap-2 md:gap-4">
        {/* Left Section - Track Info */}
        <div className="flex items-center gap-2.5 md:gap-3 md:min-w-[240px] md:w-[30%] min-w-0 flex-1 overflow-hidden">
          <div
            className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded overflow-hidden flex-shrink-0 group relative cursor-pointer shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handleTrackClick();
            }}
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
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            {currentTrack ? (
              isQuizPage ? (
                <>
                  <h4 className="text-white text-[13px] md:text-sm font-medium truncate">
                    Guess the Song!
                  </h4>
                  <div className="text-zinc-400 text-[11px] md:text-xs truncate">
                    Playing from Quiz
                  </div>
                </>
              ) : (
                <>
                  <h4
                    className="text-white text-[13px] md:text-sm font-medium truncate hover:underline cursor-pointer"
                    onClick={handleTrackClick}
                  >
                    {currentTrack.name}
                  </h4>
                  <div className="text-zinc-400 text-[11px] md:text-xs truncate flex items-center gap-1">
                    {currentTrack.artists.map((artist, index) => (
                      <span
                        key={artist.id}
                        className="inline-flex items-center min-w-0"
                      >
                        <span
                          className="hover:underline hover:text-white cursor-pointer transition-colors truncate"
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
                <h4 className="text-white text-[13px] md:text-sm font-medium truncate">
                  Connecting to Spotify...
                </h4>
                <p className="text-zinc-400 text-[11px] md:text-xs truncate">
                  Setting up player
                </p>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 flex-shrink-0 transition-all duration-200 hidden sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSave();
            }}
            disabled={!currentTrack || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
            ) : isSaved ? (
              <Heart className="h-4 w-4 fill-brand text-brand animate-in zoom-in-50 duration-200" />
            ) : (
              <Heart className="h-4 w-4 hover:scale-110 transition-transform" />
            )}
          </Button>
        </div>

        {/* Center Section - Desktop Player Controls */}
        <div className="hidden md:flex flex-col items-center justify-center max-w-[722px] w-[40%]">
          {/* Control Buttons */}
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 transition-all"
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={previousTrack}
              className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 transition-all"
              disabled={!isReady}
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </Button>

            <Button
              onClick={handlePlayPause}
              size="icon"
              className="bg-white hover:bg-brand hover:scale-105 text-black h-8 w-8 rounded-full transition-all"
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
              className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 transition-all"
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
                  ? "text-zinc-400 hover:text-brand hover:bg-zinc-800"
                  : "text-brand hover:text-brand/80 hover:bg-zinc-800"
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
              {formatTime(estimatedPosition)}
            </span>
            <Slider
              value={[estimatedPosition]}
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

        {/* Right Section - Additional Controls & Mobile Minimal Controls */}
        <div className="flex items-center justify-end gap-1 md:gap-2 md:min-w-[240px] md:w-[30%] flex-shrink-0">
          {/* Mobile Only Minimal Controls */}
          <div className="flex md:hidden items-center gap-0.5">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              size="icon"
              variant="ghost"
              className="text-white hover:text-brand h-9 w-9"
              disabled={!isReady}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 ml-0.5 fill-current" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                nextTrack();
              }}
              className="text-zinc-400 hover:text-white h-9 w-9"
              disabled={!isReady}
            >
              <SkipForward className="h-4.5 w-4.5 fill-current" />
            </Button>
          </div>
          {!isQuizPage && (
            <>
              <Sheet
                open={isLyricsSheetOpen}
                onOpenChange={setIsLyricsSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-11 w-11 flex transition-colors"
                    aria-label="Open lyrics"
                    onClick={(event) => event.stopPropagation()}
                    disabled={!currentTrack}
                  >
                    <Mic2 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent aria-describedby={undefined} overlayClassName="z-[70] motion-reduce:animate-none" className="z-[70] motion-reduce:animate-none flex h-[100dvh] w-full flex-col gap-0 overflow-hidden border-zinc-800 bg-zinc-950 p-0 pb-[env(safe-area-inset-bottom)] sm:max-w-[480px] [&>button]:h-11 [&>button]:w-11 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
                  <SheetHeader className="shrink-0 border-b border-white/5 px-5 py-6 pr-16 text-left">
                    <p className="text-xs font-medium text-zinc-400">Lyrics</p>
                    <SheetTitle className="truncate text-lg font-semibold text-zinc-100">{currentTrack?.name}</SheetTitle>
                    <p className="truncate text-sm text-zinc-400">{currentTrack?.artists.map(artist => artist.name).join(", ")}</p>
                  </SheetHeader>
                  <div className="min-h-0 flex-1"><LyricsPanel active={isLyricsSheetOpen} /></div>
                </SheetContent>
              </Sheet>

              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 hidden md:flex transition-all"
                onClick={handleQueueClick}
              >
                <List className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 hidden md:flex transition-all"
                onClick={handleFullScreenClick}
                disabled={!currentTrack}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleMute();
            }}
            className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 transition-all hidden md:flex"
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
            className="w-24 cursor-pointer hidden md:flex"
            disabled={!isReady}
          />
        </div>
      </div>

      {/* Active Device Indicator */}
      {activeDevice && activeDevice.id !== deviceId && (
        <>
          <div className="absolute -top-8 left-2 right-2 bg-brand text-black text-[10px] font-bold px-2.5 py-1 rounded-md flex md:hidden items-center gap-1.5 shadow-lg z-[70] animate-in slide-in-from-bottom-2">
            <MonitorSmartphone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Playing on {activeDevice.name}</span>
          </div>
          <div className="absolute bottom-0 right-0 bg-brand text-black text-[11px] font-bold px-3 py-1 rounded-tl-lg hidden md:flex items-center gap-1.5 shadow-lg z-[70] animate-in slide-in-from-bottom-2">
            <MonitorSmartphone className="w-3.5 h-3.5" />
            <span>Playing on {activeDevice.name}</span>
          </div>
        </>
      )}

      {/* Status Overlays - Only show on initial connection */}
      {isConnecting && !hasConnected && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand border-t-transparent" />
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
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Quiz?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Your current progress in this quiz will be lost. Are you sure you
              want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800">
              Continue Quiz
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExit}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Exit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
