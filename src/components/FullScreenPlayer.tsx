"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import styles from "./FullScreenPlayer.module.css";
import { useTrackLyrics } from "@/hooks/useTrackLyrics";
import AudioVisualizer from "@/components/AudioVisualizer";
import LyricsPanel from "@/components/LyricsPanel";

import { SongTableRow } from "@/components/SongTableRow";

import { useEffect, useState, useRef } from "react";
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
    activeDevice,
    deviceId,
  } = usePlayer();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const [viewMode, setViewMode] = useState<"image" | "lyrics" | "visualizer">(
    "image",
  );
  const { hasLyrics, data: lyricsData } = useTrackLyrics(currentTrack, isOpen);
  const visibleView = viewMode === "lyrics" && !hasLyrics ? "image" : viewMode;
  useEffect(() => {
    if (lyricsData && !hasLyrics) setViewMode(mode => mode === "lyrics" ? "image" : mode);
  }, [lyricsData, hasLyrics]);

  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [loadingTopTracks, setLoadingTopTracks] = useState(false);

  const [topTracksDisplayUI, setTopTracksDisplayUI] = useState<
    "Table" | "Grid"
  >("Table");
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | null
  >(null);
  // Audio capture refs (for Share Audio/Mic)
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [captureMode, setCaptureMode] = useState<"none" | "mic" | "speaker">(
    "none",
  );
  const captureRequest = useRef(0);

  const [sensitivity, setSensitivity] = useState(1.5);
  const [maxRipples, setMaxRipples] = useState(8);



  // Smooth position interpolation for responsive slider
  const [estimatedPosition, setEstimatedPosition] = useState(position);

  // Sync estimated position with global position (source of truth)
  useEffect(() => {
    setEstimatedPosition(position);
  }, [position]);

  // Interpolate position every 100ms for smooth UI updates
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const interval = setInterval(() => {
      setEstimatedPosition((prev) => Math.min(prev + 100, duration));
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, duration]);

  const startListening = async (mode: "mic" | "speaker") => {
    stopListening();
    const request = ++captureRequest.current;
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

      if (request !== captureRequest.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => track.addEventListener("ended", () => {
        if (localStreamRef.current === stream) stopListening();
      }, { once: true }));
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      localAudioContextRef.current = audioContext;
      if (audioContext.state === "suspended") await audioContext.resume();
      if (request !== captureRequest.current) return;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      localAnalyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      localSourceRef.current = source;
      source.connect(analyser);

      setCaptureMode(mode);

    } catch (err) {
      if (request !== captureRequest.current) return;
      stopListening();
      console.error("Error setting up audio:", err);
      alert(
        err instanceof Error
          ? `Could not access ${mode === "mic" ? "microphone" : "audio"}: ${err.message}`
          : "Could not access audio source. Please ensure you have granted the necessary permissions.",
      );
    }
  };

  const stopListening = () => {
    captureRequest.current += 1;
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

  };

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);


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
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className={styles.player} aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Now playing: {trackTitle}</DialogPrimitive.Title>
          <header className={styles.header}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100">Now playing</p>
              <p className="truncate text-xs text-zinc-400">{activeDevice?.name || "Spotify"}</p>
            </div>
            <div className={styles.tabs} role="group" aria-label="Player view">
              {([
                ["image", ImageIcon, "Artwork"],
                ["lyrics", FileText, "Lyrics"],
                ["visualizer", Activity, "Visualizer"],
              ] as const).filter(([mode]) => mode !== "lyrics" || hasLyrics).map(([mode, Icon, label]) => (
                <button key={mode} type="button" aria-label={label} aria-pressed={visibleView === mode}
                  className={styles.tab} onClick={() => setViewMode(mode)}>
                  <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <DialogPrimitive.Close asChild>
              <button type="button" className={styles.iconButton} aria-label="Close full-screen player"><X className="h-5 w-5" /></button>
            </DialogPrimitive.Close>
          </header>

          <div className={styles.scrollContent}>
          <main className={styles.stage}>
            <div className={styles.media}>
              {visibleView === "image" && (
                <div className={styles.artwork}>
                  <Image src={trackImage} alt={`${currentTrack.album.name} album artwork`} fill priority
                    sizes="(min-width: 768px) 70vh, 90vw" className="object-cover" />
                </div>
              )}
              {visibleView === "lyrics" && (
                <div className={styles.lyrics}><LyricsPanel active={isOpen} /></div>
              )}
              {viewMode === "visualizer" && (
                <div className={styles.visualizer}>
                  <AudioVisualizer analyser={globalAnalyser} captureAnalyser={localAnalyserRef}
                    captured={captureMode !== "none"} playing={isPlaying} reducedMotion={reduceMotion}
                    color={currentTheme.color} sensitivity={sensitivity} detail={maxRipples} />
                </div>
              )}
            </div>

          </main>
              {viewMode === "visualizer" && (
                <details className={styles.settings}>
                  <summary className="cursor-pointer text-sm font-medium text-zinc-300">Visualizer settings</summary>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="ghost" className="border border-brand/25 text-zinc-100 hover:bg-brand/15 hover:text-zinc-100" onClick={() => captureMode === "speaker" ? stopListening() : startListening("speaker")}>Share audio</Button>
                    <Button variant="ghost" className="border border-brand/25 text-zinc-100 hover:bg-brand/15 hover:text-zinc-100" onClick={() => captureMode === "mic" ? stopListening() : startListening("mic")}>Use microphone</Button>
                    {captureMode !== "none" && <Button variant="ghost" className="text-red-300 hover:bg-red-500/10 hover:text-red-300" onClick={stopListening}>Stop capture</Button>}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-5">
                    <div><label className="text-xs text-zinc-400">Sensitivity</label><Slider aria-label="Visualizer sensitivity" value={[sensitivity]} min={0.5} max={3} step={0.1} onValueChange={(v) => setSensitivity(v[0])} className="mt-2 h-6" /></div>
                    <div><label className="text-xs text-zinc-400">Detail</label><Slider aria-label="Detail" value={[maxRipples]} min={3} max={15} step={1} onValueChange={(v) => setMaxRipples(v[0])} className="mt-2 h-6" /></div>
                  </div>
                </details>
              )}


      {/* Full Width Sections */}
      <div className={styles.discovery}>
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
          <footer className={styles.playbackDock} aria-label="Playback controls">
            <div className={styles.trackSummary}>
              <div className="min-w-0">
                <p className="hidden">{currentTrack.album.name}</p>
                <h1 className={styles.title}>{trackTitle}</h1>
                <div className="mt-1 flex gap-1 overflow-hidden whitespace-nowrap text-xs text-zinc-400">
                  {currentTrack.artists.map((artist, index) => (
                    <button key={artist.id} className="rounded-sm text-left hover:text-brand hover:underline focus-visible:outline focus-visible:outline-brand"
                      onClick={(event) => { handleArtistClick(artist.id, artist.name)(event); onClose(); }}>
                      {artist.name}{index < currentTrack.artists.length - 1 ? "," : ""}
                    </button>
                  ))}
                </div>
              </div>

            </div>

              <div className={styles.progress}>
                <Slider aria-label="Playback position" value={[Math.min(estimatedPosition, duration)]} max={Math.max(duration, 1)} step={1000}
                  onValueChange={(value) => { setEstimatedPosition(value[0]); seekTo(value[0]); }}
                  className="h-6 cursor-pointer" disabled={!isReady || duration === 0} />
                <div className="mt-1 flex justify-between text-xs tabular-nums text-zinc-400">
                  <span>{formatTime(estimatedPosition)}</span><span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className={styles.transport}>
                <button className={styles.iconButton} onClick={handleToggleSave} disabled={isSaving}
                  aria-label={isSaved ? "Remove from Liked Songs" : "Save to Liked Songs"} aria-pressed={!!isSaved}>
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className={`h-5 w-5 ${isSaved ? "fill-brand text-brand" : ""}`} />}
                </button>
                <button className={styles.iconButton} onClick={previousTrack} disabled={!isReady} aria-label="Previous track"><SkipBack className="h-6 w-6 fill-current" /></button>
                <button className={styles.playButton} onClick={isPlaying ? pauseTrack : resumeTrack} disabled={!isReady || isLoadingTrack} aria-label={isPlaying ? "Pause" : "Play"}>
                  {isLoadingTrack ? <Loader2 className="h-6 w-6 animate-spin" /> : isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
                </button>
                <button className={styles.iconButton} onClick={nextTrack} disabled={!isReady} aria-label="Next track"><SkipForward className="h-6 w-6 fill-current" /></button>
                <button className={styles.iconButton} onClick={toggleRepeat} disabled={!isReady} aria-label={`Repeat: ${repeatMode}`} aria-pressed={repeatMode !== "off"}>
                  {repeatMode === "track" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </button>
              </div>

              <div className={styles.volume}>
                <button className={styles.iconButton} onClick={handleMute} disabled={!isReady} aria-label={localVolume === 0 ? "Unmute" : "Mute"}>
                  {localVolume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <Slider aria-label="Volume" value={[localVolume]} max={1} step={0.01} onValueChange={handleVolumeChange} disabled={!isReady} className="h-6" />
                <span className="w-8 text-right text-xs tabular-nums text-zinc-400">{Math.round(localVolume * 100)}%</span>
              </div>

          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
