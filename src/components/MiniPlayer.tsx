"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useFullScreenPlayer } from "@/contexts/FullScreenPlayerContext";
import { useMiniPlayer, type MiniPlayerDesign } from "@/contexts/MiniPlayerContext";
import styles from "./MiniPlayer.module.css";
import { SlidersHorizontal, Volume2, VolumeX, SkipBack, Play, Pause, SkipForward,
  Repeat, Repeat1, Maximize2, Heart, GripHorizontal, Music, Check, X } from "lucide-react";
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

const DESIGN_OPTIONS: { id: MiniPlayerDesign; label: string; blurb: string }[] = [
  { id: "deck", label: "Deck", blurb: "Horizontal controls" },
  { id: "card", label: "Artwork", blurb: "Album in focus" },
  { id: "pill", label: "Pill", blurb: "Soft and minimal" },
  { id: "gradient", label: "Gradient", blurb: "Your color, amplified" },
];

/** Chooses black or white using relative luminance for accent button contrast. */
function getContrastColor(hex: string): string {
  try {
    const c = hex.replace("#", "");
    const full = c.length === 3 ? c.split("").map((ch) => ch + ch).join("") : c;
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    const linear = [r, g, b].map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    return luminance > 0.179 ? "#000000" : "#ffffff";
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
  useEffect(() => { setIsMuted(volume === 0); }, [volume]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const draggedCoords = useRef<{ x: number; y: number } | null>(null);
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
      startX: containerRef.current.getBoundingClientRect().left,
      startY: containerRef.current.getBoundingClientRect().top,
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
    draggedCoords.current = updated;
    if (containerRef.current) containerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    if (draggedCoords.current) {
      setCoords(draggedCoords.current);
      try { localStorage.setItem("mini-player-coords", JSON.stringify(draggedCoords.current)); } catch {}
      draggedCoords.current = null;
    }
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
    toggleRepeat,
  };
}

type CoreState = ReturnType<typeof useMiniPlayerCore>;

/** Tracks the inner size of a window (used for the PiP window). */
function useWindowSize(win: Window | null) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!win) return;
    const update = () => setSize({ width: win.innerWidth, height: win.innerHeight });
    update();
    win.addEventListener("resize", update);
    return () => win.removeEventListener("resize", update);
  }, [win]);
  return size;
}

function MiniPlayerContent({ isPip, onClose }: { isPip: boolean; onClose: () => void }) {
  const { design, setDesign, pipWindow } = useMiniPlayer();
  const core = useMiniPlayerCore(isPip);
  const { width, height } = useWindowSize(isPip ? pipWindow : null);
  const [settings, setSettings] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const compact = isPip && width > 0 && (height < 180 || width < 260);

  // Keep the floating panel reachable after resizing or changing its layout.
  useEffect(() => {
    const node = core.containerRef.current;
    if (isPip || !node) return;
    const clamp = () => {
      const rect = node.getBoundingClientRect();
      const x = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));
      const y = Math.max(8, Math.min(rect.top, window.innerHeight - rect.height - 8));
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const observer = new ResizeObserver(clamp);
    observer.observe(node);
    window.addEventListener("resize", clamp);
    clamp();
    return () => { observer.disconnect(); window.removeEventListener("resize", clamp); };
  }, [isPip, core.containerRef, core.coords]);

  const closeSettings = () => { setSettings(false); settingsButton.current?.focus(); };
  const iconButton = (label: string, icon: React.ReactNode, action: () => void, extra = "", disabled = false) => (
    <button type="button" className={`${styles.iconButton} ${extra}`} aria-label={label} title={label} onClick={action} disabled={disabled}>{icon}</button>
  );
  const volumeControl = <div className={styles.volume}>
    {iconButton(core.volume === 0 ? "Unmute" : "Mute", core.volume === 0 ? <VolumeX /> : <Volume2 />, core.handleToggleMute)}
    <input type="range" aria-label="Volume" min="0" max="1" step="0.01" value={core.volume}
      aria-valuetext={`${Math.round(core.volume * 100)} percent`}
      onChange={e => core.setVolume(Number(e.target.value))} />
    <output>{Math.round(core.volume * 100)}%</output>
  </div>;

  return <div ref={core.containerRef} className={`${styles.shell} ${isPip ? styles.pip : styles.floating}`}
    data-design={design} data-compact={compact || undefined}
    style={{ "--accent": core.themeColor, "--on-accent": core.contrastColor,
      ...(!isPip ? { transform: core.coords ? `translate3d(${core.coords.x}px, ${core.coords.y}px, 0)` : undefined,
        visibility: core.coords ? "visible" : "hidden" } : {}) } as React.CSSProperties}>
    <section className={styles.surface} aria-label="Mini player" onKeyDown={e => { if (e.key === "Escape" && settings) closeSettings(); }}>
      <header className={styles.header}>
        <div className={styles.handle} onPointerDown={core.handlePointerDown} onPointerMove={core.handlePointerMove} onPointerUp={core.handlePointerUp} onPointerCancel={core.handlePointerUp}>
          <GripHorizontal /><span>NOW PLAYING</span>
        </div>
        <button ref={settingsButton} type="button" className={styles.iconButton} aria-label="Volume and appearance" title="Volume and appearance"
          aria-expanded={settings} onClick={() => setSettings(v => !v)}><SlidersHorizontal /></button>
        {iconButton("Expand player", <Maximize2 />, core.handleExpandOrPip, styles.expand)}
        {iconButton("Close mini player", <X />, onClose)}
      </header>
      {settings ? <div className={styles.settings}>
        <div className={styles.settingsHeading}><h2>Make it yours</h2><button type="button" onClick={closeSettings}>Done</button></div>
        <label className={styles.label}>Volume</label>
        {volumeControl}
        <fieldset className={styles.designs}><legend>Player design</legend>
          {DESIGN_OPTIONS.map(option => <label key={option.id} className={styles.option}>
            <input type="radio" name="mini-player-design" value={option.id} checked={design === option.id} onChange={() => setDesign(option.id)} />
            <span className={styles.preview} data-preview={option.id}><span /><i /><i /></span>
            <span><strong>{option.label}</strong><small>{option.blurb}</small></span>
            {design === option.id && <Check aria-hidden="true" />}
          </label>)}
        </fieldset>
        <p className={styles.hint}>Small windows switch to compact automatically. Your theme color follows you.</p>
      </div> : <div className={styles.content}>
        <div className={styles.artwork}>{core.albumImage ? <img src={core.albumImage} alt="" draggable={false} /> : <Music aria-hidden="true" />}</div>
        <div className={styles.track}>
          <button className={styles.title} title={core.trackTitle} onClick={core.handleTrackClick}>{core.trackTitle}</button>
          <div className={styles.artists}>{core.currentTrack?.artists?.length ? core.currentTrack.artists.map((artist, i) => <React.Fragment key={artist.id || i}>
            {i > 0 && ", "}<button onClick={() => core.handleArtistClick(artist.id, artist.name)}>{artist.name}</button>
          </React.Fragment>) : "Choose a song to get started"}</div>
        </div>
        <div className={styles.transport}>
          <button type="button" className={`${styles.iconButton} ${styles.secondary}`} aria-label={core.isSaved ? "Remove from liked songs" : "Like song"}
            aria-pressed={core.isSaved} disabled={!core.currentTrack || core.isSaving} onClick={core.handleToggleSave}><Heart fill={core.isSaved ? "currentColor" : "none"} /></button>
          {iconButton("Previous song", <SkipBack />, core.previousTrack, styles.previous, !core.currentTrack)}
          {iconButton(core.isPlaying ? "Pause" : "Play", core.isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />, core.handlePlayPause, styles.play, !core.currentTrack)}
          {iconButton("Next song", <SkipForward />, core.nextTrack, styles.next, !core.currentTrack)}
          <button type="button" className={`${styles.iconButton} ${styles.secondary}`} aria-label={`Repeat: ${core.repeatMode}. Change repeat mode`}
            aria-pressed={core.repeatMode !== "off"} disabled={!core.currentTrack} onClick={core.toggleRepeat}>{core.repeatMode === "track" ? <Repeat1 /> : <Repeat />}</button>
        </div>
        <div className={styles.timeline}>
          <input type="range" aria-label="Song position" aria-valuetext={`${formatTime(core.estimatedPosition)} of ${formatTime(core.duration)}`}
            min="0" max="100" step="0.1" value={core.progressPercent} disabled={!core.duration} onChange={e => core.seekToFraction(Number(e.target.value) / 100)} />
          <div><span>{formatTime(core.estimatedPosition)}</span><span>{formatTime(core.duration)}</span></div>
        </div>
        <div className={styles.footer}>{volumeControl}</div>
      </div>}
    </section>
  </div>;
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