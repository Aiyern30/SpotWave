"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  Button,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
} from "@/components/ui";
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
  Loader2,
  X,
  Music,
  Users,
  TrendingUp,
  Clock,
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

interface LyricsLine {
  time: number;
  text: string;
}

interface TopTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  uri: string;
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
  } = usePlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [localVolume, setLocalVolume] = useState(volume);
  const [isSaved, setIsSaved] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // View toggle state
  const [viewMode, setViewMode] = useState<"image" | "lyrics">("image");

  // Top tracks state
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [loadingTopTracks, setLoadingTopTracks] = useState(false);

  // Lyrics state
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<LyricsLine[] | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  // Fetch saved status
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

  // Fetch top tracks when opening
  useEffect(() => {
    if (isOpen && currentTrack?.artists[0]?.id) {
      fetchTopTracks(currentTrack.artists[0].id);
      fetchLyrics(
        currentTrack.artists[0].name,
        currentTrack.name,
        currentTrack.album.name,
        currentTrack.duration_ms
      );
    }
  }, [isOpen, currentTrack]);

  // Sync lyrics
  useEffect(() => {
    if (!syncedLyrics || syncedLyrics.length === 0 || !isPlaying) return;

    const adjustedPosition = position + 300;
    let newIndex = -1;
    for (let i = syncedLyrics.length - 1; i >= 0; i--) {
      if (adjustedPosition >= syncedLyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
      if (lyricsContainerRef.current && newIndex >= 0) {
        const activeElement = lyricsContainerRef.current.querySelector(
          `[data-index="${newIndex}"]`
        );
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [position, syncedLyrics, currentLyricIndex, isPlaying]);

  const fetchTopTracks = async (artistId: string) => {
    setLoadingTopTracks(true);
    try {
      const token = localStorage.getItem("Token");
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setTopTracks(data.tracks?.slice(0, 10) || []);
    } catch (error) {
      console.error("Error fetching top tracks:", error);
    } finally {
      setLoadingTopTracks(false);
    }
  };

  const parseSyncedLyrics = (lrcText: string): LyricsLine[] => {
    const lines: LyricsLine[] = [];
    const lrcLines = lrcText.split("\n");
    for (const line of lrcLines) {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const centiseconds = parseInt(match[3].padEnd(3, "0"));
        const time = (minutes * 60 + seconds) * 1000 + centiseconds;
        const text = match[4].trim();
        if (text) lines.push({ time, text });
      }
    }
    return lines.sort((a, b) => a.time - b.time);
  };

  const fetchLyrics = async (
    artist: string,
    title: string,
    album: string,
    durationMs: number
  ) => {
    setLoadingLyrics(true);
    try {
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: title,
        album_name: album,
        duration: Math.round(durationMs / 1000).toString(),
      });
      const response = await fetch(
        `https://lrclib.net/api/get?${params.toString()}`
      );
      const data = await response.json();

      if (data.syncedLyrics && data.syncedLyrics.trim()) {
        setSyncedLyrics(parseSyncedLyrics(data.syncedLyrics));
        setLyrics(
          data.plainLyrics ||
            data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim()
        );
      } else if (data.plainLyrics && data.plainLyrics.trim()) {
        setLyrics(data.plainLyrics);
        setSyncedLyrics(null);
      } else {
        setLyrics(data.instrumental ? "🎵 Instrumental" : "Lyrics not found");
        setSyncedLyrics(null);
      }
    } catch (error) {
      setLyrics("Unable to fetch lyrics");
      setSyncedLyrics(null);
    } finally {
      setLoadingLyrics(false);
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

  const handlePlayTopTrack = async (track: TopTrack) => {
    try {
      const token = localStorage.getItem("Token");
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${track.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const trackData = await response.json();

      playTrack({
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
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-zinc-900 via-zinc-800 to-black z-50 overflow-y-auto">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="fixed top-4 right-4 text-white hover:text-green-400 h-10 w-10 z-10"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Hero Section - Album Art or Lyrics */}
        <div className="relative w-full">
          {viewMode === "image" ? (
            <div className="relative w-full aspect-square max-w-2xl mx-auto">
              <Image
                src={currentTrack.album.images[0]?.url || "/default-artist.png"}
                fill
                className="object-cover rounded-2xl shadow-2xl"
                alt={currentTrack.name}
                priority
              />
            </div>
          ) : (
            <div className="w-full min-h-[600px] bg-zinc-900/50 rounded-2xl p-8 backdrop-blur-sm">
              {loadingLyrics ? (
                <div className="flex justify-center items-center h-[600px]">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : syncedLyrics && syncedLyrics.length > 0 ? (
                <div
                  ref={lyricsContainerRef}
                  className="h-[600px] overflow-y-auto scroll-smooth space-y-4"
                >
                  {syncedLyrics.map((line, index) => (
                    <div
                      key={index}
                      data-index={index}
                      className={`text-base leading-relaxed transition-all duration-300 py-1 ${
                        index === currentLyricIndex
                          ? "text-green-400 font-semibold text-2xl scale-105"
                          : index < currentLyricIndex
                          ? "text-zinc-500"
                          : "text-zinc-300"
                      }`}
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">
                  {lyrics}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* View Toggle Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            variant={viewMode === "image" ? "default" : "outline"}
            onClick={() => setViewMode("image")}
            className={`px-6 ${
              viewMode === "image"
                ? "bg-green-500 hover:bg-green-600 text-black"
                : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
            }`}
          >
            Album Art
          </Button>
          <Button
            variant={viewMode === "lyrics" ? "default" : "outline"}
            onClick={() => setViewMode("lyrics")}
            className={`px-6 ${
              viewMode === "lyrics"
                ? "bg-green-500 hover:bg-green-600 text-black"
                : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
            }`}
          >
            Lyrics
          </Button>
        </div>

        {/* Track Info */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-4xl font-bold text-white">{currentTrack.name}</h1>
          <p
            className="text-xl text-zinc-400 hover:underline cursor-pointer"
            onClick={() =>
              router.push(
                `/Artists/${currentTrack.artists[0].id}?name=${currentTrack.artists[0].name}`
              )
            }
          >
            {currentTrack.artists.map((artist) => artist.name).join(", ")}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 max-w-2xl mx-auto">
          <Slider
            value={[position]}
            max={duration}
            step={1000}
            onValueChange={(val) => seekTo(val[0])}
            className="cursor-pointer"
            disabled={!isReady || duration === 0}
          />
          <div className="flex justify-between text-xs text-zinc-400">
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
            className="text-zinc-400 hover:text-white h-10 w-10"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin text-green-500" />
            ) : isSaved ? (
              <Heart className="h-5 w-5 fill-green-500 text-green-500" />
            ) : (
              <Heart className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white h-10 w-10"
          >
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={previousTrack}
            className="text-white hover:text-green-400 h-12 w-12"
            disabled={!isReady}
          >
            <SkipBack className="h-6 w-6 fill-current" />
          </Button>

          <Button
            onClick={isPlaying ? pauseTrack : resumeTrack}
            size="icon"
            className="bg-white hover:bg-white/90 hover:scale-105 text-black h-14 w-14 rounded-full"
            disabled={!isReady}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="h-7 w-7 ml-0.5 fill-current" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextTrack}
            className="text-white hover:text-green-400 h-12 w-12"
            disabled={!isReady}
          >
            <SkipForward className="h-6 w-6 fill-current" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white h-10 w-10"
          >
            <Repeat className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMute}
              className="text-zinc-400 hover:text-white h-10 w-10"
            >
              {isMuted || localVolume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              value={[localVolume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24 cursor-pointer"
              disabled={!isReady}
            />
          </div>
        </div>

        {/* Related Music Videos Section */}
        <div className="pt-8">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Related music videos
          </h2>
          {/* Placeholder for related videos - you can populate this with actual data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="aspect-video bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Top Tracks Section */}
        <div className="pt-8">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Popular tracks by {currentTrack.artists[0]?.name}
          </h2>
          {loadingTopTracks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {topTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center space-x-4 p-4 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                  onClick={() => handlePlayTopTrack(track)}
                >
                  <span className="text-zinc-400 text-sm w-8 text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate text-base">
                      {track.name}
                    </div>
                    <div className="text-zinc-400 text-sm flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{track.popularity}/100</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(track.duration_ms)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-10 w-10 rounded-full bg-green-500 hover:bg-green-400 text-black"
                  >
                    <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Track Details Section */}
        <div className="pt-8 pb-16">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Track Information
          </h2>
          <Card className="bg-zinc-800/30 border-zinc-700">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-base">Duration</span>
                  <span className="text-white text-base">
                    {formatTime(currentTrack.duration_ms)}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-base">Explicit</span>
                  <span className="text-white text-base">
                    {currentTrack.explicit ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-zinc-700">
                  <span className="text-zinc-400 text-base">Popularity</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${currentTrack.popularity}%` }}
                      />
                    </div>
                    <span className="text-white text-base">
                      {currentTrack.popularity}/100
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-zinc-400 text-base">Album</span>
                  <span
                    className="text-white hover:text-green-400 cursor-pointer hover:underline text-base"
                    onClick={() =>
                      router.push(
                        `/Albums/${currentTrack.album.id}?name=${currentTrack.album.name}`
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
