"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button, Slider } from "@/components/ui";
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
  MoreHorizontal,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

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
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    isReady,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!!currentTrack);
  }, [currentTrack]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (vol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMute = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSeek = (newPosition: number[]) => {
    const pos = newPosition[0];
    seekTo(pos);
  };

  if (!isVisible || !currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3 z-50">
      <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* Track Info */}
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
            <Image
              src={currentTrack.album.images[0]?.url || "/default-artist.png"}
              width={56}
              height={56}
              alt={currentTrack.name}
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-white font-medium truncate text-sm">
              {currentTrack.name}
            </h4>
            <p className="text-zinc-400 text-xs truncate">
              {currentTrack.artists.map((artist) => artist.name).join(", ")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white flex-shrink-0"
          >
            <Heart className="h-4 w-4" />
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
            />
            <span className="text-xs text-zinc-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume and Additional Controls */}
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
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>
        </div>
      </div>

      {!isReady && (
        <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center">
          <div className="text-zinc-400 text-sm">Connecting to Spotify...</div>
        </div>
      )}
    </div>
  );
};
