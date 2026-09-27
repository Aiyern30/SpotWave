"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFullScreenPlayer } from "@/contexts/FullScreenPlayerContext";
import { useMiniPlayer, type MiniPlayerDesign } from "@/contexts/MiniPlayerContext";
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
  Heart,
  GripHorizontal,
  GripVertical,
  Music,
  Palette,
  Check,
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

const TICK_COUNT = 40;

const DESIGN_OPTIONS: { id: MiniPlayerDesign; label: string; blurb: string }[] = [
  { id: "deck", label: "Deck", blurb: "Tape-deck bar, spinning disc" },
  { id: "card", label: "Glass Card", blurb: "Full art, overlay controls" },
  { id: "pill", label: "Pill", blurb: "Minimal, expands on click" },
];

/**
 * Publishes now-playing info + transport controls to the OS Media Session
 * (lock screen, keyboard media keys, Control Center / Windows overlay).
 * Works across every browser, independent of Document PiP support.
 */
function useMediaSession({
  track,
  isPlaying,
  duration,
  position,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
}: {
  track: {
    name?: string;
    artists?: { name: string }[];
    album?: { name?: string; images?: { url: string }[] };
  } | null | undefined;
  isPlaying: boolean;
  duration: number;
  position: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (ms: number) => void;
}) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    if (!track) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name || "Unknown track",
        artist: track.artists?.map((a) => a.name).join(", ") || "",
        album: track.album?.name || "",
        artwork: (track.album?.images || []).map((img) => ({
          src: img.url,
          sizes: "512x512",
          type: "image/jpeg",
        })),
      });
    } catch (e) {
      console.warn("MediaMetadata failed:", e);
    }

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("previoustrack", onPrevious);
    try {
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null) onSeek(Math.floor(details.seekTime * 1000));
      });
    } catch { }

    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("seekto", null);
      } catch { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.name, track, isPlaying, onPlay, onPause, onNext, onPrevious, onSeek]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!duration || !navigator.mediaSession.setPositionState) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration / 1000,
        position: Math.min(position / 1000, duration / 1000),
        playbackRate: isPlaying ? 1 : 0,
      });
    } catch { }
  }, [position, duration, isPlaying]);
}

/**
 * Shared playback/drag/state logic used by every visual design.
 * Keeps the three design components purely presentational.
 */
function useMiniPlayerCore(isPip: boolean) {
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
  const { openMiniPlayer, isPipSupported } = useMiniPlayer();

  const [estimatedPosition, setEstimatedPosition] = useState(position);
  const [isMuted, setIsMuted] = useState(volume === 0);
  const [prevVolume, setPrevVolume] = useState(volume || 0.5);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useMediaSession({
    track: currentTrack,
    isPlaying,
    duration,
    position: estimatedPosition,
    onPlay: resumeTrack,
    onPause: pauseTrack,
    onNext: nextTrack,
    onPrevious: previousTrack,
    onSeek: seekTo,
  });

  useEffect(() => {
    setEstimatedPosition(position);
  }, [position]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setEstimatedPosition((prev) => (prev >= duration ? duration : prev + 250));
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  useEffect(() => {
    if (!currentTrack?.id) return;
    let mounted = true;
    (async () => {
      try {
        const saved = await checkUserSavedTracks([currentTrack.id]);
        if (mounted && Array.isArray(saved)) setIsSaved(saved[0]);
      } catch {
        if (mounted) setIsSaved(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentTrack?.id]);

  useEffect(() => {
    if (isPip || typeof window === "undefined") return;
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
    } catch { }
    const defaultX = Math.max(16, window.innerWidth - 400);
    const defaultY = Math.max(16, window.innerHeight - 460);
    setCoords({ x: defaultX, y: defaultY });
  }, [isPip]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPip || !containerRef.current) return;
    if ((e.target as HTMLElement).closest("button, input, a")) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: coords?.x ?? 0,
      startY: coords?.y ?? 0,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || isPip) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const width = containerRef.current?.offsetWidth || 340;
    const height = containerRef.current?.offsetHeight || 200;
    const newX = Math.max(8, Math.min(window.innerWidth - width - 8, dragStartRef.current.startX + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - height - 8, dragStartRef.current.startY + dy));
    const updated = { x: newX, y: newY };
    setCoords(updated);
    try {
      localStorage.setItem("mini-player-coords", JSON.stringify(updated));
    } catch { }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handlePlayPause = () => {
    if (isPlaying) pauseTrack();
    else resumeTrack();
  };

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

  const seekToFraction = (fraction: number) => {
    if (duration <= 0) return;
    const newPos = Math.floor(Math.max(0, Math.min(1, fraction)) * duration);
    setEstimatedPosition(newPos);
    seekTo(newPos);
  };

  const handleExpandOrPip = () => {
    if (!isPip && isPipSupported) void openMiniPlayer();
    else setIsFullScreenOpen(true);
  };

  const albumImage =
    currentTrack?.album?.images?.[0]?.url || currentTrack?.album?.images?.[1]?.url || "";
  const trackTitle = currentTrack?.name || "No track playing";
  const artistName = currentTrack?.artists?.map((a) => a.name).join(", ") || "SpotWave";
  const progressPercent = duration > 0 ? Math.min(100, (estimatedPosition / duration) * 100) : 0;

  return {
    currentTrack,
    isPlaying,
    estimatedPosition,
    duration,
    volume,
    isMuted,
    isShuffle,
    isSaved,
    isSaving,
    repeatMode,
    coords,
    containerRef,
    isPip,
    isPipSupported,
    albumImage,
    trackTitle,
    artistName,
    progressPercent,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePlayPause,
    handleToggleMute,
    handleToggleSave,
    seekToFraction,
    handleExpandOrPip,
    previousTrack,
    nextTrack,
    setVolume,
    setIsMuted,
    setIsShuffle,
    toggleRepeat,
  };
}

type CoreState = ReturnType<typeof useMiniPlayerCore>;

/** Small floating panel to switch between mini player designs. */
function DesignPicker({
  open,
  onClose,
  align = "right",
}: {
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
}) {
  const { design, setDesign } = useMiniPlayer();
  if (!open) return null;

  return (
    <div
      className={`absolute top-6 z-10 w-48 rounded-xl border border-white/10 bg-[#1c1c1e] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${align === "right" ? "right-0" : "left-0"
        }`}
    >
      {DESIGN_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => {
            setDesign(opt.id);
            onClose();
          }}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-white/5 transition-colors cursor-pointer"
        >
          <span>
            <span className="block text-xs font-semibold text-white">{opt.label}</span>
            <span className="block text-[10px] text-zinc-400">{opt.blurb}</span>
          </span>
          {design === opt.id && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Design 1: Deck — horizontal tape-deck bar with spinning disc      */
/* ---------------------------------------------------------------- */
function DeckDesign({ core, onClose }: { core: CoreState; onClose: () => void }) {
  const [showSecondaryRow, setShowSecondaryRow] = useState(false);
  const [showDesignPicker, setShowDesignPicker] = useState(false);
  const tickBarRef = useRef<HTMLDivElement>(null);
  const ticks = useMemo(() => Array.from({ length: TICK_COUNT }, (_, i) => i), []);
  const filledTicks = Math.round((core.progressPercent / 100) * TICK_COUNT);

  const handleTickBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tickBarRef.current) return;
    const rect = tickBarRef.current.getBoundingClientRect();
    core.seekToFraction((e.clientX - rect.left) / rect.width);
  };

  return (
    <div
      ref={core.containerRef}
      style={
        core.isPip
          ? { width: "100%", height: "100%", padding: "10px", boxSizing: "border-box" }
          : {
            transform: core.coords ? `translate3d(${core.coords.x}px, ${core.coords.y}px, 0)` : "none",
            visibility: core.coords ? "visible" : "hidden",
          }
      }
      className={`relative select-none bg-[#1B1A17] text-[#F2EAD7] flex flex-col ${core.isPip
          ? "w-full h-full min-h-screen"
          : "fixed top-0 left-0 z-[90] w-[440px] rounded-2xl border border-[#3a362c] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] touch-none animate-in fade-in slide-in-from-bottom-4 duration-200"
        }`}
    >
      <style>{`@keyframes spw-vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div
        onPointerDown={core.handlePointerDown}
        onPointerMove={core.handlePointerMove}
        onPointerUp={core.handlePointerUp}
        className="flex h-4 items-center justify-between px-0.5 cursor-grab active:cursor-grabbing shrink-0"
      >
        <button type="button" onClick={onClose} title="Close" className="text-[#8A7960] hover:text-[#C0453A] transition-colors cursor-pointer">
          ×
        </button>
        <GripVertical className="h-3 w-3 text-[#4a4638] rotate-90" />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowDesignPicker((v) => !v)}
            title="Change design"
            className={`transition-colors cursor-pointer ${showDesignPicker ? "text-[#E8A33D]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}
          >
            <Palette className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setShowSecondaryRow((v) => !v)}
            title="More controls"
            className={`transition-colors cursor-pointer ${showSecondaryRow ? "text-[#E8A33D]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}
          >
            <SlidersHorizontal className="h-3 w-3" />
          </button>
        </div>
      </div>

      <DesignPicker open={showDesignPicker} onClose={() => setShowDesignPicker(false)} />

      <div className="flex items-center gap-3 pt-1.5 px-0.5">
        <div className="relative shrink-0 h-14 w-14 rounded-full border-2 border-[#3a362c] bg-[#0F0E0C] overflow-hidden shadow-inner">
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{ animation: "spw-vinyl-spin 5s linear infinite", animationPlayState: core.isPlaying ? "running" : "paused" }}
          >
            {core.albumImage ? (
              <img src={core.albumImage} alt={core.trackTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#242219] text-[#4a4638]">
                <Music className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1B1A17] border border-[#5a5646]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-[#F2EAD7] leading-tight">{core.trackTitle}</h4>
            <span className="shrink-0 text-[10px] font-mono tabular-nums text-[#8A7960]">
              {formatTime(core.estimatedPosition)} / {formatTime(core.duration)}
            </span>
          </div>
          <p className="truncate text-[11px] text-[#8A7960] mb-1.5">{core.artistName}</p>
          <div ref={tickBarRef} onClick={handleTickBarClick} className="flex h-3 items-center gap-[2px] cursor-pointer">
            {ticks.map((i) => (
              <div
                key={i}
                className="flex-1 rounded-[1px] transition-all"
                style={{ height: i < filledTicks ? "10px" : "6px", backgroundColor: i < filledTicks ? "#E8A33D" : "#3a362c" }}
              />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={core.previousTrack} disabled={!core.currentTrack} title="Previous" className="text-[#F2EAD7] hover:text-[#E8A33D] hover:scale-110 active:scale-95 transition-all disabled:opacity-30 cursor-pointer p-1">
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
          <button type="button" onClick={core.handlePlayPause} disabled={!core.currentTrack} title={core.isPlaying ? "Pause" : "Play"} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8A33D] text-[#1B1A17] shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0">
            {core.isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
          </button>
          <button type="button" onClick={core.nextTrack} disabled={!core.currentTrack} title="Next" className="text-[#F2EAD7] hover:text-[#E8A33D] hover:scale-110 active:scale-95 transition-all disabled:opacity-30 cursor-pointer p-1">
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>

        <button type="button" onClick={core.handleExpandOrPip} title={core.isPip ? "Full Screen" : "Picture in Picture"} className="shrink-0 text-[#8A7960] hover:text-[#F2EAD7] hover:scale-110 active:scale-95 transition-all cursor-pointer p-1">
          {core.isPip ? <Maximize2 className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
        </button>
      </div>

      {showSecondaryRow && (
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-[#242219] border border-[#3a362c] px-3 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <button type="button" onClick={core.handleToggleMute} title={core.isMuted ? "Unmute" : "Mute"} className="text-[#8A7960] hover:text-[#F2EAD7] transition-colors cursor-pointer shrink-0">
            {core.isMuted ? <VolumeX className="h-3.5 w-3.5 text-[#C0453A]" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={core.volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              core.setVolume(val);
              if (val > 0 && core.isMuted) core.setIsMuted(false);
            }}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[#3a362c] accent-[#E8A33D] shrink-0"
          />
          <div className="h-4 w-px bg-[#3a362c] shrink-0" />
          <button type="button" onClick={() => core.setIsShuffle((p) => !p)} title="Shuffle" className={`transition-colors cursor-pointer shrink-0 ${core.isShuffle ? "text-[#E8A33D]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}>
            <Shuffle className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={core.toggleRepeat} title={`Repeat: ${core.repeatMode}`} className={`transition-colors cursor-pointer shrink-0 ${core.repeatMode !== "off" ? "text-[#E8A33D]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}>
            {core.repeatMode === "track" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
          </button>
          <div className="flex-1" />
          <button type="button" onClick={core.handleToggleSave} disabled={!core.currentTrack || core.isSaving} title={core.isSaved ? "Saved" : "Save"} className="text-[#8A7960] hover:text-[#F2EAD7] transition-colors disabled:opacity-50 cursor-pointer shrink-0">
            <Heart className={`h-3.5 w-3.5 ${core.isSaved ? "fill-[#C0453A] text-[#C0453A]" : ""}`} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Design 2: Glass Card — full-bleed art, overlay controls           */
/* ---------------------------------------------------------------- */
function CardDesign({ core, onClose }: { core: CoreState; onClose: () => void }) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showDesignPicker, setShowDesignPicker] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    core.seekToFraction((e.clientX - rect.left) / rect.width);
  };

  return (
    <div
      ref={core.containerRef}
      style={
        core.isPip
          ? { width: "100%", height: "100%", padding: "12px", boxSizing: "border-box" }
          : {
            transform: core.coords ? `translate3d(${core.coords.x}px, ${core.coords.y}px, 0)` : "none",
            visibility: core.coords ? "visible" : "hidden",
          }
      }
      className={`relative select-none bg-[#121214] text-white flex flex-col justify-between ${core.isPip
          ? "w-full h-full min-h-screen"
          : "fixed top-0 left-0 z-[90] w-[340px] rounded-[28px] border border-white/10 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl touch-none animate-in fade-in zoom-in-95 duration-200"
        }`}
    >
      <div
        onPointerDown={core.handlePointerDown}
        onPointerMove={core.handlePointerMove}
        onPointerUp={core.handlePointerUp}
        className="flex h-7 items-center justify-between px-1 cursor-grab active:cursor-grabbing shrink-0"
      >
        <button type="button" onClick={onClose} title="Close" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ff5f56] hover:brightness-110 active:scale-95 transition-all cursor-pointer" />
        <GripHorizontal className="h-4 w-4 text-zinc-500" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowDesignPicker((v) => !v)} title="Change design" className={`transition-colors cursor-pointer ${showDesignPicker ? "text-brand" : "text-zinc-400 hover:text-white"}`}>
            <Palette className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setShowVolumeSlider((v) => !v)} title="Volume" className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <DesignPicker open={showDesignPicker} onClose={() => setShowDesignPicker(false)} />

      {showVolumeSlider && (
        <div className="my-1.5 flex items-center gap-2 rounded-xl bg-zinc-900 border border-white/10 px-3 py-1.5 shrink-0">
          <Volume2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <input
            type="range" min="0" max="1" step="0.01" value={core.volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              core.setVolume(val);
              if (val > 0 && core.isMuted) core.setIsMuted(false);
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-white"
          />
          <span className="text-[10px] tabular-nums text-zinc-400 w-7 text-right shrink-0">{Math.round(core.volume * 100)}%</span>
        </div>
      )}

      <div className="relative my-2 aspect-square w-full flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
        {core.albumImage ? (
          <img src={core.albumImage} alt={core.trackTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
            <Music className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-between px-3">
          <button type="button" onClick={core.handleToggleMute} title={core.isMuted ? "Unmute" : "Mute"} className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer p-1">
            {core.isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => core.setIsShuffle((p) => !p)} title="Shuffle" className={`transition-all hover:scale-110 active:scale-95 cursor-pointer p-1 ${core.isShuffle ? "text-brand" : "text-white/80 hover:text-white"}`}>
            <Shuffle className="h-4 w-4" />
          </button>
          <button type="button" onClick={core.previousTrack} disabled={!core.currentTrack} title="Previous" className="text-white hover:scale-110 active:scale-95 transition-all disabled:opacity-40 cursor-pointer p-1">
            <SkipBack className="h-5 w-5 fill-current" />
          </button>
          <button type="button" onClick={core.handlePlayPause} disabled={!core.currentTrack} title={core.isPlaying ? "Pause" : "Play"} className="flex h-13 w-13 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0">
            {core.isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 ml-0.5 fill-current" />}
          </button>
          <button type="button" onClick={core.nextTrack} disabled={!core.currentTrack} title="Next" className="text-white hover:scale-110 active:scale-95 transition-all disabled:opacity-40 cursor-pointer p-1">
            <SkipForward className="h-5 w-5 fill-current" />
          </button>
          <button type="button" onClick={core.toggleRepeat} title={`Repeat: ${core.repeatMode}`} className={`transition-all hover:scale-110 active:scale-95 cursor-pointer p-1 ${core.repeatMode !== "off" ? "text-brand" : "text-white/80 hover:text-white"}`}>
            {core.repeatMode === "track" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
          <button type="button" onClick={core.handleExpandOrPip} title={core.isPip ? "Full Screen" : "Picture in Picture"} className="text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer p-1">
            {core.isPip ? <Maximize2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-1 px-1 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-zinc-400">
          <span>{formatTime(core.estimatedPosition)}</span>
          <span>{formatTime(core.duration)}</span>
        </div>
        <div ref={progressBarRef} onClick={handleScrubberClick} className="group relative mt-1 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2">
          <div className="h-full rounded-full bg-white transition-all group-hover:bg-brand" style={{ width: `${core.progressPercent}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${core.progressPercent}% - 6px)` }} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between px-1 shrink-0">
        <div className="min-w-0 flex-1 pr-2">
          <h4 className="truncate text-base font-bold text-white tracking-tight leading-tight">{core.trackTitle}</h4>
          <p className="truncate text-xs text-zinc-400 mt-0.5">{core.artistName}</p>
        </div>
        <button type="button" onClick={core.handleToggleSave} disabled={!core.currentTrack || core.isSaving} title={core.isSaved ? "Saved" : "Save"} className="text-zinc-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0">
          {core.isSaved ? <CheckCircle2 className="h-5 w-5 text-brand fill-brand/20" /> : <PlusCircle className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Design 3: Pill — minimal, expands on click                        */
/* ---------------------------------------------------------------- */
function PillDesign({ core, onClose }: { core: CoreState; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showDesignPicker, setShowDesignPicker] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    core.seekToFraction((e.clientX - rect.left) / rect.width);
  };

  return (
    <div
      ref={core.containerRef}
      style={
        core.isPip
          ? { width: "100%", height: "100%", padding: "10px", boxSizing: "border-box" }
          : {
            transform: core.coords ? `translate3d(${core.coords.x}px, ${core.coords.y}px, 0)` : "none",
            visibility: core.coords ? "visible" : "hidden",
          }
      }
      className={`relative select-none bg-[#181818] text-white transition-all duration-200 ${core.isPip
          ? "w-full h-full min-h-screen flex flex-col justify-center"
          : `fixed top-0 left-0 z-[90] rounded-full border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] touch-none animate-in fade-in zoom-in-95 duration-200 ${expanded ? "w-[300px] rounded-3xl" : "w-16"
          }`
        }`}
    >
      {!expanded && !core.isPip ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          onPointerDown={core.handlePointerDown}
          onPointerMove={core.handlePointerMove}
          onPointerUp={core.handlePointerUp}
          title="Expand"
          className="relative h-16 w-16 rounded-full overflow-hidden cursor-grab active:cursor-grabbing block"
        >
          {core.albumImage ? (
            <img src={core.albumImage} alt={core.trackTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
              <Music className="h-6 w-6" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
            {core.isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 ml-0.5 fill-current" />}
          </div>
        </button>
      ) : (
        <div className="p-3">
          <div
            onPointerDown={core.handlePointerDown}
            onPointerMove={core.handlePointerMove}
            onPointerUp={core.handlePointerUp}
            className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing"
          >
            <button type="button" onClick={onClose} title="Close" className="text-zinc-500 hover:text-red-400 transition-colors text-xs cursor-pointer">✕</button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowDesignPicker((v) => !v)} title="Change design" className={`transition-colors cursor-pointer ${showDesignPicker ? "text-brand" : "text-zinc-500 hover:text-white"}`}>
                <Palette className="h-3 w-3" />
              </button>
              {!core.isPip && (
                <button type="button" onClick={() => setExpanded(false)} title="Collapse" className="text-zinc-500 hover:text-white transition-colors text-xs cursor-pointer">
                  ⟲
                </button>
              )}
            </div>
          </div>

          <DesignPicker open={showDesignPicker} onClose={() => setShowDesignPicker(false)} />

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl overflow-hidden shrink-0 bg-zinc-800">
              {core.albumImage ? (
                <img src={core.albumImage} alt={core.trackTitle} className="w-full h-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                  <Music className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-semibold leading-tight">{core.trackTitle}</h4>
              <p className="truncate text-[10px] text-zinc-400">{core.artistName}</p>
            </div>
            <button type="button" onClick={core.handleExpandOrPip} title={core.isPip ? "Full Screen" : "Picture in Picture"} className="shrink-0 text-zinc-500 hover:text-white transition-colors cursor-pointer">
              {core.isPip ? <Maximize2 className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div ref={progressBarRef} onClick={handleScrubberClick} className="mt-2.5 h-1 w-full cursor-pointer rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white" style={{ width: `${core.progressPercent}%` }} />
          </div>

          <div className="mt-2 flex items-center justify-center gap-4">
            <button type="button" onClick={core.previousTrack} disabled={!core.currentTrack} className="text-white hover:scale-110 active:scale-95 transition-all disabled:opacity-30 cursor-pointer">
              <SkipBack className="h-4 w-4 fill-current" />
            </button>
            <button type="button" onClick={core.handlePlayPause} disabled={!core.currentTrack} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-all hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer">
              {core.isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />}
            </button>
            <button type="button" onClick={core.nextTrack} disabled={!core.currentTrack} className="text-white hover:scale-110 active:scale-95 transition-all disabled:opacity-30 cursor-pointer">
              <SkipForward className="h-4 w-4 fill-current" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Wrapper: picks the active design, shared across in-page & PiP     */
/* ---------------------------------------------------------------- */
function MiniPlayerContent({ isPip, onClose }: { isPip: boolean; onClose: () => void }) {
  const { design } = useMiniPlayer();
  const core = useMiniPlayerCore(isPip);

  if (design === "card") return <CardDesign core={core} onClose={onClose} />;
  if (design === "pill") return <PillDesign core={core} onClose={onClose} />;
  return <DeckDesign core={core} onClose={onClose} />;
}

export default function MiniPlayer() {
  const { isMiniPlayerOpen, pipWindow, closeMiniPlayer } = useMiniPlayer();

  if (pipWindow) {
    return createPortal(
      <MiniPlayerContent isPip={true} onClose={closeMiniPlayer} />,
      pipWindow.document.body
    );
  }

  if (isMiniPlayerOpen) {
    return <MiniPlayerContent isPip={false} onClose={closeMiniPlayer} />;
  }

  return null;
}