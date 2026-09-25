/* eslint-disable react/no-unescaped-entities */
"use client";

import { SongTableRow } from "@/components/SongTableRow";
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
  Search,
  X,
} from "lucide-react";
import { formatSongDuration } from "@/utils/function";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { usePlayer } from "@/contexts/PlayerContext";
import type { PlaylistProps, PlaylistTrack, UserProfile } from "@/lib/types";
import UserHeader, {
  UserHeaderSkeleton,
} from "@/components/Home/UserHeader";
import ViewSelector, { type CollectionView } from "@/components/ViewSelector";

const PlaylistPage = () => {
  const [playlist, setPlaylist] = useState<PlaylistProps | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayUI, setDisplayUI] = useState<CollectionView>("Table");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  const fetchPlaylistDetails = useCallback(
    async (silent = false) => {
      if (!token || !playlistId) return;

      if (!silent) setLoading(true);
      try {
        const [playlistResponse, userResponse] = await Promise.all([
          fetch(`https://api.spotify.com/v1/playlists/${playlistId}?market=from_token`, {
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
            playlistResponse.status,
          );
        }

        if (userResponse) {
          setUserProfile(userResponse);
        }
      } catch (error) {
        console.error("Error fetching playlist details:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, playlistId],
  );

  const fetchUserPlaylists = useCallback(async () => {
    if (!token || !userProfile?.id) return;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/users/${userProfile.id}/playlists`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
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
    [playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying],
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
        },
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
    playlistName: string,
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
        },
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
    trackName: string,
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
        },
      );
      if (response.ok) {
        const { toast } = await import("react-toastify");
        toast.success(`Removed "${trackName}" from playlist`);
        fetchPlaylistDetails(true);
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
        },
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
          : "Failed to save to Liked Songs",
      );
    }
  };

  const confirmRemoveTrack = () => {
    if (trackToRemove) {
      handleRemoveFromPlaylist(trackToRemove.uri, trackToRemove.name);
      setTrackToRemove(null);
    }
  };

  // Helper: is a playlist track unavailable/delisted?
  const isUnavailable = (playlistTrack: PlaylistTrack): boolean => {
    if (!playlistTrack?.track) return true;
    const t = playlistTrack.track as PlaylistTrack["track"] & {
      is_playable?: boolean;
      restrictions?: { reason: string };
    };
    if (t.is_playable === false) return true;
    if (t.restrictions && Object.keys(t.restrictions).length > 0) return true;
    return false;
  };

  const memoizedTracks = useMemo(
    () => (playlist?.tracks?.items || []).filter((item) => item?.track != null),
    [playlist?.tracks?.items],
  );

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return memoizedTracks;
    const q = searchQuery.toLowerCase();
    return memoizedTracks.filter((item) => {
      const track = item.track;
      const nameMatch = track.name.toLowerCase().includes(q);
      const artistMatch = track.artists.some((a: { name: string }) =>
        a.name.toLowerCase().includes(q),
      );
      const albumMatch = track.album?.name?.toLowerCase().includes(q);
      return nameMatch || artistMatch || albumMatch;
    });
  }, [memoizedTracks, searchQuery]);

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
          <UserHeaderSkeleton />
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

      {/* Display Toggle + Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Songs
            {searchQuery.trim() && (
              <span className="ml-3 text-base font-normal text-zinc-400">
                {filteredTracks.length} result{filteredTracks.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <ViewSelector
            value={displayUI}
            onChange={setDisplayUI}
            options={["Table", "Grid"]}
          />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in playlist…"
            className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            style={{
              // @ts-ignore
              "--tw-ring-color": "hsl(var(--brand-primary) / 0.5)",
            } as React.CSSProperties}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "hsl(var(--brand-primary) / 0.6)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "";
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Songs Display */}
      {displayUI === "Table" ? (
        <div className="bg-zinc-900/30">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                <TableHead className="w-12 text-center text-zinc-400 font-medium text-xs sm:text-sm">
                  #
                </TableHead>
                <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm w-[40%] sm:w-[45%]">
                  Title
                </TableHead>
                <TableHead className="hidden lg:table-cell text-zinc-400 font-medium text-xs sm:text-sm w-[25%] sm:w-[30%]">
                  Album
                </TableHead>
                <TableHead className="hidden xl:table-cell text-zinc-400 font-medium text-xs sm:text-sm w-[15%]">
                  Date added
                </TableHead>
                <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm w-20">
                  <Clock className="h-4 w-4 ml-auto" />
                </TableHead>
                <TableHead className="w-12 text-zinc-400 font-medium text-xs sm:text-sm"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTracks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                    No songs match &ldquo;{searchQuery}&rdquo;
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredTracks.map((playlistTrack, index) => {
                const { track } = playlistTrack;
                const unavailable = isUnavailable(playlistTrack);
                const isCurrentlyPlaying = !unavailable && isCurrentTrackPlaying(track.id);

                return (
                  <SongTableRow
                    key={track.id}
                    className={`border-zinc-800/30 transition-colors group ${
                      unavailable
                        ? "opacity-40 cursor-default"
                        : "hover:bg-zinc-800/20 cursor-pointer"
                    }`}
                    onActivate={unavailable ? undefined : () => handlePlayPause(track)}
                    aria-label={unavailable ? `${track.name} (unavailable)` : `${isCurrentlyPlaying ? "Pause" : "Play"} ${track.name}`}
                  >
                    <TableCell className="text-center py-3 sm:py-4">
                      <span
                        className={
                          isCurrentlyPlaying
                            ? "text-brand tabular-nums text-xs"
                            : "text-zinc-500 tabular-nums text-xs"
                        }
                      >
                        {index + 1}
                      </span>
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
                            className={`font-medium truncate text-sm sm:text-base ${
                              unavailable
                                ? "text-zinc-500 line-through"
                                : isCurrentlyPlaying
                                  ? "text-brand hover:text-brand"
                                  : "text-white hover:text-brand transition-colors"
                            }`}
                          >
                            {track.name}
                          </div>
                          {unavailable ? (
                            <div className="text-zinc-600 text-xs mt-0.5 italic">Not available in your region</div>
                          ) : (
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
                                  {artistIndex < track.artists.length - 1 && ", "}
                                </span>
                              ))}
                            </div>
                          )}
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
                        {new Date(playlistTrack.added_at).toLocaleDateString()}
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
                            aria-label={`More options for ${track.name}`}
                            className="touch-action-reveal h-10 w-10 sm:h-8 sm:w-8 rounded-lg border border-transparent text-zinc-400 hover:border-brand/30 hover:bg-brand/15 hover:text-zinc-100 focus-visible:ring-brand data-[state=open]:opacity-100 data-[state=open]:border-brand/30 data-[state=open]:bg-brand/15 data-[state=open]:text-zinc-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        {unavailable ? (
                          // Unavailable track: only show Remove if owner
                          <DropdownMenuContent align="end" className="w-64">
                            {isOwner ? (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackToRemove({
                                    uri: track.uri,
                                    name: track.name,
                                  });
                                }}
                                className="text-red-400 focus:bg-red-500/15 focus:text-red-300 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-300"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Remove from this playlist
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Music className="mr-2 h-4 w-4" />
                                Song unavailable
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        ) : (
                          // Normal track: full menu
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ListPlus className="mr-2 h-4 w-4" />
                                Add to playlist
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-64 max-h-[40vh] mr-4 overflow-y-auto">
                                {userPlaylists.map((pl) => (
                                  <DropdownMenuItem
                                    key={pl.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToPlaylist(
                                        track.uri,
                                        pl.id,
                                        pl.name,
                                      );
                                    }}
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
                                className="text-red-400 focus:bg-red-500/15 focus:text-red-300 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-300"
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
                            >
                              <Heart
                                className={`mr-2 h-4 w-4 ${
                                  likedTracks.has(track.id)
                                    ? "fill-brand text-brand"
                                    : ""
                                }`}
                              />
                              {likedTracks.has(track.id)
                                ? "Remove from Liked Songs"
                                : "Save to Liked Songs"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArtistClick(
                                  track.artists[0].id,
                                  track.artists[0].name,
                                );
                              }}
                            >
                              <User className="mr-2 h-4 w-4" />
                              Go to artist
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAlbumClick(
                                  track.album.id,
                                  track.album.name,
                                );
                              }}
                            >
                              <Disc className="mr-2 h-4 w-4" />
                              Go to album
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        )}
                      </DropdownMenu>
                    </TableCell>
                  </SongTableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="media-grid">
          {filteredTracks.length === 0 && searchQuery.trim() ? (
            <div className="col-span-full text-center py-12 text-zinc-500">
              No songs match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : null}
          {filteredTracks.map((playlistTrack, index) => {
            const { track } = playlistTrack;
            const unavailable = isUnavailable(playlistTrack);
            return (
              <div
                key={track.id}
                className={unavailable ? "opacity-40 grayscale pointer-events-none" : ""}
              >
              <PlaylistCard
                id={track.id}
                image={track.album.images[0]?.url || "/placeholder.svg"}
                title={track.name}
                description={
                  unavailable
                    ? "Not available in your region"
                    : track.artists.map((a) => a.name).join(", ")
                }
                badge={`#${index + 1}`}
                duration={formatSongDuration(track.duration_ms)}
                isPlaying={!unavailable && currentTrack?.id === track.id && isPlaying}
                onPlay={unavailable ? () => {} : () => handlePlayPause(track)}
                onPause={pauseTrack}
                onClick={unavailable ? () => {} : (id) => {
                  // Navigate to song details
                  router.push(
                    `/Songs/${id}?name=${encodeURIComponent(track.name)}`,
                  );
                }}
                menu={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`More options for ${track.name}`}
                        className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg border border-white/15 bg-zinc-950/90 text-zinc-100 hover:border-brand/50 hover:bg-zinc-900 hover:text-brand focus-visible:ring-brand data-[state=open]:border-brand/50 data-[state=open]:text-brand"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <ListPlus className="mr-2 h-4 w-4" />
                          Add to playlist
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64 max-h-[50vh] overflow-y-auto">
                          {userPlaylists.map((pl) => (
                            <DropdownMenuItem
                              key={pl.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToPlaylist(track.uri, pl.id, pl.name);
                              }}
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
                          className="text-red-400 focus:bg-red-500/15 focus:text-red-300 data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-300"
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
                      >
                        <Heart
                          className={`mr-2 h-4 w-4 ${
                            likedTracks.has(track.id)
                              ? "fill-brand text-brand"
                              : ""
                          }`}
                        />
                        {likedTracks.has(track.id)
                          ? "Remove from Liked Songs"
                          : "Save to Liked Songs"}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArtistClick(
                            track.artists[0].id,
                            track.artists[0].name,
                          );
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Go to artist
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAlbumClick(track.album.id, track.album.name);
                        }}
                      >
                        <Disc className="mr-2 h-4 w-4" />
                        Go to album
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
              </div>
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
