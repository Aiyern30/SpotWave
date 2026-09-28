"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useFullScreenPlayer } from "@/contexts/FullScreenPlayerContext";
import { useMiniPlayer, type MiniPlayerDesign } from "@/contexts/MiniPlayerContext";
import { Button } from "@/components/ui/Button";
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
  X,
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
  { id: "deck", label: "Deck", blurb: "Tape-deck bar" },
  { id: "card", label: "Glass Card", blurb: "Full artwork" },
  { id: "pill", label: "Pill", blurb: "Minimal" },
];

/** Returns readable text color (#111 or #fff) against a given hex background. */
function getContrastColor(hex: string): string {
  try {
    const c = hex.replace("#", "");
    const full = c.length === 3 ? c.split("").map((ch) => ch + ch).join("") : c;
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? "#111111" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

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

  const router = useRouter();
  const { currentTheme } = useTheme();
  const themeColor = currentTheme?.color || "#22c55e";
  const contrastColor = getContrastColor(themeColor);

  const handleTrackClick = useCallback(() => {
    if (currentTrack?.album?.id) {
      router.push(
        `/Albums/${currentTrack.album.id}?name=${encodeURIComponent(
          currentTrack.album.name
        )}`
      );
      try {
        window.focus();
      } catch { }
    }
  }, [currentTrack?.album?.id, currentTrack?.album?.name, router]);

  const handleArtistClick = useCallback((artistId: string, artistNameArg: string) => {
    if (artistId) {
      router.push(
        `/Artists/${artistId}?name=${encodeURIComponent(artistNameArg)}`
      );
      try {
        window.focus();
      } catch { }
    }
  }, [router]);

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
    themeColor,
    contrastColor,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePlayPause,
    handleToggleMute,
    handleToggleSave,
    seekToFraction,
    handleExpandOrPip,
    handleTrackClick,
    handleArtistClick,
    previousTrack,
    nextTrack,
    setVolume,
    setIsMuted,
    setIsShuffle,
    toggleRepeat,
  };
}

type CoreState = ReturnType<typeof useMiniPlayerCore>;

/** Renders artist name(s) as individually clickable links, comma-separated. */
function ArtistLinks({
  core,
  className,
}: {
  core: CoreState;
  className?: string;
}) {
  const artists = core.currentTrack?.artists as { id?: string; name: string }[] | undefined;

  if (!artists || artists.length === 0) {
    return <span className={className}>{core.artistName}</span>;
  }

  return (
    <span className={className}>
      {artists.map((artist, idx) => (
        <React.Fragment key={artist.id || `${artist.name}-${idx}`}>
          {idx > 0 && ", "}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (artist.id) core.handleArtistClick(artist.id, artist.name);
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && artist.id) {
                e.stopPropagation();
                core.handleArtistClick(artist.id, artist.name);
              }
            }}
            className="cursor-pointer hover:text-[var(--accent)] hover:underline transition-colors"
          >
            {artist.name}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

/** Small floating panel to switch between mini player designs. */
function DesignPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { design, setDesign } = useMiniPlayer();
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col rounded-[inherit] bg-black/85 p-3 backdrop-blur-md animate-in fade-in duration-150">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Choose design
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Close"
          className="h-5 w-5 text-zinc-400 hover:bg-transparent hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-2">
        {DESIGN_OPTIONS.map((opt) => {
          const active = design === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setDesign(opt.id);
                onClose();
              }}
              className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors cursor-pointer ${active
                ? "border-[var(--accent)] bg-white/10"
                : "border-white/10 hover:bg-white/5"
                }`}
            >
              <span className="flex items-center gap-1 text-xs font-semibold text-white">
                {opt.label}
                {active && <Check className="h-3 w-3 text-[var(--accent)]" />}
              </span>
              <span className="mt-0.5 text-[10px] leading-tight text-zinc-400">
                {opt.blurb}
              </span>
            </button>
          );
        })}
      </div>
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
      style={{
        ...(core.isPip
          ? { position: "fixed" as const, inset: 0, padding: "10px", boxSizing: "border-box" as const }
          : {
            transform: core.coords ? `translate3d(${core.coords.x}px, ${core.coords.y}px, 0)` : "none",
            visibility: core.coords ? ("visible" as const) : ("hidden" as const),
          }),
        ["--accent" as any]: core.themeColor,
      }}
      className={`select-none bg-[#1B1A17] text-[#F2EAD7] flex flex-col justify-center ${core.isPip
        ? ""
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Close"
          className="h-4 w-4 p-0 text-[#8A7960] hover:text-[#C0453A] hover:bg-transparent"
        >
          <X className="h-3 w-3" />
        </Button>
        <GripVertical className="h-3 w-3 text-[#4a4638] rotate-90" />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowDesignPicker((v) => !v)}
            title="Change design"
            className={`h-4 w-4 p-0 hover:bg-transparent ${showDesignPicker ? "text-[var(--accent)]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}
          >
            <Palette className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowSecondaryRow((v) => !v)}
            title="More controls"
            className={`h-4 w-4 p-0 hover:bg-transparent ${showSecondaryRow ? "text-[var(--accent)]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}
          >
            <SlidersHorizontal className="h-3 w-3" />
          </Button>
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
            <h4
              role="button"
              tabIndex={0}
              onClick={core.handleTrackClick}
              className="truncate text-sm font-semibold text-[#F2EAD7] leading-tight cursor-pointer hover:text-[var(--accent)] hover:underline transition-colors"
            >
              {core.trackTitle}
            </h4>
            <span className="shrink-0 text-[10px] font-mono tabular-nums text-[#8A7960]">
              {formatTime(core.estimatedPosition)} / {formatTime(core.duration)}
            </span>
          </div>
          <ArtistLinks core={core} className="block truncate text-[11px] text-[#8A7960] mb-1.5" />
          <div ref={tickBarRef} onClick={handleTickBarClick} className="flex h-3 items-center gap-[2px] cursor-pointer">
            {ticks.map((i) => (
              <div
                key={i}
                className="flex-1 rounded-[1px] transition-all"
                style={{ height: i < filledTicks ? "10px" : "6px", backgroundColor: i < filledTicks ? core.themeColor : "#3a362c" }}
              />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.previousTrack}
            disabled={!core.currentTrack}
            title="Previous"
            className="h-7 w-7 text-[#F2EAD7] hover:text-[var(--accent)] hover:bg-transparent hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.handlePlayPause}
            disabled={!core.currentTrack}
            title={core.isPlaying ? "Pause" : "Play"}
            style={{ backgroundColor: core.themeColor, color: core.contrastColor }}
            className="flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 hover:brightness-105 shrink-0"
          >
            {core.isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 ml-0.5 fill-current" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.nextTrack}
            disabled={!core.currentTrack}
            title="Next"
            className="h-7 w-7 text-[#F2EAD7] hover:text-[var(--accent)] hover:bg-transparent hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={core.handleExpandOrPip}
          title={core.isPip ? "Full Screen" : "Picture in Picture"}
          className="h-7 w-7 shrink-0 text-[#8A7960] hover:text-[var(--accent)] hover:bg-transparent hover:scale-110 active:scale-95 transition-all"
        >
          {core.isPip ? <Maximize2 className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {showSecondaryRow && (
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-[#242219] border border-[#3a362c] px-3 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.handleToggleMute}
            title={core.isMuted ? "Unmute" : "Mute"}
            className="h-6 w-6 shrink-0 text-[#8A7960] hover:text-[#F2EAD7] hover:bg-transparent"
          >
            {core.isMuted ? <VolumeX className="h-3.5 w-3.5 text-[#C0453A]" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <input
            type="range" min="0" max="1" step="0.01" value={core.volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              core.setVolume(val);
              if (val > 0 && core.isMuted) core.setIsMuted(false);
            }}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[#3a362c] accent-[var(--accent)] shrink-0"
          />
          <div className="h-4 w-px bg-[#3a362c] shrink-0" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => core.setIsShuffle((p) => !p)}
            title="Shuffle"
            className={`h-6 w-6 shrink-0 hover:bg-transparent ${core.isShuffle ? "text-[var(--accent)]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.toggleRepeat}
            title={`Repeat: ${core.repeatMode}`}
            className={`h-6 w-6 shrink-0 hover:bg-transparent ${core.repeatMode !== "off" ? "text-[var(--accent)]" : "text-[#8A7960] hover:text-[#F2EAD7]"}`}
          >
            {core.repeatMode === "track" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.handleToggleSave}
            disabled={!core.currentTrack || core.isSaving}
            title={core.isSaved ? "Saved" : "Save"}
            className="h-6 w-6 shrink-0 text-[#8A7960] hover:text-[#F2EAD7] hover:bg-transparent disabled:opacity-50"
          >
            <Heart className="h-3.5 w-3.5" style={core.isSaved ? { color: core.themeColor, fill: core.themeColor } : undefined} />
          </Button>
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
      style={{
        ...(core.isPip
          ? { position: "fixed" as const, inset: 0, padding: "12px", boxSizing: "border-box" as const }
          : {
            transform: core.coords ? `translate3d(${core.coords.x}px, ${core.coords.y}px, 0)` : "none",
            visibility: core.coords ? ("visible" as const) : ("hidden" as const),
          }),
        ["--accent" as any]: core.themeColor,
      }}
      className={`select-none bg-[#121214] text-white flex flex-col justify-between ${core.isPip
        ? ""
        : "fixed top-0 left-0 z-[90] w-[340px] rounded-[28px] border border-white/10 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl touch-none animate-in fade-in zoom-in-95 duration-200"
        }`}
    >
      <div
        onPointerDown={core.handlePointerDown}
        onPointerMove={core.handlePointerMove}
        onPointerUp={core.handlePointerUp}
        className="flex h-7 items-center justify-between px-1 cursor-grab active:cursor-grabbing shrink-0"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Close"
          className="h-3.5 w-3.5 p-0 rounded-full bg-[#ff5f56] hover:brightness-110 hover:bg-[#ff5f56] active:scale-95"
        />
        <GripHorizontal className="h-4 w-4 text-zinc-500" />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowDesignPicker((v) => !v)}
            title="Change design"
            className={`h-6 w-6 hover:bg-transparent ${showDesignPicker ? "text-[var(--accent)]" : "text-zinc-400 hover:text-white"}`}
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowVolumeSlider((v) => !v)}
            title="Volume"
            className="h-6 w-6 text-zinc-400 hover:text-white hover:bg-transparent"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-[var(--accent)]"
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
          <Button type="button" variant="ghost" size="icon" onClick={core.handleToggleMute} title={core.isMuted ? "Unmute" : "Mute"} className="h-8 w-8 text-white/80 hover:text-white hover:bg-transparent hover:scale-110 active:scale-95 transition-all">
            {core.isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => core.setIsShuffle((p) => !p)}
            title="Shuffle"
            className={`h-8 w-8 hover:bg-transparent hover:scale-110 active:scale-95 transition-all ${core.isShuffle ? "text-[var(--accent)]" : "text-white/80 hover:text-white"}`}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={core.previousTrack} disabled={!core.currentTrack} title="Previous" className="h-9 w-9 text-white hover:text-[var(--accent)] hover:bg-transparent hover:scale-110 active:scale-95 transition-all disabled:opacity-40">
            <SkipBack className="h-5 w-5 fill-current" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.handlePlayPause}
            disabled={!core.currentTrack}
            title={core.isPlaying ? "Pause" : "Play"}
            style={{ backgroundColor: core.themeColor, color: core.contrastColor }}
            className="flex h-13 w-13 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 hover:brightness-105 shrink-0"
          >
            {core.isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 ml-0.5 fill-current" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={core.nextTrack} disabled={!core.currentTrack} title="Next" className="h-9 w-9 text-white hover:text-[var(--accent)] hover:bg-transparent hover:scale-110 active:scale-95 transition-all disabled:opacity-40">
            <SkipForward className="h-5 w-5 fill-current" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={core.toggleRepeat}
            title={`Repeat: ${core.repeatMode}`}
            className={`h-8 w-8 hover:bg-transparent hover:scale-110 active:scale-95 transition-all ${core.repeatMode !== "off" ? "text-[var(--accent)]" : "text-white/80 hover:text-white"}`}
          >
            {core.repeatMode === "track" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={core.handleExpandOrPip} title={core.isPip ? "Full Screen" : "Picture in Picture"} className="h-8 w-8 text-white/80 hover:text-white hover:bg-transparent hover:scale-110 active:scale-95 transition-all">
            {core.isPip ? <Maximize2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-1 px-1 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-zinc-400">
          <span>{formatTime(core.estimatedPosition)}</span>
          <span>{formatTime(core.duration)}</span>
        </div>
        <div ref={progressBarRef} onClick={handleScrubberClick} className="group relative mt-1 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${core.progressPercent}%`, backgroundColor: core.themeColor }} />
          <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${core.progressPercent}% - 6px)` }} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between px-1 shrink-0">
        <div className="min-w-0 flex-1 pr-2">
          <h4
            role="button"
            tabIndex={0}
            onClick={core.handleTrackClick}
            className="truncate text-base font-bold text-white tracking-tight leading-tight cursor-pointer hover:text-[var(--accent)] hover:underline transition-colors"
          >
            {core.trackTitle}
          </h4>
          <ArtistLinks core={core} className="block truncate text-xs text-zinc-400 mt-0.5" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={core.handleToggleSave}
          disabled={!core.currentTrack || core.isSaving}
          title={core.isSaved ? "Saved" : "Save"}
          className="h-8 w-8 shrink-0 text-zinc-400 hover:text-white hover:bg-transparent disabled:opacity-50"
        >
          {core.isSaved ? (
            <CheckCircle2 className="h-5 w-5" style={{ color: core.themeColor, fill: `${core.themeColor}33` }} />
          ) : (
            <PlusCircle className="h-5 w-5" />
          )}
        </Button>
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
      style={{
        ...(core.isPip
          ? { position: "fixed" as const, inset: 0, padding: "10px", boxSizing: "border-box" as const }
          : {
            transform: core.coords ? `translate3d(${core.coords.x}px, ${core.coords.y}px, 0)` : "none",
            visibility: core.coords ? ("visible" as const) : ("hidden" as const),
          }),
        ["--accent" as any]: core.themeColor,
      }}
      className={`select-none bg-[#181818] text-white transition-all duration-200 ${core.isPip
        ? "flex flex-col justify-center"
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
            <Button type="button" variant="ghost" size="icon" onClick={onClose} title="Close" className="h-5 w-5 text-zinc-500 hover:text-red-400 hover:bg-transparent">
              <X className="h-3 w-3" />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowDesignPicker((v) => !v)}
                title="Change design"
                className={`h-5 w-5 hover:bg-transparent ${showDesignPicker ? "text-[var(--accent)]" : "text-zinc-500 hover:text-white"}`}
              >
                <Palette className="h-3 w-3" />
              </Button>
              {!core.isPip && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setExpanded(false)} title="Collapse" className="h-5 w-5 text-zinc-500 hover:text-white hover:bg-transparent">
                  <span className="text-xs">⟲</span>
                </Button>
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
              <h4
                role="button"
                tabIndex={0}
                onClick={core.handleTrackClick}
                className="truncate text-xs font-semibold leading-tight cursor-pointer hover:text-[var(--accent)] hover:underline transition-colors"
              >
                {core.trackTitle}
              </h4>
              <ArtistLinks core={core} className="block truncate text-[10px] text-zinc-400" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={core.handleExpandOrPip}
              title={core.isPip ? "Full Screen" : "Picture in Picture"}
              className="h-6 w-6 shrink-0 text-zinc-500 hover:text-[var(--accent)] hover:bg-transparent"
            >
              {core.isPip ? <Maximize2 className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div ref={progressBarRef} onClick={handleScrubberClick} className="mt-2.5 h-1 w-full cursor-pointer rounded-full bg-white/15">
            <div className="h-full rounded-full" style={{ width: `${core.progressPercent}%`, backgroundColor: core.themeColor }} />
          </div>

          <div className="mt-2 flex items-center justify-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={core.previousTrack} disabled={!core.currentTrack} className="h-7 w-7 text-white hover:text-[var(--accent)] hover:bg-transparent hover:scale-110 active:scale-95 transition-all disabled:opacity-30">
              <SkipBack className="h-4 w-4 fill-current" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={core.handlePlayPause}
              disabled={!core.currentTrack}
              style={{ backgroundColor: core.themeColor, color: core.contrastColor }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {core.isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={core.nextTrack} disabled={!core.currentTrack} className="h-7 w-7 text-white hover:text-[var(--accent)] hover:bg-transparent hover:scale-110 active:scale-95 transition-all disabled:opacity-30">
              <SkipForward className="h-4 w-4 fill-current" />
            </Button>
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