"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  Shuffle,
  Repeat,
  Minimize2,
  Loader2,
  X,
} from "lucide-react";
import {
  checkUserSavedTracks,
  saveTracksForUser,
  removeTracksFromUser,
} from "@/lib/spotify";

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const FullScreenPlayer = ({ isOpen, onClose }: FullScreenPlayerProps) => {
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
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-zinc-900 via-zinc-800 to-black z-50 flex flex-col items-center justify-center p-8">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-green-400 h-10 w-10"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Album Art */}
      <div className="flex-1 flex items-center justify-center max-w-2xl w-full">
        <div className="relative w-full aspect-square max-w-xl">
          <Image
            src={currentTrack.album.images[0]?.url || "/default-artist.png"}
            fill
            className="object-cover rounded-2xl shadow-2xl"
            alt={currentTrack.name}
            priority
          />
        </div>
      </div>

      {/* Track Info & Controls */}
      <div className="w-full max-w-2xl space-y-8 mt-8">
        {/* Track Info */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white truncate">
            {currentTrack.name}
          </h1>
          <p className="text-xl text-zinc-400">
            {currentTrack.artists.map((artist) => artist.name).join(", ")}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[position]}
            max={duration}
            step={1000}
            onValueChange={(val) => seekTo(val[0])}
            className="cursor-pointer"
            disabled={!isReady || duration === 0}
          />
          <div className="flex justify-between text-sm text-zinc-400">
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
            className="text-zinc-400 hover:text-white h-12 w-12"
            disabled={!currentTrack || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
            ) : isSaved ? (
              <Heart className="h-6 w-6 fill-green-500 text-green-500" />
            ) : (
              <Heart className="h-6 w-6" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white h-12 w-12"
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={previousTrack}
            className="text-white hover:text-green-400 h-14 w-14"
            disabled={!isReady}
          >
            <SkipBack className="h-7 w-7 fill-current" />
          </Button>

          <Button
            onClick={isPlaying ? pauseTrack : resumeTrack}
            size="icon"
            className="bg-white hover:bg-white/90 hover:scale-105 text-black h-16 w-16 rounded-full"
            disabled={!isReady}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 fill-current" />
            ) : (
              <Play className="h-8 w-8 ml-1 fill-current" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextTrack}
            className="text-white hover:text-green-400 h-14 w-14"
            disabled={!isReady}
          >
            <SkipForward className="h-7 w-7 fill-current" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white h-12 w-12"
          >
            <Repeat className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMute}
              className="text-zinc-400 hover:text-white h-12 w-12"
            >
              {isMuted || localVolume === 0 ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>
            <Slider
              value={[localVolume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-32 cursor-pointer"
              disabled={!isReady}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
