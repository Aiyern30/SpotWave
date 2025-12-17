"use client";

import ReactPlayer from "react-player";
import Sidebar from "@/components/Sidebar";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import {
  Play,
  ExternalLink,
  FileText,
  Music,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react";

const SongPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState<boolean>(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = pathname.split("/").pop() || "";

  const fetchLyrics = async (
    artist: string,
    title: string,
    album: string,
    duration: number
  ) => {
    setLoadingLyrics(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: title,
        album_name: album,
        duration: Math.round(duration / 1000).toString(), // Convert ms to seconds
      });

      const response = await fetch(
        `https://lrclib.net/api/get?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // LRCLIB returns plainLyrics and syncedLyrics
      if (data.plainLyrics && data.plainLyrics.trim()) {
        setLyrics(data.plainLyrics);
      } else if (data.syncedLyrics && data.syncedLyrics.trim()) {
        // If only synced lyrics available, parse and use them
        setLyrics(data.syncedLyrics);
      } else if (data.instrumental) {
        setLyrics("🎵 This track is instrumental (no lyrics available)");
      } else {
        setLyrics("Lyrics not found for this track.");
      }
    } catch (error) {
      console.error("Error fetching lyrics from LRCLIB:", error);
      setLyrics("Unable to fetch lyrics at this time.");
    } finally {
      setLoadingLyrics(false);
    }
  };

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
      <div className="flex min-h-screen bg-black">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen((prev) => !prev)}
        />
        <div
          className={`flex-1 transition-all ml-16 duration-300 text-white ${
            sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
          }`}
        >
          <div className="p-4 space-y-6">
            <Header />
            <div className="space-y-8">
              {/* Loading Header */}
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
                <Skeleton className="w-48 h-48 rounded-lg" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-12 w-64" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
              {/* Loading Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 text-white ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-6 overflow-auto">
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
                    <h1 className="text-4xl md:text-6xl font-bold">
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
                      className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Spotify
                    </Button>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          className="bg-transparent border-white text-white hover:bg-white hover:text-black"
                          onClick={() =>
                            fetchLyrics(
                              track.artists[0].name,
                              track.name,
                              track.album.name,
                              track.duration_ms
                            )
                          }
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Lyrics
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-[400px] sm:w-[540px] bg-zinc-900 border-zinc-800">
                        <SheetHeader className="space-y-4">
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
                        <div className="mt-6">
                          {loadingLyrics ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
                              <span className="ml-3 text-zinc-400">
                                Loading lyrics...
                              </span>
                            </div>
                          ) : (
                            <div className="bg-zinc-800/30 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
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
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
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
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
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
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
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
      </div>
    </div>
  );
};

export default SongPage;
