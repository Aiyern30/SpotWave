/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui";
import {
  Play,
  Pause,
  Clock,
  MoreHorizontal,
  Music,
  Heart,
  ListPlus,
  Ban,
  UserPlus,
  Disc,
  User,
} from "lucide-react";
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
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [trackToRemove, setTrackToRemove] = useState<{
    uri: string;
    name: string;
  } | null>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();

  const segments = pathname.split("/");
  const playlistId = segments[segments.length - 1];
  const playlistName = searchParams.get("name");

  const isOwner = playlist?.owner?.id === userProfile?.id;

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

  const fetchUserPlaylists = useCallback(async () => {
    if (!token || !userProfile?.id) return;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/users/${userProfile.id}/playlists`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setUserPlaylists(data.items);
      } else {
        console.error("Failed to fetch user playlists:", response.status);
      }
    } catch (error) {
      console.error("Error fetching user playlists:", error);
    }
  }, [token, userProfile?.id]);

  useEffect(() => {
    if (token) {
      fetchPlaylistDetails();
      fetchUserPlaylists();
      checkLikedTracks();
    }
  }, [token, fetchPlaylistDetails, fetchUserPlaylists]);

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

  const checkLikedTracks = async () => {
    if (!token || !playlist?.tracks.items) return;
    try {
      const trackIds = playlist.tracks.items
        .map((item) => item.track.id)
        .join(",");
      const response = await fetch(
        `https://api.spotify.com/v1/me/tracks/contains?ids=${trackIds}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const liked = new Set<string>();
        playlist.tracks.items.forEach((item, index) => {
          if (data[index]) {
            liked.add(item.track.id);
          }
        });
        setLikedTracks(liked);
      }
    } catch (error) {
      console.error("Error checking liked tracks:", error);
    }
  };

  const handleAddToPlaylist = async (
    trackUri: string,
    playlistId: string,
    playlistName: string
  ) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [trackUri] }),
        }
      );
      if (response.ok) {
        const { toast } = await import("react-toastify");
        toast.success(`Added to ${playlistName}!`);
      } else {
        throw new Error("Failed to add");
      }
    } catch (error) {
      console.error("Error adding to playlist:", error);
      const { toast } = await import("react-toastify");
      toast.error("Failed to add to playlist");
    }
  };

  const handleRemoveFromPlaylist = async (
    trackUri: string,
    trackName: string
  ) => {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tracks: [{ uri: trackUri }] }),
        }
      );
      if (response.ok) {
        const { toast } = await import("react-toastify");
        toast.success(`Removed "${trackName}" from playlist`);
        fetchPlaylistDetails();
      } else {
        throw new Error("Failed to remove");
      }
    } catch (error) {
      console.error("Error removing from playlist:", error);
      const { toast } = await import("react-toastify");
      toast.error("Failed to remove from playlist");
    }
  };

  const handleSaveToLiked = async (trackId: string, trackName: string) => {
    const isLiked = likedTracks.has(trackId);

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/tracks?ids=${trackId}`,
        {
          method: isLiked ? "DELETE" : "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const { toast } = await import("react-toastify");
        if (isLiked) {
          toast.success(`"${trackName}" removed from Liked Songs`);
          setLikedTracks((prev) => {
            const newSet = new Set(prev);
            newSet.delete(trackId);
            return newSet;
          });
        } else {
          toast.success(`"${trackName}" saved to Liked Songs!`);
          setLikedTracks((prev) => new Set(prev).add(trackId));
        }
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving to liked:", error);
      const { toast } = await import("react-toastify");
      toast.error(
        isLiked
          ? "Failed to remove from Liked Songs"
          : "Failed to save to Liked Songs"
      );
    }
  };

  const confirmRemoveTrack = () => {
    if (trackToRemove) {
      handleRemoveFromPlaylist(trackToRemove.uri, trackToRemove.name);
      setTrackToRemove(null);
    }
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
      <div className="space-y-6">
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
      <div className="space-y-6">
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
    <div className="space-y-4 sm:space-y-8">
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
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                  <TableHead className="w-12 text-center text-zinc-400 font-medium text-xs sm:text-sm">
                    #
                  </TableHead>
                  <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm">
                    Title
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
                    Album
                  </TableHead>
                  <TableHead className="hidden xl:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
                    Date added
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm">
                    <Clock className="h-4 w-4 ml-auto" />
                  </TableHead>
                  <TableHead className="w-12 text-zinc-400 font-medium text-xs sm:text-sm"></TableHead>
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

                      <TableCell className="py-3 sm:py-4 max-w-0">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
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

                      <TableCell className="hidden lg:table-cell py-3 sm:py-4">
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

                      <TableCell className="hidden xl:table-cell py-3 sm:py-4">
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

                      <TableCell className="py-3 sm:py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-56 bg-zinc-900 border-zinc-800"
                          >
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="">
                                <ListPlus className="mr-2 h-4 w-4" />
                                Add to playlist
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="bg-zinc-900 border-zinc-800 max-h-[300px] overflow-y-auto">
                                {userPlaylists.map((pl) => (
                                  <DropdownMenuItem
                                    key={pl.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToPlaylist(
                                        track.uri,
                                        pl.id,
                                        pl.name
                                      );
                                    }}
                                    className="text-white hover:bg-green-500/20 hover:text-green-400"
                                  >
                                    {pl.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {isOwner && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackToRemove({
                                    uri: track.uri,
                                    name: track.name,
                                  });
                                }}
                                className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Remove from this playlist
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveToLiked(track.id, track.name);
                              }}
                              className="text-white hover:bg-green-500/20 hover:text-green-400"
                            >
                              <Heart
                                className={`mr-2 h-4 w-4 ${
                                  likedTracks.has(track.id)
                                    ? "fill-green-500 text-green-500"
                                    : ""
                                }`}
                              />
                              {likedTracks.has(track.id)
                                ? "Remove from Liked Songs"
                                : "Save to Liked Songs"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-zinc-800" />

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArtistClick(
                                  track.artists[0].id,
                                  track.artists[0].name
                                );
                              }}
                              className="text-white hover:bg-green-500/20 hover:text-green-400"
                            >
                              <User className="mr-2 h-4 w-4" />
                              Go to artist
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAlbumClick(
                                  track.album.id,
                                  track.album.name
                                );
                              }}
                              className="text-white hover:bg-green-500/20 hover:text-green-400"
                            >
                              <Disc className="mr-2 h-4 w-4" />
                              Go to album
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                menu={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-zinc-900 border-zinc-800"
                    >
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="">
                          <ListPlus className="mr-2 h-4 w-4" />
                          Add to playlist
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-zinc-900 border-zinc-800 max-h-[300px] overflow-y-auto">
                          {userPlaylists.map((pl) => (
                            <DropdownMenuItem
                              key={pl.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToPlaylist(track.uri, pl.id, pl.name);
                              }}
                              className="text-white hover:bg-green-500/20 hover:text-green-400"
                            >
                              {pl.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {isOwner && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackToRemove({
                              uri: track.uri,
                              name: track.name,
                            });
                          }}
                          className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Remove from this playlist
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveToLiked(track.id, track.name);
                        }}
                        className="text-white hover:bg-green-500/20 hover:text-green-400"
                      >
                        <Heart
                          className={`mr-2 h-4 w-4 ${
                            likedTracks.has(track.id)
                              ? "fill-green-500 text-green-500"
                              : ""
                          }`}
                        />
                        {likedTracks.has(track.id)
                          ? "Remove from Liked Songs"
                          : "Save to Liked Songs"}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-zinc-800" />

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArtistClick(
                            track.artists[0].id,
                            track.artists[0].name
                          );
                        }}
                        className="text-white hover:bg-green-500/20 hover:text-green-400"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Go to artist
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlbumClick(track.album.id, track.album.name);
                        }}
                        className="text-white hover:bg-green-500/20 hover:text-green-400"
                      >
                        <Disc className="mr-2 h-4 w-4" />
                        Go to album
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
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

      {/* Remove Track Confirmation Dialog */}
      <AlertDialog
        open={!!trackToRemove}
        onOpenChange={() => setTrackToRemove(null)}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Remove from playlist?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to remove "{trackToRemove?.name}" from this
              playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveTrack}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlaylistPage;
