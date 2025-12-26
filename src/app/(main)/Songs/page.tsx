"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
  Button,
  Skeleton,
} from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { useRouter } from "next/navigation";
import { Play, MoreHorizontal, Music, Pause } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { NumberTicker } from "@/components/magicui/NumberTicker";
import type {
  TrackDataLASTFM,
  TopTracksResponseLASTFM,
  DisplayUIProps,
} from "@/lib/types";
import { searchTrackOnSpotify } from "@/utils/Songs/searchTrackOnSpotify";
import Image from "next/image";
import { usePlayer } from "@/contexts/PlayerContext";
import { fetchArtistTopTracks } from "@/utils/Tracks/fetchArtistTopTracks";

const Page = () => {
  const [tracks, setTracks] = useState<TrackDataLASTFM[]>([]);
  const [numTracks, setNumTracks] = useState<number>(10);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

  const router = useRouter();
  const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();

  const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;

  const fetchSpotifyData = useCallback(async (tracks: TrackDataLASTFM[]) => {
    const updatedTracks = await Promise.all(
      tracks.map(async (track) => {
        const spotifyData = await searchTrackOnSpotify(
          track.name,
          track.artist.name
        );
        return spotifyData
          ? {
              ...track,
              id: spotifyData.id,
              image: spotifyData.imageUrl
                ? [{ "#text": spotifyData.imageUrl, size: "large" }]
                : track.image,
              artist: {
                ...track.artist,
                id: spotifyData.artistId,
              },
            }
          : track;
      })
    );
    return updatedTracks;
  }, []);

  const fetchTopTracks = useCallback(
    async (apiKey: string, limit: number) => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&limit=${limit}&api_key=${apiKey}&format=json`
        );
        const data: TopTracksResponseLASTFM = await response.json();

        if (response.ok) {
          const tracksWithImages = await fetchSpotifyData(data.tracks.track);
          setTracks(tracksWithImages.slice(0, limit));
        } else {
          console.error("Failed to fetch top tracks from Last.fm:", data);
        }
      } catch (error) {
        console.error("Error fetching top tracks:", error);
      }
      setLoading(false);
    },
    [fetchSpotifyData]
  );

  useEffect(() => {
    if (LASTFM_API_KEY === undefined) return;
    fetchTopTracks(LASTFM_API_KEY, numTracks);
  }, [LASTFM_API_KEY, numTracks, fetchTopTracks]);

  const memoizedTracks = useMemo(() => tracks, [tracks]);

  const handleSelectChange = (value: string) => {
    setNumTracks(Number.parseInt(value));
  };

  // Update current track ID when track changes
  useEffect(() => {
    if (currentTrack?.id) {
      setCurrentTrackId(currentTrack.id);
    }
  }, [currentTrack]);

  const handlePlayTrack = useCallback(
    async (trackId?: string, trackName?: string, artistName?: string) => {
      if (!trackId || !trackName || !artistName) return;

      try {
        console.log("Fetching track details for:", trackName);

        // Search for the track on Spotify to get full details
        const spotifyData = await searchTrackOnSpotify(trackName, artistName);

        if (!spotifyData) {
          console.error("Could not find track on Spotify");
          return;
        }

        // Fetch additional track details if needed
        const token = localStorage.getItem("Token");
        if (!token) return;

        const response = await fetch(
          `https://api.spotify.com/v1/tracks/${spotifyData.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          console.error("Failed to fetch track details");
          return;
        }

        const trackData = await response.json();

        playTrack({
          id: trackData.id,
          name: trackData.name,
          artists: trackData.artists.map((artist: any) => ({
            name: artist.name,
            id: artist.id,
          })),
          album: {
            name: trackData.album.name,
            images: trackData.album.images,
            id: trackData.album.id,
            artists: trackData.album.artists || trackData.artists,
            release_date: trackData.album.release_date || "",
            total_tracks: trackData.album.total_tracks || 0,
          },
          duration_ms: trackData.duration_ms,
          explicit: trackData.explicit || false,
          external_urls: {
            spotify: trackData.external_urls.spotify,
          },
          popularity: trackData.popularity || 0,
          preview_url: trackData.preview_url || null,
          track_number: trackData.track_number || 0,
          disc_number: trackData.disc_number || 1,
          uri: trackData.uri,
        });

        setCurrentTrackId(trackData.id);
        console.log("Playing track:", trackData.name);
      } catch (error) {
        console.error("Error playing track:", error);
      }
    },
    [playTrack]
  );

  // Wrapper for PlaylistCard compatibility
  const handlePlayTrackWrapper = useCallback(
    (trackId?: string) => {
      if (!trackId) return;
      const track = memoizedTracks.find((t) => t.id === trackId);
      if (track) {
        handlePlayTrack(trackId, track.name, track.artist.name);
      }
    },
    [memoizedTracks, handlePlayTrack]
  );

  // Add loading skeleton components
  const TableSkeleton = () => (
    <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
            <TableHead className="w-[50px] sm:w-[60px] text-center text-zinc-400 font-medium text-xs sm:text-sm">
              #
            </TableHead>
            <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm">
              Track
            </TableHead>
            <TableHead className="hidden md:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
              Artist
            </TableHead>
            <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm">
              Listeners
            </TableHead>
            <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm">
              Playcount
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array(10)
            .fill(0)
            .map((_, index) => (
              <TableRow
                key={index}
                className="border-zinc-800/30 hover:bg-zinc-800/20"
              >
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-6 mx-auto bg-zinc-800" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-zinc-800" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32 bg-zinc-800" />
                      <Skeleton className="h-3 w-20 bg-zinc-800" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-4 w-28 bg-zinc-800" />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right">
                  <Skeleton className="h-4 w-24 ml-auto bg-zinc-800" />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right">
                  <Skeleton className="h-4 w-24 ml-auto bg-zinc-800" />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );

  const GridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
      {Array(10)
        .fill(0)
        .map((_, index) => (
          <div
            key={index}
            className="space-y-3 w-full max-w-[140px] sm:max-w-[200px]"
          >
            <Skeleton className="w-full aspect-square rounded-lg bg-zinc-800" />
            <Skeleton className="h-4 w-3/4 bg-zinc-800" />
            <Skeleton className="h-3 w-2/3 bg-zinc-800" />
          </div>
        ))}
    </div>
  );

  // Add handler for play/pause in table view
  const handlePlayPauseTrack = useCallback(
    async (trackId: string, trackName: string, artistName: string) => {
      // Check if this track is currently playing
      if (currentTrackId === trackId) {
        // Same track - toggle play/pause
        if (isPlaying) {
          pauseTrack();
        } else {
          resumeTrack();
        }
      } else {
        // Different track - play it
        await handlePlayTrack(trackId, trackName, artistName);
      }
    },
    [currentTrackId, isPlaying, pauseTrack, resumeTrack, handlePlayTrack]
  );

  // Helper function to check if track is currently playing
  const isTrackPlaying = (trackId: string) => {
    return currentTrackId === trackId && isPlaying;
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Header Section */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Select onValueChange={handleSelectChange} defaultValue="10">
              <SelectTrigger className="w-full sm:w-48 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors">
                <SelectValue placeholder="Select number of tracks" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="30">Top 30</SelectItem>
                <SelectItem value="40">Top 40</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Top Tracks
            </h1>
          </div>

          {/* Enhanced View Selector */}
          <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisplayUI("Table")}
              className={`h-9 px-3 transition-all ${
                displayUI === "Table"
                  ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <PiTable className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisplayUI("Grid")}
              className={`h-9 px-3 transition-all ${
                displayUI === "Grid"
                  ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          displayUI === "Table" ? (
            <TableSkeleton />
          ) : (
            <GridSkeleton />
          )
        ) : (
          <>
            {displayUI === "Table" ? (
              <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
                <div className="bg-zinc-900/30">
                  <Table>
                    <TableCaption className="text-zinc-400 pb-4">
                      A list of top tracks from Last.fm
                    </TableCaption>
                    <TableHeader>
                      <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                        <TableHead className="w-[50px] sm:w-[60px] text-center text-zinc-400 font-medium text-xs sm:text-sm">
                          #
                        </TableHead>
                        <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm">
                          Track
                        </TableHead>
                        <TableHead className="hidden md:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
                          Artist
                        </TableHead>
                        <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm">
                          Listeners
                        </TableHead>
                        <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm">
                          Playcount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memoizedTracks.map((track, index) => {
                        const isThisTrack = currentTrackId === track.id;
                        return (
                          <TableRow
                            key={track.id || index}
                            onClick={() =>
                              router.push(
                                `/Songs/${track.id}?name=${encodeURIComponent(
                                  track.name
                                )}`
                              )
                            }
                            onMouseEnter={() => setHoveredTrackId(track.id)}
                            onMouseLeave={() => setHoveredTrackId(null)}
                            className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                          >
                            <TableCell className="text-center py-3 sm:py-4">
                              <span
                                className={`text-xs sm:text-sm font-medium ${
                                  isThisTrack
                                    ? "text-green-400"
                                    : "text-zinc-400"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 sm:py-4">
                              <div className="flex items-center space-x-2 sm:space-x-3">
                                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden flex-shrink-0 group/image">
                                  <Image
                                    src={
                                      track.image[0]["#text"] ||
                                      "/placeholder.svg"
                                    }
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                    alt={track.name}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayPauseTrack(
                                          track.id,
                                          track.name,
                                          track.artist.name
                                        );
                                      }}
                                    >
                                      {isTrackPlaying(track.id) ? (
                                        <Pause
                                          className="h-3 w-3 sm:h-4 sm:w-4"
                                          fill="currentColor"
                                        />
                                      ) : (
                                        <Play
                                          className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5"
                                          fill="currentColor"
                                        />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`font-medium truncate transition-colors text-sm sm:text-base ${
                                      isThisTrack
                                        ? "text-green-400"
                                        : "text-white hover:text-green-400"
                                    }`}
                                  >
                                    {track.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-3 sm:py-4">
                              <div
                                className="text-zinc-400 hover:text-white hover:underline cursor-pointer truncate text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/Artists/${
                                      track.artist.id
                                    }?name=${encodeURIComponent(
                                      track.artist.name
                                    )}`
                                  );
                                }}
                              >
                                {track.artist.name}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right py-3 sm:py-4">
                              <NumberTicker
                                value={track.listeners}
                                className="text-zinc-400 text-sm"
                              />
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right py-3 sm:py-4">
                              <NumberTicker
                                value={track.playcount}
                                className="text-zinc-400 text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
                {memoizedTracks.map((track, index) => {
                  const isThisTrack = currentTrackId === track.id;
                  return (
                    <PlaylistCard
                      key={track.id || index}
                      id={track.id}
                      image={track.image[0]["#text"] || "/placeholder.svg"}
                      title={track.name}
                      description={track.artist.name}
                      isPlaying={isThisTrack && isPlaying}
                      isPaused={isThisTrack && !isPlaying}
                      onPlay={handlePlayTrackWrapper}
                      onPause={pauseTrack}
                      onResume={resumeTrack}
                      onClick={(id, name) =>
                        router.push(
                          `/Songs/${id}?name=${encodeURIComponent(name)}`
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {memoizedTracks.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
              <Music className="h-12 w-12 text-zinc-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">
                No tracks found
              </h3>
              <p className="text-zinc-400 max-w-md">
                Unable to load tracks at this time. Please try again later.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
