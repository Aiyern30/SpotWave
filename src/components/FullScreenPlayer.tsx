"use client";

import LyricsPanel from "@/components/LyricsPanel";

import { SongTableRow } from "@/components/SongTableRow";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, Slider, Card, CardContent } from "@/components/ui";
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
  Repeat1,
  Loader2,
  X,
  Music,
  Clock,
  ImageIcon,
  FileText,
  Activity,
  TrendingUp,
  Mic,
  MicOff,
  Settings,
} from "lucide-react";
import {
  checkUserSavedTracks,
  saveTracksForUser,
  removeTracksFromUser,
} from "@/lib/spotify";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
}

interface TopTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
  album: {
    id: string;
    name: string;
    images: {
      url: string;
    }[];
    artists: {
      id: string;
      name: string;
    }[];
  };
}

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const FullScreenPlayer = ({
  isOpen,
  onClose,
}: FullScreenPlayerProps) => {
  const router = useRouter();
  const { currentTheme } = useTheme();
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
    playTrack,
    repeatMode,
    toggleRepeat,
    analyser: globalAnalyser,
    dataArray: globalDataArray,
    activeDevice,
    deviceId,
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const [viewMode, setViewMode] = useState<"image" | "lyrics" | "visualizer">(
    "image",
  );
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [loadingTopTracks, setLoadingTopTracks] = useState(false);

  const [wideLyrics, setWideLyrics] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setWideLyrics(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const [topTracksDisplayUI, setTopTracksDisplayUI] = useState<
    "Table" | "Grid"
  >("Table");
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | null
  >(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastBassRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);

  // Audio capture refs (for Share Audio/Mic)
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [captureMode, setCaptureMode] = useState<"none" | "mic" | "speaker">(
    "none",
  );
  const [useSpotifyAudio, setUseSpotifyAudio] = useState(true);

  const [sensitivity, setSensitivity] = useState(1.5);
  const [maxRipples, setMaxRipples] = useState(8);

  const [sidebarCompact, setSidebarCompact] = useState(true);

  // Smooth position interpolation for responsive slider
  const [estimatedPosition, setEstimatedPosition] = useState(position);

  // Sync estimated position with global position (source of truth)
  useEffect(() => {
    setEstimatedPosition(position);
  }, [position]);

  // Interpolate position every 100ms for smooth UI updates
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setEstimatedPosition((prev) => Math.min(prev + 100, duration));
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Visualizer settings Refs for stable animation loop
  const sensitivityRef = useRef(sensitivity);
  const maxRipplesRef = useRef(maxRipples);
  const viewModeRef = useRef(viewMode);
  const themeColorRef = useRef(currentTheme.color);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    maxRipplesRef.current = maxRipples;
  }, [maxRipples]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    // Clear the canvas that is no longer active
    const inactiveCanvas =
      viewMode === "visualizer" ? bgCanvasRef.current : canvasRef.current;
    if (inactiveCanvas) {
      const ctx = inactiveCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, inactiveCanvas.width, inactiveCanvas.height);
      }
    }
  }, [viewMode]);

  useEffect(() => {
    themeColorRef.current = currentTheme.color;
  }, [currentTheme.color]);

  const startListening = async (mode: "mic" | "speaker") => {
    try {
      let stream: MediaStream;
      if (mode === "speaker") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const videoTracks = stream.getVideoTracks();
        videoTracks.forEach((track) => track.stop());
        if (stream.getAudioTracks().length === 0) {
          throw new Error("No audio found in system stream.");
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      localStreamRef.current = stream;
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      if (audioContext.state === "suspended") await audioContext.resume();
      localAudioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      localAnalyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      localSourceRef.current = source;
      source.connect(analyser);

      setCaptureMode(mode);
      setUseSpotifyAudio(false);
    } catch (err) {
      console.error("Error setting up audio:", err);
      alert(
        err instanceof Error
          ? `Could not access ${mode === "mic" ? "microphone" : "audio"}: ${err.message}`
          : "Could not access audio source. Please ensure you have granted the necessary permissions.",
      );
    }
  };

  const stopListening = () => {
    if (localSourceRef.current) {
      localSourceRef.current.disconnect();
      localSourceRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localAudioContextRef.current) {
      localAudioContextRef.current.close();
      localAudioContextRef.current = null;
    }
    localAnalyserRef.current = null;
    setCaptureMode("none");
    setUseSpotifyAudio(true);
  };

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-compact");
    setSidebarCompact(stored !== "false");

    const handleStorage = () => {
      const updated = localStorage.getItem("sidebar-compact");
      setSidebarCompact(updated !== "false");
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  // Sync audio data to ref for stable animation loop
  useEffect(() => {
    dataRef.current = globalDataArray;
  }, [globalDataArray]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen || !currentTrack?.artists[0]?.id) return;

    const artistId = currentTrack.artists[0].id;
    if (artistId !== currentArtistId || topTracks.length === 0) {
      setCurrentArtistId(artistId);
      fetchTopTracks(artistId);
    }
  }, [
    isOpen,
    currentTrack?.artists[0]?.id,
    currentArtistId,
    topTracks.length,
  ]);

  const fetchTopTracks = async (artistId: string) => {
    setLoadingTopTracks(true);
    try {
      const token = localStorage.getItem("Token");
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();
      setTopTracks(data.tracks?.slice(0, 10) || []);
    } catch (error) {
      console.error("Error fetching top tracks:", error);
    } finally {
      setLoadingTopTracks(false);
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
    } catch (error) {
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

  const handlePlayPauseTopTrack = async (track: TopTrack) => {
    if (currentPlayingTrackId === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      await handlePlayTopTrack(track);
    }
  };

  const handlePlayTopTrack = async (track: TopTrack) => {
    setIsLoadingTrack(true);
    try {
      const token = localStorage.getItem("Token");
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${track.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const trackData = await response.json();

      await playTrack({
        id: trackData.id,
        name: trackData.name,
        artists: trackData.artists,
        album: {
          name: trackData.album.name,
          images: trackData.album.images,
          id: trackData.album.id,
          artists: trackData.album.artists,
          release_date: trackData.album.release_date || "",
          total_tracks: trackData.album.total_tracks || 0,
        },
        duration_ms: trackData.duration_ms,
        explicit: trackData.explicit || false,
        external_urls: { spotify: trackData.external_urls.spotify },
        popularity: trackData.popularity || 0,
        preview_url: trackData.preview_url || null,
        track_number: trackData.track_number || 0,
        disc_number: trackData.disc_number || 1,
        uri: trackData.uri,
      });

      setCurrentPlayingTrackId(trackData.id);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error playing track:", error);
    } finally {
      setIsLoadingTrack(false);
    }
  };

  useEffect(() => {
    if (currentTrack?.id) {
      setCurrentPlayingTrackId(currentTrack.id);
    }
  }, [currentTrack]);

  const isTrackPlaying = (trackId: string) => {
    return currentPlayingTrackId === trackId && isPlaying;
  };

  const handlePlayTopTrackWrapper = (trackId?: string) => {
    if (!trackId) return;
    const track = topTracks.find((t) => t.id === trackId);
    if (track) {
      handlePlayPauseTopTrack(track);
    }
  };

  const handleArtistClick =
    (artistId: string, artistName: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(
        `/Artists/${artistId}?name=${encodeURIComponent(artistName)}`,
      );
    };

  const trackImage = currentTrack?.album.images[0]?.url || "/default-artist.png";
  const trackTitle = currentTrack?.name || "Now Playing";
  const trackArtist = currentTrack?.artists.map((artist) => artist.name).join(", ") || "Spotify";
  const visualLabel = useSpotifyAudio
    ? "Spotify Audio"
    : captureMode === "mic"
      ? "Microphone"
      : captureMode === "speaker"
        ? "System Audio"
        : "Capture Off";
  const artGlow = 24 + sensitivity * 18;
  const artFrame = 10 + Math.round(maxRipples / 2);

  // Stable Animation Loop
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Clear canvases when stopped
      [canvasRef.current, bgCanvasRef.current].forEach((canvas) => {
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      });
      ripplesRef.current = [];
      return;
    }

    const handleResize = () => {
      [canvasRef.current, bgCanvasRef.current].forEach((canvas) => {
        if (canvas && canvas.parentElement) {
          const { clientWidth, clientHeight } = canvas.parentElement;
          if (clientWidth > 0 && clientHeight > 0) {
            canvas.width = clientWidth;
            canvas.height = clientHeight;
          }
        }
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const animate = () => {
      // Prioritize active canvas
      const isVisualizer = viewModeRef.current === "visualizer";
      const canvas = isVisualizer ? canvasRef.current : bgCanvasRef.current;

      if (!canvas) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // If dimensions are 0, try to resize again
      if (canvas.width === 0 || canvas.height === 0) {
        handleResize();
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas (Solid black like the reference for "sharp" look)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let data = dataRef.current;

      // Determine which analyser to use
      const activeAnalyser =
        !useSpotifyAudio && localAnalyserRef.current
          ? localAnalyserRef.current
          : globalAnalyser;

      // Physical analyser poll for maximum smoothness
      if (activeAnalyser) {
        // Ensure buffer matches analyser resolution
        if (!data || data.length !== activeAnalyser.frequencyBinCount) {
          data = new Uint8Array(activeAnalyser.frequencyBinCount);
          dataRef.current = data;
        }

        // Fetch to a temporary array so we don't overwrite synthetic context data with zeros
        const tempData = new Uint8Array(activeAnalyser.frequencyBinCount);
        activeAnalyser.getByteFrequencyData(tempData as any);

        const sum = tempData.reduce((a, b) => a + b, 0);
        if (sum > 0 || !useSpotifyAudio) {
          // Only overwrite if we got real data or we are using the mic
          for (let i = 0; i < data.length; i++) {
            data[i] = tempData[i];
          }
        }
      }

      if (!data || data.length === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const currentSensitivity = sensitivityRef.current;
      const currentMaxRipples = maxRipplesRef.current;

      // Metrics
      const average = data.reduce((a, b) => a + b, 0) / data.length;
      // Match SpotifyRippleVisualizer bass calculation (first 8 bins)
      const bass = data.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
      const treble = data.slice(32, 64).reduce((a, b) => a + b, 0) / 32;

      // Center Circle
      const baseRadius = 80;
      const dynamicRadius =
        baseRadius + (average / 255) * 40 * currentSensitivity;

      // Draw bars - Sample across the spectrum for more variety
      const numBars = 64;
      const angleStep = (Math.PI * 2) / numBars;
      const step = Math.floor(data.length / numBars); // Spread bars across the actual data length

      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      for (let i = 0; i < numBars; i++) {
        // Sample from different parts of the spectrum (Bass -> Mids -> Treble)
        const val = data[i * step] || 0;
        // Match SpotifyRippleVisualizer amplitude scaling (150)
        const amplitude = (val / 255) * 150 * currentSensitivity;

        const angle = i * angleStep;

        const x1 = centerX + Math.cos(angle) * dynamicRadius;
        const y1 = centerY + Math.sin(angle) * dynamicRadius;
        const x2 = centerX + Math.cos(angle) * (dynamicRadius + amplitude);
        const y2 = centerY + Math.sin(angle) * (dynamicRadius + amplitude);

        const hue = (i / numBars) * 360;
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw center gradients
      const hex = themeColorRef.current || "#ff0080";
      const r = parseInt(hex.slice(1, 3), 16) || 255;
      const g = parseInt(hex.slice(3, 5), 16) || 20;
      const b = parseInt(hex.slice(5, 7), 16) || 147;

      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        dynamicRadius,
      );
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.3)`);

      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius - 5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Add a subtle border to the center circle to ensure visibility even with no data
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ripples detection - Ported directly from SpotifyRippleVisualizer.tsx
      const bassThreshold = 50 * (2 / currentSensitivity);
      if (
        bass > bassThreshold &&
        ripplesRef.current.length < currentMaxRipples
      ) {
        const angle = Math.random() * Math.PI * 2;
        const dist = dynamicRadius + 20 + Math.random() * 50;
        ripplesRef.current.push({
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          radius: 0,
          maxRadius: 100 + (bass / 255) * 150,
          alpha: 1.0,
          color: `${r}, ${g}, ${b}`,
          speed: 2 + (bass / 255) * 3,
        });
      }
      lastBassRef.current = bass;

      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        ripple.radius += ripple.speed;
        ripple.alpha = 1 - ripple.radius / ripple.maxRadius;

        if (ripple.alpha > 0) {
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${ripple.color}, ${ripple.alpha})`;
          // Match the line thickness behavior of the reference visualizer
          ctx.lineWidth = 2 + (1 - ripple.alpha) * 3;
          ctx.stroke();
          return true;
        }
        return false;
      });

      // Treble particles
      if (treble > 180 && Math.random() > 0.6) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(
          centerX + (Math.random() - 0.5) * canvas.width * 0.7,
          centerY + (Math.random() - 0.5) * canvas.height * 0.7,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isOpen, isPlaying, viewMode, useSpotifyAudio, captureMode]);

  // Clean up audio capture only when the component unmounts or closes
  useEffect(() => {
    if (!isOpen) {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  if (!isOpen || !currentTrack) return null;

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-b from-zinc-900 via-zinc-800 to-black z-50 overflow-y-auto overflow-x-hidden px-3 md:px-4 py-4 sm:py-6 space-y-4 sm:space-y-8 no-scrollbar transition-all duration-300`}
    >
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 flex items-center gap-1 sm:gap-2 z-10">
        <div className="hidden lg:flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("visualizer")}
            className={`h-8 w-8 sm:h-10 sm:w-10 transition-all ${
              viewMode === "visualizer"
                ? "text-brand bg-zinc-800"
                : "text-white hover:text-brand hover:bg-zinc-800"
            }`}
            title="Visualizer"
          >
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("image")}
            className={`h-8 w-8 sm:h-10 sm:w-10 transition-all ${
              viewMode === "image"
                ? "text-brand bg-zinc-800"
                : "text-white hover:text-brand hover:bg-zinc-800"
            }`}
            title="Album Art"
          >
            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {(
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("lyrics")}
              className={`h-8 w-8 sm:h-10 sm:w-10 transition-all ${
                viewMode === "lyrics"
                  ? "text-brand bg-zinc-800"
                  : "text-white hover:text-brand hover:bg-zinc-800"
              }`}
              title="Lyrics"
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          <div className="w-px h-4 sm:h-6 bg-zinc-700 mx-1" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:text-brand hover:bg-zinc-800 h-8 w-8 sm:h-10 sm:w-10"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="relative w-full">
          {/* Visualizer View */}
          <div className={viewMode === "visualizer" ? "block" : "hidden"}>
            <div className="relative w-full aspect-square max-w-2xl mx-auto flex items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-black/45 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.22),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
              <div
                className="absolute inset-8 rounded-[1.75rem] border border-white/10 bg-black/30"
                style={{
                  boxShadow: `0 0 ${artGlow}px rgba(34, 197, 94, 0.18), inset 0 0 ${artGlow / 2}px rgba(255, 255, 255, 0.04)`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <div className="relative h-[72%] w-[72%] max-w-[480px]">
                  <div
                    className="absolute inset-0 rounded-full bg-emerald-400/20 blur-3xl"
                    style={{ opacity: 0.25 + sensitivity * 0.08 }}
                  />
                  <div
                    className="absolute -inset-4 rounded-[2rem] border border-white/10"
                    style={{
                      boxShadow: `0 0 ${artGlow}px rgba(34, 197, 94, 0.16)`,
                      borderRadius: `${28 + artFrame}px`,
                    }}
                  />
                  <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
                    <Image
                      src={trackImage}
                      alt={trackTitle}
                      fill
                      className="object-cover shadow-[0_0_80px_rgba(0,0,0,0.8)]"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/70">
                            Album Stage
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                            {trackTitle}
                          </h3>
                          <p className="mt-1 text-sm text-white/70">{trackArtist}</p>
                        </div>
                        <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 sm:block">
                          {visualLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {!isPlaying && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 bg-black/60 backdrop-blur-sm">
                  <Music className="h-20 w-20 text-brand mx-auto mb-4 opacity-50 animate-pulse" />
                  <p className="text-zinc-200 font-semibold text-lg mb-2">
                    Play music to see visualizations
                  </p>
                  <p className="text-zinc-400 text-sm">
                    Album art stage powered by Spotify playback
                  </p>
                </div>
              )}
              {isPlaying &&
                activeDevice &&
                activeDevice.id !== deviceId &&
                useSpotifyAudio && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 bg-black/70 backdrop-blur-md text-center">
                    <Activity className="h-16 w-16 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-200 font-semibold text-lg mb-2">
                      Playing on {activeDevice.name}
                    </p>
                    <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                      Direct Spotify visualization is disabled during remote
                      playback. Use your microphone to visualize room audio!
                    </p>
                  </div>
                )}
            </div>

            {/* Visualizer Controls */}
            {isPlaying && (
              <div className="mt-6 space-y-6 bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                <div className="flex flex-wrap gap-3 pb-4 border-b border-zinc-800/50">
                  <Button
                    variant={captureMode === "speaker" ? "default" : "outline"}
                    size="sm"
                    className={
                      captureMode === "speaker"
                        ? "bg-brand text-white"
                        : "text-zinc-400"
                    }
                    onClick={() =>
                      captureMode === "speaker"
                        ? stopListening()
                        : startListening("speaker")
                    }
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    {captureMode === "speaker"
                      ? "Sharing Audio"
                      : "Share Audio"}
                  </Button>
                  <Button
                    variant={captureMode === "mic" ? "default" : "outline"}
                    size="sm"
                    className={
                      captureMode === "mic"
                        ? "bg-brand text-white"
                        : "text-zinc-400"
                    }
                    onClick={() =>
                      captureMode === "mic"
                        ? stopListening()
                        : startListening("mic")
                    }
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    {captureMode === "mic" ? "Mic Active" : "Use Mic"}
                  </Button>
                  {captureMode !== "none" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                      onClick={stopListening}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Stop Capture
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-between mb-3">
                      <span>Glow</span>
                      <span className="text-brand">
                        {sensitivity.toFixed(1)}x
                      </span>
                    </label>
                    <Slider
                      value={[sensitivity]}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onValueChange={(val) => setSensitivity(val[0])}
                      className="cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider flex items-center justify-between mb-3">
                      <span>Frame Depth</span>
                      <span className="text-brand">{maxRipples}</span>
                    </label>
                    <Slider
                      value={[maxRipples]}
                      min={3}
                      max={15}
                      step={1}
                      onValueChange={(val) => setMaxRipples(val[0])}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Album Art View (also shown on mobile below visualizer) */}
          <div className={viewMode === "image" ? "block" : "block lg:hidden"}>
            <div className="relative w-full aspect-square max-w-2xl mx-auto flex items-center justify-center">
              {/* Background ripples */}
              <canvas
                ref={bgCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{ filter: "blur(3px)", opacity: 0.6 }}
              />

              <div className="relative w-4/5 h-4/5 z-10">
                <Image
                  src={
                    currentTrack.album.images[0]?.url || "/default-artist.png"
                  }
                  fill
                  className="object-cover rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)]"
                  alt={currentTrack.name}
                  priority
                />
              </div>
            </div>
          </div>
          <div className={viewMode === "lyrics" ? "hidden lg:block" : "hidden"}>
            <div className="h-[600px] overflow-hidden rounded-2xl border border-white/5 bg-zinc-950">
              {wideLyrics && <LyricsPanel active={isOpen && viewMode === "lyrics"} />}
            </div>
          </div>
        </div>

        <div className="text-center space-y-2 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white px-4 leading-tight">
            {currentTrack.name}
          </h1>
          <div className="text-base sm:text-lg md:text-xl text-zinc-400 flex items-center justify-center flex-wrap gap-1 sm:gap-2 px-4">
            {currentTrack.artists.map((artist, index) => (
              <span key={artist.id} className="inline-flex items-center">
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
        </div>

        <div className="space-y-4 px-4 sm:px-0 w-full">
          <Slider
            value={[estimatedPosition]}
            max={duration}
            step={1000}
            onValueChange={(val) => {
              setEstimatedPosition(val[0]); // Optimistic update
              seekTo(val[0]);
            }}
            className="cursor-pointer"
            disabled={!isReady || duration === 0}
          />
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{formatTime(estimatedPosition)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSave}
            className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 sm:h-10 sm:w-10 transition-all"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-brand" />
            ) : isSaved ? (
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 fill-brand text-brand" />
            ) : (
              <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 sm:h-10 sm:w-10 transition-all hidden sm:flex"
          >
            <Shuffle className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={previousTrack}
            className="text-white hover:text-brand hover:bg-zinc-800 h-10 w-10 sm:h-12 sm:w-12 transition-all"
            disabled={!isReady}
          >
            <SkipBack className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
          </Button>

          <Button
            onClick={isPlaying ? pauseTrack : resumeTrack}
            size="icon"
            className="bg-white hover:bg-brand hover:scale-105 text-black h-12 w-12 sm:h-14 sm:w-14 rounded-full transition-all"
            disabled={!isReady || isLoadingTrack}
          >
            {isLoadingTrack ? (
              <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6 sm:h-7 sm:w-7 fill-current" />
            ) : (
              <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-0.5 fill-current" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextTrack}
            className="text-white hover:bg-brand hover:bg-zinc-800 h-10 w-10 sm:h-12 sm:w-12 transition-all"
            disabled={!isReady}
          >
            <SkipForward className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRepeat}
            className={`h-8 w-8 sm:h-10 sm:w-10 transition-all hidden sm:flex ${
              repeatMode === "off"
                ? "text-zinc-400 hover:bg-brand hover:bg-zinc-800"
                : "bg-brand hover:bg-brand hover:bg-zinc-800"
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
              <Repeat1 className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Repeat className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>

          <div className="items-center gap-2 hidden sm:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMute}
              className="text-zinc-400 hover:text-brand hover:bg-zinc-800 h-8 w-8 sm:h-10 sm:w-10 transition-all"
            >
              {isMuted || localVolume === 0 ? (
                <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
            <Slider
              value={[localVolume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-20 sm:w-24 cursor-pointer"
              disabled={!isReady}
            />
          </div>
        </div>

        <div className="px-4 pt-4 lg:hidden">
          <div className="h-[min(650px,80dvh)] overflow-hidden rounded-2xl border border-white/5 bg-zinc-950">
            {!wideLyrics && <LyricsPanel active={isOpen} />}
          </div>
        </div>
      </div>

      {/* Full Width Sections */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 pb-16">
        {/* Top Tracks Section with Table/Grid Toggle */}
        <div className="pt-4 sm:pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Popular tracks by {currentTrack.artists[0]?.name}
            </h2>
            <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTopTracksDisplayUI("Table")}
                className={`h-9 px-3 transition-all ${
                  topTracksDisplayUI === "Table"
                    ? "bg-brand/10 text-brand hover:bg-brand/20 hover:text-brand"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <PiTable className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTopTracksDisplayUI("Grid")}
                className={`h-9 px-3 transition-all ${
                  topTracksDisplayUI === "Grid"
                    ? "bg-brand/10 text-brand hover:bg-brand/20 hover:text-brand"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
            </div>
          </div>

          {loadingTopTracks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : topTracksDisplayUI === "Table" ? (
            <div className="bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="w-8 sm:w-12 text-center text-zinc-400 text-xs sm:text-sm">
                      #
                    </TableHead>
                    <TableHead className="w-16 text-center text-zinc-400 text-xs sm:text-sm">
                      {/* Image */}
                    </TableHead>
                    <TableHead className="text-zinc-400 text-xs sm:text-sm">
                      Title
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-center text-zinc-400 text-xs sm:text-sm">
                      Popularity
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-right text-zinc-400 text-xs sm:text-sm">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTracks.map((track, index) => {
                    const isThisTrack = currentPlayingTrackId === track.id;

                    return (
                      <SongTableRow
                        key={track.id}
                        className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                        onActivate={() => handlePlayPauseTopTrack(track)}
                        aria-label={`${isTrackPlaying(track.id) ? "Pause" : "Play"} ${track.name}`}
                      >
                        <TableCell className="text-center py-2 sm:py-3 align-middle">
                          <span className={isTrackPlaying(track.id) ? "text-brand tabular-nums text-xs" : "text-zinc-500 tabular-nums text-xs"}>{index + 1}</span>
                        </TableCell>
                        <TableCell className="text-center py-2 sm:py-3 align-middle">
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-md overflow-hidden group/image">
                            <Image
                              src={
                                track.album?.images[0]?.url ||
                                "/default-artist.png"
                              }
                              width={48}
                              height={48}
                              className="object-cover w-10 h-10 sm:w-12 sm:h-12 rounded-md"
                              alt={track.name}
                            />

                          </div>
                        </TableCell>
                        <TableCell className="py-2 sm:py-3 align-middle">
                          <div
                            className={`font-medium truncate transition-colors text-xs sm:text-sm ${
                              isThisTrack
                                ? "text-brand"
                                : "text-white group-hover:text-brand"
                            }`}
                          >
                            {track.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center py-2 sm:py-3 align-middle">
                          <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                            <TrendingUp className="h-3 w-3 text-zinc-400" />
                            <span className="text-zinc-400 text-xs sm:text-sm">
                              {track.popularity}/100
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-zinc-400 text-xs sm:text-sm py-2 sm:py-3 align-middle">
                          {formatTime(track.duration_ms)}
                        </TableCell>
                      </SongTableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="media-grid">
              {topTracks.map((track, index) => {
                const isThisTrack = currentPlayingTrackId === track.id;
                return (
                  <PlaylistCard
                    key={track.id}
                    id={track.id}
                    image={track.album?.images[0]?.url || "/default-artist.png"}
                    title={track.name}
                    description={`Popularity: ${track.popularity}/100`}
                    badge={`#${index + 1}`}
                    duration={formatTime(track.duration_ms)}
                    isPlaying={isThisTrack && isPlaying}
                    isPaused={isThisTrack && !isPlaying}
                    onPlay={handlePlayTopTrackWrapper}
                    onPause={pauseTrack}
                    onResume={resumeTrack}
                    onClick={() =>
                      router.push(
                        `/Albums/${track.album.id}?name=${encodeURIComponent(
                          track.name,
                        )}`,
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Track Details Section */}
        <div className="pt-4 sm:pt-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">
            Track Information
          </h2>
          <Card className="bg-zinc-800/30 border-zinc-700">
            <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-x-hidden">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between py-2 sm:py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-sm sm:text-base">
                    Duration
                  </span>
                  <span className="text-white text-sm sm:text-base">
                    {formatTime(currentTrack.duration_ms)}
                  </span>
                </div>
                <div className="flex justify-between py-2 sm:py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-sm sm:text-base">
                    Explicit
                  </span>
                  <span className="text-white text-sm sm:text-base">
                    {currentTrack.explicit ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between py-2 sm:py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-sm sm:text-base">
                    Popularity
                  </span>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-16 sm:w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${currentTrack.popularity}%` }}
                      />
                    </div>
                    <span className="text-white text-sm sm:text-base">
                      {currentTrack.popularity}/100
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-2 sm:py-3">
                  <span className="text-zinc-400 text-sm sm:text-base">
                    Album
                  </span>
                  <span
                    className="text-white hover:text-brand cursor-pointer hover:underline text-sm sm:text-base truncate ml-4"
                    onClick={() =>
                      router.push(
                        `/Albums/${currentTrack.album.id}?name=${currentTrack.album.name}`,
                      )
                    }
                  >
                    {currentTrack.album.name}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
