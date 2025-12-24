/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Skeleton,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { Play, Pause, Clock, MoreHorizontal, Music } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { formatSongDuration } from "@/utils/function";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { usePlayer } from "@/contexts/PlayerContext";
import type { PlaylistProps, PlaylistTrack, UserProfile } from "@/lib/types";
import UserHeader from "@/components/Home/UserHeader";

const PlaylistPage = () => {
  const [playlist, setPlaylist] = useState<PlaylistProps | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayUI, setDisplayUI] = useState<string>("Table");
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();

  const segments = pathname.split("/");
  const playlistId = segments[segments.length - 1];
  const playlistName = searchParams.get("name");

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchPlaylistDetails = useCallback(async () => {
    if (!token || !playlistId) return;

    setLoading(true);
    try {
      const [playlistResponse, userResponse] = await Promise.all([
        fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchUserProfile(token),
      ]);

      if (playlistResponse.ok) {
        const playlistData = await playlistResponse.json();
        setPlaylist(playlistData);
      } else {
        console.error(
          "Failed to fetch playlist details:",
          playlistResponse.status
        );
      }

      if (userResponse) {
        setUserProfile(userResponse);
      }
    } catch (error) {
      console.error("Error fetching playlist details:", error);
    } finally {
      setLoading(false);
    }
  }, [token, playlistId]);

  useEffect(() => {
    if (token) {
      fetchPlaylistDetails();
    }
  }, [token, fetchPlaylistDetails]);

  const handlePlayPause = useCallback(
    (track: PlaylistTrack["track"]) => {
      // Check if this track is currently playing
      if (currentTrack?.id === track.id && isPlaying) {
        // If it's playing, pause it
        pauseTrack();
      } else if (currentTrack?.id === track.id && !isPlaying) {
        // If it's the same track but paused, resume it (don't restart)
        resumeTrack();
      } else {
        // Different track, play it from the beginning
        playTrack({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: {
            name: track.album.name,
            images: track.album.images,
            id: track.album.id,
            artists: track.artists,
            release_date: "",
            total_tracks: 0,
          },
          duration_ms: track.duration_ms,
          explicit: false,
          external_urls: {
            spotify: `https://open.spotify.com/track/${track.id}`,
          },
          popularity: 0,
          preview_url: track.preview_url || null,
          track_number: 0,
          disc_number: 1,
          uri: track.uri,
        });
      }
    },
    [playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying]
  );

  const handleArtistClick = (artistId: string, artistName: string) => {
    router.push(`/Artists/${artistId}?name=${encodeURIComponent(artistName)}`);
  };

  const handleAlbumClick = (albumId: string, albumName: string) => {
    router.push(`/Albums/${albumId}?name=${encodeURIComponent(albumName)}`);
  };

  const memoizedTracks = useMemo(
    () => playlist?.tracks?.items || [],
    [playlist?.tracks?.items]
  );

  const isCurrentTrackPlaying = (trackId: string) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const getPlayPauseIcon = (trackId: string, isHovered: boolean) => {
    const isCurrentlyPlaying = isCurrentTrackPlaying(trackId);

    if (isHovered) {
      return isCurrentlyPlaying ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" fill="currentColor" />
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <Header />
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-48 h-48 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (!playlist || !userProfile) {
    return (
      <div className="p-4 space-y-6">
        <Header />
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
            <Music className="h-12 w-12 text-zinc-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">
              Playlist not found
            </h3>
            <p className="text-zinc-400 max-w-md">
              The playlist you're looking for doesn't exist or is not
              accessible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <Header />

      {/* Enhanced UserHeader */}
      <UserHeader
        playlist={playlist}
        user={userProfile}
        id={userProfile.id}
        refetch={fetchPlaylistDetails}
      />

      {/* Display Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Songs
        </h2>
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

      {/* Songs Display */}
      {displayUI === "Table" ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
          <div className="bg-zinc-900/30">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                  <TableHead className="w-[50px] sm:w-[60px] text-center text-zinc-400 font-medium text-xs sm:text-sm">
                    #
                  </TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm">
                    Title
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
                    Album
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
                    Date added
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm">
                    <Clock className="h-4 w-4 ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memoizedTracks.map((playlistTrack, index) => {
                  const { track } = playlistTrack;
                  const isCurrentlyPlaying = isCurrentTrackPlaying(track.id);
                  const isHovered = hoveredTrackId === track.id;

                  return (
                    <TableRow
                      key={track.id}
                      className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                      onClick={() => handlePlayPause(track)}
                      onMouseEnter={() => setHoveredTrackId(track.id)}
                      onMouseLeave={() => setHoveredTrackId(null)}
                    >
                      <TableCell className="text-center py-3 sm:py-4">
                        {isHovered ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-green-500 hover:text-black"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPause(track);
                            }}
                          >
                            {isCurrentlyPlaying ? (
                              <Pause
                                className="w-3 h-3 sm:w-4 sm:h-4"
                                fill="currentColor"
                              />
                            ) : (
                              <Play
                                className="w-3 h-3 sm:w-4 sm:h-4"
                                fill="currentColor"
                              />
                            )}
                          </Button>
                        ) : (
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              isCurrentlyPlaying
                                ? "text-green-400"
                                : "text-zinc-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 sm:py-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={
                                track.album.images[0]?.url || "/placeholder.svg"
                              }
                              width={48}
                              height={48}
                              className="object-cover"
                              alt={track.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`font-medium truncate hover:text-green-400 transition-colors text-sm sm:text-base ${
                                isCurrentlyPlaying
                                  ? "text-green-400"
                                  : "text-white"
                              }`}
                            >
                              {track.name}
                            </div>
                            <div className="text-zinc-400 text-xs sm:text-sm truncate">
                              {track.artists.map((artist, artistIndex) => (
                                <span key={artist.id}>
                                  <button
                                    className="hover:underline hover:text-white transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArtistClick(artist.id, artist.name);
                                    }}
                                  >
                                    {artist.name}
                                  </button>
                                  {artistIndex < track.artists.length - 1 &&
                                    ", "}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell py-3 sm:py-4">
                        <button
                          className="text-zinc-400 hover:text-white hover:underline transition-colors truncate text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlbumClick(track.album.id, track.album.name);
                          }}
                        >
                          {track.album.name}
                        </button>
                      </TableCell>

                      <TableCell className="hidden md:table-cell py-3 sm:py-4">
                        <span className="text-zinc-400 text-sm">
                          {new Date(
                            playlistTrack.added_at
                          ).toLocaleDateString()}
                        </span>
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-right py-3 sm:py-4">
                        <span className="text-zinc-400 text-sm">
                          {formatSongDuration(track.duration_ms)}
                        </span>
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
          {memoizedTracks.map((playlistTrack, index) => {
            const { track } = playlistTrack;
            return (
              <PlaylistCard
                key={track.id}
                id={track.id}
                image={track.album.images[0]?.url || "/placeholder.svg"}
                title={track.name}
                description={track.artists.map((a) => a.name).join(", ")}
                badge={`#${index + 1}`}
                duration={formatSongDuration(track.duration_ms)}
                isPlaying={currentTrack?.id === track.id && isPlaying}
                onPlay={() => handlePlayPause(track)}
                onPause={pauseTrack}
                onClick={(id) => {
                  // Navigate to song details
                  router.push(
                    `/Songs/${id}?name=${encodeURIComponent(track.name)}`
                  );
                }}
              />
            );
          })}
        </div>
      )}

      {memoizedTracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
            <Music className="h-12 w-12 text-zinc-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">
              No songs in this playlist
            </h3>
            <p className="text-zinc-400 max-w-md">
              This playlist is empty. Add some songs to get started!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistPage;
