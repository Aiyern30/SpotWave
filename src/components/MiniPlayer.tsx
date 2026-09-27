"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFullScreenPlayer } from "@/contexts/FullScreenPlayerContext";
import { useMiniPlayer } from "@/contexts/MiniPlayerContext";
import {
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Maximize2,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  GripHorizontal,
  Music,
} from "lucide-react";
import {
  checkUserSavedTracks,
  saveTracksForUser,
  removeTracksFromUser,
} from "@/lib/spotify";

const formatTime = (ms: number) => {
  if (!ms || isNaN(ms)) return "0:00";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function MiniPlayer() {
  const { isMiniPlayerOpen, setIsMiniPlayerOpen } = useMiniPlayer();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    setVolume,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    seekTo,
    repeatMode,
    toggleRepeat,
  } = usePlayer();
  const { setIsFullScreenOpen } = useFullScreenPlayer();

  const [estimatedPosition, setEstimatedPosition] = useState(position);
  const [isMuted, setIsMuted] = useState(volume === 0);
  const [prevVolume, setPrevVolume] = useState(volume || 0.5);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Floating window position (x, y)
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Sync estimated position with authoritative position
  useEffect(() => {
    setEstimatedPosition(position);
  }, [position]);

  // Position interpolation during playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setEstimatedPosition((prev) => {
        if (prev >= duration) return duration;
        return prev + 250;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Check saved state for current track
  useEffect(() => {
    if (!currentTrack?.id) return;
    let mounted = true;
    (async () => {
      try {
        const saved = await checkUserSavedTracks([currentTrack.id]);
        if (mounted && Array.isArray(saved)) {
          setIsSaved(saved[0]);
        }
      } catch {
        if (mounted) setIsSaved(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentTrack?.id]);

  // Default coordinates: bottom right
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedCoords = localStorage.getItem("mini-player-coords");
      if (savedCoords) {
        const parsed = JSON.parse(savedCoords);
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          parsed.x >= 0 &&
          parsed.y >= 0 &&
          parsed.x < window.innerWidth &&
          parsed.y < window.innerHeight
        ) {
          setCoords(parsed);
          return;
        }
      }
    } catch {}

    const defaultX = Math.max(16, window.innerWidth - 370);
    const defaultY = Math.max(80, window.innerHeight - 520);
    setCoords({ x: defaultX, y: defaultY });
  }, []);

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    // Don't drag if clicking buttons or slider
    if ((e.target as HTMLElement).closest("button, input, a")) return;

    isDraggingRef.current = true;
    const currentX = coords ? coords.x : 0;
    const currentY = coords ? coords.y : 0;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: currentX,
      startY: currentY,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const width = containerRef.current?.offsetWidth || 340;
    const height = containerRef.current?.offsetHeight || 440;

    const newX = Math.max(8, Math.min(window.innerWidth - width - 8, dragStartRef.current.startX + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - height - 8, dragStartRef.current.startY + dy));

    const updated = { x: newX, y: newY };
    setCoords(updated);
    try {
      localStorage.setItem("mini-player-coords", JSON.stringify(updated));
    } catch {}
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  // Mute toggle
  const handleToggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume > 0 ? prevVolume : 0.5);
      setIsMuted(false);
    } else {
      setPrevVolume(volume || 0.5);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Save / Like toggle
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
    } catch (e) {
      console.error("Failed to toggle save in mini player:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Scrubber seek
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newPos = Math.floor(percentage * duration);
    setEstimatedPosition(newPos);
    seekTo(newPos);
  };

  // Popout / Picture-in-Picture window or fullscreen
  const handlePopout = async () => {
    if (typeof window !== "undefined" && "documentPictureInPicture" in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 340,
          height: 460,
        });

        // Copy styles to PiP window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
            const style = document.createElement("style");
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch {
            const link = document.createElement("link");
            if (styleSheet.href) {
              link.rel = "stylesheet";
              link.type = styleSheet.type;
              link.media = styleSheet.media.toString();
              link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            }
          }
        });

        // Append container or clone into PiP
        const pipContainer = document.createElement("div");
        pipContainer.id = "pip-player-root";
        pipWindow.document.body.appendChild(pipContainer);
        pipWindow.document.body.className = "bg-black text-white m-0 p-0 flex items-center justify-center min-h-screen overflow-hidden";
        return;
      } catch (err) {
        console.warn("Document PiP failed, expanding to full screen instead:", err);
      }
    }

    // Fallback: Open full screen player
    setIsFullScreenOpen(true);
  };

  if (!isMiniPlayerOpen) return null;

  const albumImage =
    currentTrack?.album?.images?.[0]?.url ||
    currentTrack?.album?.images?.[1]?.url ||
    "/placeholder-album.png";
  const trackTitle = currentTrack?.name || "No track playing";
  const artistName =
    currentTrack?.artists?.map((a) => a.name).join(", ") || "SpotWave";
  const progressPercent = duration > 0 ? Math.min(100, (estimatedPosition / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      style={{
        transform: coords ? `translate3d(${coords.x}px, ${coords.y}px, 0)` : "none",
        visibility: coords ? "visible" : "hidden",
      }}
      className="fixed top-0 left-0 z-[90] w-[340px] select-none rounded-[28px] border border-white/10 bg-[#121214]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl transition-shadow duration-300 hover:shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.12)] touch-none animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top Header Bar */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex h-7 items-center justify-between px-1 cursor-grab active:cursor-grabbing"
      >
        {/* Red close dot */}
        <button
          type="button"
          onClick={() => setIsMiniPlayerOpen(false)}
          title="Close Mini Player"
          className="group relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ff5f56] hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-rose-900/40"
        >
          <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4a0000] leading-none transition-opacity">
            ×
          </span>
        </button>

        {/* Center Drag Handle */}
        <div className="flex items-center text-zinc-500 hover:text-zinc-300 transition-colors">
          <GripHorizontal className="h-4 w-4" />
        </div>

        {/* Right Settings / Visualizer Button */}
        <button
          type="button"
          onClick={() => setShowVolumeSlider((v) => !v)}
          title="Audio Controls"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quick Volume Slider Popover if toggled */}
      {showVolumeSlider && (
        <div className="my-2 flex items-center gap-2 rounded-xl bg-zinc-900/90 border border-white/10 px-3 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              if (val > 0 && isMuted) setIsMuted(false);
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-white"
          />
          <span className="text-[10px] tabular-nums text-zinc-400 w-7 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {/* Album Artwork Card with Centered Controls */}
      <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-2xl border border-white/10 shadow-lg group">
        {/* Album Artwork Image */}
        {currentTrack ? (
          <Image
            src={albumImage}
            alt={trackTitle}
            fill
            sizes="340px"
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
            <Music className="h-16 w-16" />
          </div>
        )}

        {/* Tint overlay gradient for high contrast playback controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

        {/* Controls Overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-3">
          {/* Mute button */}
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Shuffle button */}
          <button
            type="button"
            onClick={() => setIsShuffle((prev) => !prev)}
            title="Shuffle"
            className={`transition-all hover:scale-110 active:scale-95 ${
              isShuffle ? "text-brand" : "text-white/80 hover:text-white"
            }`}
          >
            <Shuffle className="h-4 w-4" />
          </button>

          {/* Previous track */}
          <button
            type="button"
            onClick={previousTrack}
            disabled={!currentTrack}
            title="Previous"
            className="text-white hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
          >
            <SkipBack className="h-5 w-5 fill-current" />
          </button>

          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={!currentTrack}
            title={isPlaying ? "Pause" : "Play"}
            className="flex h-13 w-13 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 hover:bg-zinc-100"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 ml-0.5 fill-current" />
            )}
          </button>

          {/* Next track */}
          <button
            type="button"
            onClick={nextTrack}
            disabled={!currentTrack}
            title="Next"
            className="text-white hover:scale-110 active:scale-95 transition-all disabled:opacity-40"
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </button>

          {/* Repeat button */}
          <button
            type="button"
            onClick={toggleRepeat}
            title={`Repeat: ${repeatMode}`}
            className={`transition-all hover:scale-110 active:scale-95 ${
              repeatMode !== "off" ? "text-brand" : "text-white/80 hover:text-white"
            }`}
          >
            {repeatMode === "track" ? (
              <Repeat1 className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </button>

          {/* Popout / Fullscreen button */}
          <button
            type="button"
            onClick={handlePopout}
            title="Expand player / Picture in Picture"
            className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar & Timers */}
      <div className="mt-3 px-1">
        <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-zinc-400">
          <span>{formatTime(estimatedPosition)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Scrubber */}
        <div
          ref={progressBarRef}
          onClick={handleScrubberClick}
          className="group relative mt-1.5 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2"
        >
          <div
            className="h-full rounded-full bg-white transition-all group-hover:bg-brand"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Draggable thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>
      </div>

      {/* Bottom Track Information Bar */}
      <div className="mt-3.5 flex items-center justify-between px-1">
        <div className="min-w-0 flex-1 pr-2">
          <h4 className="truncate text-base font-bold text-white tracking-tight leading-tight">
            {trackTitle}
          </h4>
          <p className="truncate text-xs text-zinc-400 mt-0.5">
            {artistName}
          </p>
        </div>

        {/* Add / Save to Library button */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={!currentTrack || isSaving}
            title={isSaved ? "Saved to Library" : "Save to Library"}
            className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {isSaved ? (
              <CheckCircle2 className="h-5 w-5 text-brand fill-brand/20" />
            ) : (
              <PlusCircle className="h-5 w-5 hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Window resize corner indicator */}
          <div
            className="text-zinc-600 cursor-se-resize select-none pl-1"
            title="Resize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
