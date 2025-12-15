/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
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
  const { playTrack, pauseTrack, currentTrack, isPlaying } = usePlayer();

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
      // If this track is currently playing, pause it
      if (currentTrack?.id === track.id && isPlaying) {
        pauseTrack();
      } else {
        // Otherwise, play this track
        playTrack({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: {
            name: track.album.name,
            images: track.album.images,
            id: track.album.id,
            artists: track.artists, // Use track artists as album artists
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
    [playTrack, pauseTrack, currentTrack, isPlaying]
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

  const TrackCard = ({
    playlistTrack,
    index,
  }: {
    playlistTrack: PlaylistTrack;
    index: number;
  }) => {
    const { track } = playlistTrack;
    const isCurrentlyPlaying = isCurrentTrackPlaying(track.id);
    const isHovered = hoveredTrackId === track.id;

    return (
      <TooltipProvider>
        <Card
          className="relative w-[200px] h-[320px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
          onClick={() => handlePlayPause(track)}
          onMouseEnter={() => setHoveredTrackId(track.id)}
          onMouseLeave={() => setHoveredTrackId(null)}
        >
          <CardHeader className="p-0 pb-0">
            <div className="relative w-full px-4 pt-4 pb-2">
              <div className="w-[170px] h-[170px] rounded-lg shadow-lg overflow-hidden">
                <Image
                  src={track.album.images[0]?.url || "/placeholder.svg"}
                  width={170}
                  height={170}
                  className="object-cover rounded-lg"
                  alt={track.name}
                />
              </div>

              {/* Play/Pause button overlay */}
              <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause(track);
                  }}
                >
                  {isCurrentlyPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                  )}
                </Button>
              </div>

              {/* Track number badge */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
                #{index + 1}
              </div>

              {/* Currently playing indicator */}
              {isCurrentlyPlaying && (
                <div className="absolute top-2 right-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                  Playing
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-2 space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle
                  className={`text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors ${
                    isCurrentlyPlaying ? "text-green-400" : "text-white"
                  }`}
                >
                  {track.name}
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{track.name}</p>
              </TooltipContent>
            </Tooltip>

            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="text-zinc-400 text-sm line-clamp-1 hover:text-zinc-300 transition-colors cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArtistClick(
                        track.artists[0].id,
                        track.artists[0].name
                      );
                    }}
                  >
                    {track.artists.map((artist) => artist.name).join(", ")}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>{track.artists.map((artist) => artist.name).join(", ")}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="text-zinc-500 text-xs line-clamp-1 hover:text-zinc-400 transition-colors cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAlbumClick(track.album.id, track.album.name);
                    }}
                  >
                    {track.album.name}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>{track.album.name}</p>
                </TooltipContent>
              </Tooltip>

              <div className="text-zinc-500 text-xs">
                {formatSongDuration(track.duration_ms)}
              </div>
            </div>
          </CardContent>

          {/* More options button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 text-zinc-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              // Handle more options
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </Card>
      </TooltipProvider>
    );
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
    <div className="p-4 space-y-6">
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
        <h2 className="text-2xl font-bold text-white">Songs</h2>
        <div className="flex items-center space-x-3">
          <PiTable
            size={35}
            onClick={() => setDisplayUI("Table")}
            className={`cursor-pointer transition-colors ${
              displayUI === "Table"
                ? "text-white"
                : "text-[#707070] hover:text-white"
            }`}
          />
          <LuLayoutGrid
            size={30}
            onClick={() => setDisplayUI("Grid")}
            className={`cursor-pointer transition-colors ${
              displayUI === "Grid"
                ? "text-white"
                : "text-[#707070] hover:text-white"
            }`}
          />
        </div>
      </div>

      {/* Songs Display */}
      {displayUI === "Table" ? (
        <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                <TableHead className="w-[60px] text-center text-zinc-400 font-medium">
                  #
                </TableHead>
                <TableHead className="text-zinc-400 font-medium">
                  Title
                </TableHead>
                <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                  Album
                </TableHead>
                <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                  Date added
                </TableHead>
                <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium">
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
                    <TableCell className="text-center">
                      {isHovered ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 rounded-full hover:bg-green-500 hover:text-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause(track);
                          }}
                        >
                          {getPlayPauseIcon(track.id, true)}
                        </Button>
                      ) : (
                        <span
                          className={`text-sm ${
                            isCurrentlyPlaying
                              ? "text-green-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {index + 1}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
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
                            className={`font-medium truncate hover:text-green-400 transition-colors ${
                              isCurrentlyPlaying
                                ? "text-green-400"
                                : "text-white"
                            }`}
                          >
                            {track.name}
                          </div>
                          <div className="text-zinc-400 text-sm truncate">
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
                                {artistIndex < track.artists.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <button
                        className="text-zinc-400 hover:text-white hover:underline transition-colors truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlbumClick(track.album.id, track.album.name);
                        }}
                      >
                        {track.album.name}
                      </button>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <span className="text-zinc-400 text-sm">
                        {new Date(playlistTrack.added_at).toLocaleDateString()}
                      </span>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-right">
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
          {memoizedTracks.map((playlistTrack, index) => (
            <TrackCard
              key={playlistTrack.track.id}
              playlistTrack={playlistTrack}
              index={index}
            />
          ))}
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
