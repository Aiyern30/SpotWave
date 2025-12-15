"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button, Slider } from "@/components/ui";
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
  Mic2,
  List,
  Maximize2,
  ChevronUp,
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

export const MusicPlayer = () => {
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
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [isVisible, setIsVisible] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsVisible(!!currentTrack || isConnecting);
  }, [currentTrack, isConnecting]);

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
      } else {
        await saveTracksForUser([currentTrack.id]);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Failed to toggle track save status:", error);
    }
    setIsSaving(false);
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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 lg:left-16 right-0 bg-black border-t border-zinc-800 z-40">
      <div className="h-[90px] flex items-center justify-between px-4 gap-4">
        {/* Left Section - Track Info */}
        <div className="flex items-center gap-3 min-w-[240px] w-[30%]">
          <div className="w-14 h-14 rounded overflow-hidden flex-shrink-0 group relative">
            {currentTrack ? (
              <>
                <Image
                  src={currentTrack.album.images[0]?.url || "/default-artist.png"}
                  width={56}
                  height={56}
                  alt={currentTrack.name}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
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
              <>
                <h4 className="text-white text-sm font-medium truncate hover:underline cursor-pointer">
                  {currentTrack.name}
                </h4>
                <p className="text-zinc-400 text-xs truncate hover:underline cursor-pointer">
                  {currentTrack.artists.map((artist) => artist.name).join(", ")}
                </p>
              </>
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
            className="text-zinc-400 hover:text-white h-8 w-8 flex-shrink-0"
            onClick={handleToggleSave}
            disabled={!currentTrack || isSaving}
          >
            {isSaved ? (
              <Heart className="h-4 w-4 fill-green-500 text-green-500" />
            ) : (
              <Heart className="h-4 w-4" />
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
              className="text-zinc-400 hover:text-white h-8 w-8"
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={previousTrack}
              className="text-zinc-400 hover:text-white h-8 w-8"
              disabled={!isReady}
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </Button>

            <Button
              onClick={handlePlayPause}
              size="icon"
              className="bg-white hover:bg-white/90 hover:scale-105 text-black h-8 w-8 rounded-full"
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
              className="text-zinc-400 hover:text-white h-8 w-8"
              disabled={!isReady}
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white h-8 w-8"
            >
              <Repeat className="h-4 w-4" />
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
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white h-8 w-8 hidden lg:flex"
          >
            <Mic2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white h-8 w-8 hidden lg:flex"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleMute}
            className="text-zinc-400 hover:text-white h-8 w-8"
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
            className="text-zinc-400 hover:text-white h-8 w-8 hidden lg:flex"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Overlays */}
      {isConnecting && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent" />
            <span className="text-sm">Connecting to Spotify Player...</span>
          </div>
        </div>
      )}
      {!isReady && !isConnecting && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-zinc-400 text-sm">
            Player not ready. Please refresh the page.
          </div>
        </div>
      )}
    </div>
  );
};
