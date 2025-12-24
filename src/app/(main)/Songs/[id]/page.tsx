"use client";

import ReactPlayer from "react-player";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Skeleton,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Card,
  CardContent,
} from "@/components/ui";
import Header from "@/components/Header";
import type { Track } from "@/lib/types";
import { formatLyrics } from "@/utils/function";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  Play,
  ExternalLink,
  FileText,
  Music,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface LyricsLine {
  time: number;
  text: string;
}

interface LyricsCache {
  plainLyrics: string | null;
  syncedLyrics: LyricsLine[] | null;
  instrumental: boolean;
  timestamp: number;
}

const SongPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<LyricsLine[] | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState<boolean>(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(-1);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  // Cache lyrics to avoid refetching
  const lyricsCache = useRef<Map<string, LyricsCache>>(new Map());
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { position, currentTrack, isPlaying } = usePlayer();

  const id = pathname.split("/").pop() || "";

  // Parse synced lyrics (LRC format)
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

        if (text) {
          lines.push({ time, text });
        }
      }
    }

    return lines.sort((a, b) => a.time - b.time);
  };

  const fetchLyrics = async (
    artist: string,
    title: string,
    album: string,
    duration: number
  ) => {
    const cacheKey = `${artist}-${title}-${album}`;

    // Check cache first
    const cached = lyricsCache.current.get(cacheKey);
    if (cached) {
      console.log("Using cached lyrics");
      setLyrics(cached.plainLyrics);
      setSyncedLyrics(cached.syncedLyrics);
      setCurrentLyricIndex(-1);
      return;
    }

    setLoadingLyrics(true);
    try {
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: title,
        album_name: album,
        duration: Math.round(duration / 1000).toString(),
      });

      const response = await fetch(
        `https://lrclib.net/api/get?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let plainLyricsText = null;
      let syncedLyricsData = null;
      let isInstrumental = false;

      if (data.syncedLyrics && data.syncedLyrics.trim()) {
        syncedLyricsData = parseSyncedLyrics(data.syncedLyrics);
        plainLyricsText =
          data.plainLyrics ||
          data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();
      } else if (data.plainLyrics && data.plainLyrics.trim()) {
        plainLyricsText = data.plainLyrics;
      } else if (data.instrumental) {
        plainLyricsText = "🎵 This track is instrumental (no lyrics available)";
        isInstrumental = true;
      } else {
        plainLyricsText = "Lyrics not found for this track.";
      }

      // Cache the lyrics
      lyricsCache.current.set(cacheKey, {
        plainLyrics: plainLyricsText,
        syncedLyrics: syncedLyricsData,
        instrumental: isInstrumental,
        timestamp: Date.now(),
      });

      setLyrics(plainLyricsText);
      setSyncedLyrics(syncedLyricsData);
      setCurrentLyricIndex(-1);
    } catch (error) {
      console.error("Error fetching lyrics from LRCLIB:", error);
      const errorMessage = "Unable to fetch lyrics at this time.";
      setLyrics(errorMessage);
      setSyncedLyrics(null);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Sync lyrics with current playback position
  useEffect(() => {
    if (
      !syncedLyrics ||
      syncedLyrics.length === 0 ||
      !isSheetOpen ||
      !isPlaying
    ) {
      return;
    }

    // Add a 200ms offset to make lyrics appear slightly earlier
    const adjustedPosition = position + 300;

    // Find the current lyric line based on position
    let newIndex = -1;
    for (let i = syncedLyrics.length - 1; i >= 0; i--) {
      if (adjustedPosition >= syncedLyrics[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);

      // Auto-scroll to current lyric
      if (lyricsContainerRef.current && newIndex >= 0) {
        const activeElement = lyricsContainerRef.current.querySelector(
          `[data-index="${newIndex}"]`
        );
        if (activeElement) {
          activeElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }, [position, syncedLyrics, currentLyricIndex, isSheetOpen, isPlaying]);

  const fetchTrackDetails = useCallback(async () => {
    const token = localStorage.getItem("Token");

    if (!token) {
      console.error("Spotify API token not found");
      return;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setTrack(data);
    } catch (error) {
      console.error("Error fetching track details from Spotify:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrackDetails();
  }, [fetchTrackDetails]);

  if (loading) {
    return (
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-8">
        <Header />
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
            <Skeleton className="w-48 h-48 rounded-lg" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-8 overflow-auto">
      <Header />
      {track && (
        <div className="space-y-8">
          {/* Track Header */}
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
            <div className="flex-shrink-0">
              <Image
                src={track.album?.images[0]?.url || "/default-artist.png"}
                width={300}
                height={300}
                className="rounded-lg object-cover shadow-2xl"
                alt={track.name}
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-6">
              <div className="space-y-2">
                <div className="text-sm text-zinc-400 uppercase tracking-wide">
                  Song
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-white">
                  {track.name}
                </h1>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-300">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {track.artists.map((artist, idx) => (
                      <span
                        key={artist.id}
                        onClick={() =>
                          router.push(
                            `/Artists/${artist.id}?name=${artist.name}`
                          )
                        }
                        className="hover:underline cursor-pointer hover:text-white"
                      >
                        {artist.name}
                        {idx < track.artists.length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Music className="h-4 w-4" />
                  <span
                    onClick={() =>
                      router.push(
                        `/Albums/${track.album.id}?name=${track.album.name}`
                      )
                    }
                    className="hover:underline cursor-pointer hover:text-white"
                  >
                    {track.album?.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Popularity: {track.popularity}/100</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <Button
                  onClick={() =>
                    window.open(track.external_urls?.spotify, "_blank")
                  }
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold hover:scale-105 transition-all"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Spotify
                </Button>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-transparent border-white text-white hover:bg-green-500 hover:text-black hover:border-green-500 transition-all"
                      onClick={() => {
                        if (!lyrics && !loadingLyrics) {
                          fetchLyrics(
                            track.artists[0].name,
                            track.name,
                            track.album.name,
                            track.duration_ms
                          );
                        }
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Lyrics
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] sm:w-[540px] bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
                    <SheetHeader className="space-y-4 flex-shrink-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden">
                          <Image
                            src={
                              track.album?.images[0]?.url ||
                              "/default-artist.png"
                            }
                            width={64}
                            height={64}
                            className="object-cover"
                            alt={track.name}
                          />
                        </div>
                        <div>
                          <SheetTitle className="text-white text-lg font-semibold">
                            {track.name}
                          </SheetTitle>
                          <p className="text-zinc-400 text-sm">
                            by{" "}
                            {track.artists
                              .map((artist) => artist.name)
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-hidden mt-6">
                      {loadingLyrics ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                          <span className="ml-3 text-zinc-400">
                            Loading lyrics...
                          </span>
                        </div>
                      ) : syncedLyrics && syncedLyrics.length > 0 ? (
                        <div
                          ref={lyricsContainerRef}
                          className="bg-zinc-800/30 rounded-lg p-4 h-full overflow-y-auto scroll-smooth"
                          style={{ maxHeight: "calc(100vh - 200px)" }}
                        >
                          <div className="space-y-3 pb-32">
                            {syncedLyrics.map((line, index) => (
                              <div
                                key={index}
                                data-index={index}
                                className={`text-sm leading-relaxed transition-all duration-300 py-1 ${
                                  index === currentLyricIndex
                                    ? "text-green-400 font-semibold text-lg scale-105"
                                    : index < currentLyricIndex
                                    ? "text-zinc-500"
                                    : "text-zinc-300"
                                }`}
                              >
                                {line.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="bg-zinc-800/30 rounded-lg p-4 h-full overflow-y-auto"
                          style={{ maxHeight: "calc(100vh - 200px)" }}
                        >
                          <pre className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                            {formatLyrics(lyrics)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Track Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Audio Preview */}
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
                  <Play className="h-5 w-5 mr-2" />
                  Audio Preview
                </h3>
                {track.preview_url ? (
                  <div className="w-full rounded-lg overflow-hidden bg-zinc-800/50 p-4">
                    <ReactPlayer
                      url={track.preview_url}
                      controls
                      playing={false}
                      width="100%"
                      height="60px"
                      config={{
                        file: {
                          attributes: {
                            style: { backgroundColor: "transparent" },
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                    <Music className="h-12 w-12 mb-2 opacity-50" />
                    <p>No preview available for this track</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Track Information */}
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
                  <Music className="h-5 w-5 mr-2" />
                  Track Information
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Duration</span>
                    <span className="text-white">
                      {Math.floor(track.duration_ms / 60000)}:
                      {Math.floor((track.duration_ms % 60000) / 1000)
                        .toString()
                        .padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Explicit</span>
                    <span className="text-white">
                      {track.explicit ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Track Number</span>
                    <span className="text-white">{track.track_number}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Disc Number</span>
                    <span className="text-white">{track.disc_number}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-zinc-400">Popularity</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${track.popularity}%` }}
                        />
                      </div>
                      <span className="text-white text-sm">
                        {track.popularity}/100
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Album Information */}
          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
                <Music className="h-5 w-5 mr-2" />
                Album Information
              </h3>
              <div
                className="flex items-center space-x-4 p-4 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                onClick={() =>
                  router.push(
                    `/Albums/${track.album.id}?name=${track.album.name}`
                  )
                }
              >
                <Image
                  src={track.album?.images[0]?.url || "/default-artist.png"}
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                  alt={track.album.name}
                />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white hover:text-green-400 transition-colors">
                    {track.album.name}
                  </h4>
                  <p className="text-zinc-400">
                    {track.album.artists
                      .map((artist) => artist.name)
                      .join(", ")}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-zinc-500">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {track.album.release_date}
                    </span>
                    <span>{track.album.total_tracks} tracks</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SongPage;
