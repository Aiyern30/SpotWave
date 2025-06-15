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
  MoreHorizontal,
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
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3 z-50">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Track Info */}
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
            {currentTrack ? (
              <Image
                src={currentTrack.album.images[0]?.url || "/default-artist.png"}
                width={56}
                height={56}
                alt={currentTrack.name}
                className="object-cover"
              />
            ) : (
              <div className="w-14 h-14 bg-zinc-800 rounded-md flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {currentTrack ? (
              <>
                <h4 className="text-white font-medium truncate text-sm">
                  {currentTrack.name}
                </h4>
                <p className="text-zinc-400 text-xs truncate">
                  {currentTrack.artists.map((artist) => artist.name).join(", ")}
                </p>
              </>
            ) : (
              <>
                <h4 className="text-white font-medium text-sm">
                  Connecting to Spotify...
                </h4>
                <p className="text-zinc-400 text-xs">
                  Please wait while we set up your player
                </p>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white flex-shrink-0"
            onClick={handleToggleSave}
            disabled={!currentTrack || isSaving}
          >
            {isSaved ? (
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            ) : (
              <HeartOff className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center space-y-2 flex-1 max-w-md">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={previousTrack}
              className="text-zinc-400 hover:text-white"
              disabled={!isReady}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              onClick={handlePlayPause}
              size="icon"
              className="bg-white text-black hover:bg-white/90 w-8 h-8"
              disabled={!isReady}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextTrack}
              className="text-zinc-400 hover:text-white"
              disabled={!isReady}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center space-x-2 w-full">
            <span className="text-xs text-zinc-400 w-10 text-right">
              {formatTime(position)}
            </span>
            <Slider
              value={[position]}
              max={duration}
              step={1000}
              onValueChange={handleSeek}
              className="flex-1"
              disabled={!isReady || duration === 0}
            />
            <span className="text-xs text-zinc-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center space-x-2 flex-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMute}
              className="text-zinc-400 hover:text-white"
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
              className="w-24"
              disabled={!isReady}
            />
          </div>
        </div>
      </div>

      {/* Status Overlays */}
      {isConnecting && (
        <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-zinc-300">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent" />
            <span className="text-sm">Connecting to Spotify Player...</span>
          </div>
        </div>
      )}
      {!isReady && !isConnecting && (
        <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center">
          <div className="text-zinc-400 text-sm">
            Player not ready. Please refresh the page.
          </div>
        </div>
      )}
    </div>
  );
};
