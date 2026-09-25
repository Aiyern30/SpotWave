"use client";

import { SongTableRow } from "@/components/SongTableRow";
import AlbumHeader from "@/components/AlbumHeader";

import type React from "react";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PiTable } from "react-icons/pi";
import { LayoutGridIcon as LuLayoutGrid } from "lucide-react";
import {
  Play,
  Clock,
  ExternalLink,
  Music,
  Calendar,
  Disc3,
  Disc,
  Pause,
  Heart,
  MoreHorizontal,
  ListPlus,
  User,
} from "lucide-react";
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
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
  Button,
  Pagination,
  PaginationContent,
  PaginationNext,
  PaginationPrevious,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import Image from "next/image";
import { formatSongDuration } from "@/utils/function";
import { fetchAlbumDetails } from "@/utils/fetchAlbumDetails";
import type { Album } from "@/lib/types";
import { usePlayer } from "@/contexts/PlayerContext";
import PlaylistCard from "@/components/PlaylistCard";

const itemsPerPage = 10;

const AlbumsIDPage = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const segments = pathname.split("/");
  const id = segments[segments.length - 1];
  const name = searchParams.get("name");
  const [token, setToken] = useState<string>("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [displayUI, setDisplayUI] = useState<"Table" | "Grid">("Table");
  const [currentPage, setCurrentPage] = useState(1);
  const [inputPage, setInputPage] = useState<string>("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredArtist, setHoveredArtist] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [artistImage, setArtistImage] = useState<string | null>(null);
  const [isCheckingSaved, setIsCheckingSaved] = useState<boolean>(true);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [playlistTracks, setPlaylistTracks] = useState<Record<string, Set<string>>>({});
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);

  const handleArtistClick = (artistId: string, name: string) => {
    router.push(`/Artists/${artistId}?name=${encodeURIComponent(name)}`);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedItems = useMemo(() => {
    return album?.tracks?.items?.slice(startIndex, endIndex) || [];
  }, [album?.tracks?.items, startIndex, endIndex]);

  const totalPages = Math.ceil(
    (album?.tracks?.items?.length || 0) / itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setInputPage(String(page));
  };

  const handlePagePrevious = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handlePageNext = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPage(e.target.value);
  };

  const handleInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const page = Number.parseInt(inputPage, 10);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
    }
  };

  useEffect(() => {
    const fetchAndSetAlbum = async () => {
      if (id && token) {
        const albumData = await fetchAlbumDetails(id, token);
        if (albumData) {
          setAlbum(albumData);

          // Fetch artist details for the main artist image
          if (albumData.artists?.[0]) {
            fetch(
              `https://api.spotify.com/v1/artists/${albumData.artists[0].id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            )
              .then((res) => res.json())
              .then((data) => setArtistImage(data.images?.[0]?.url || null))
              .catch((err) =>
                console.error("Error fetching artist image:", err)
              );
          }
        }

        // Check if album is saved
        fetch(`https://api.spotify.com/v1/me/albums/contains?ids=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => setIsSaved(data[0]))
          .catch((err) => console.error("Error checking saved status:", err))
          .finally(() => setIsCheckingSaved(false));
      }
    };

    fetchAndSetAlbum();
  }, [id, token]);

  // Update current track ID when track changes
  useEffect(() => {
    if (currentTrack?.id) {
      setCurrentTrackId(currentTrack.id);
    }
  }, [currentTrack]);

  // Update handlePlayPauseTrack to properly handle pause/resume
  const handlePlayPauseTrack = (item: any) => {
    // Check if this track is currently playing
    if (currentTrackId === item.id) {
      // Same track - toggle play/pause
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      // Different track, play it
      try {
        playTrack({
          id: item.id,
          name: item.name,
          artists: item.artists.map((artist: any) => ({
            name: artist.name,
            id: artist.id,
          })),
          album: {
            name: item.album?.name || album?.name || "",
            images: item.album?.images || album?.images || [],
            id: item.album?.id || album?.id || "",
            artists: item.artists,
            release_date: item.album?.release_date || album?.release_date || "",
            total_tracks: item.album?.total_tracks || album?.total_tracks || 0,
          },
          duration_ms: item.duration_ms,
          explicit: item.explicit || false,
          external_urls: {
            spotify: `https://open.spotify.com/track/${item.id}`,
          },
          popularity: 0,
          preview_url: item.preview_url || null,
          track_number: item.track_number || 0,
          disc_number: item.disc_number || 1,
          uri: item.uri,
        });
        setCurrentTrackId(item.id);
      } catch (error) {
        console.error("Error playing track:", error);
      }
    }
  };

  // Helper function to check if track is currently playing
  const isTrackPlaying = (trackId: string) => {
    return currentTrackId === trackId && isPlaying;
  };

  // Wrapper for PlaylistCard compatibility
  const handlePlayTrackWrapper = (trackId?: string) => {
    if (!trackId) return;
    const track = paginatedItems.find((t) => t.id === trackId);
    if (track) {
      handlePlayPauseTrack(track);
    }
  };

  const toggleSaveAlbum = async () => {
    if (!token || !id) return;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/albums?ids=${id}`,
        {
          method: isSaved ? "DELETE" : "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setIsSaved(!isSaved);
        const { toast } = await import("react-toastify");
        toast.success(isSaved ? "Removed from library" : "Saved to library");
      }
    } catch (error) {
      console.error("Error toggling saved status:", error);
    }
  };

  const isTrackSaved = (trackId: string) =>
    likedTracks.has(trackId) ||
    Object.values(playlistTracks).some((s) => s.has(trackId));

  const handleAddToPlaylist = async (trackUri: string, playlistId: string, playlistName: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [trackUri] }),
      });
      if (response.ok) {
        const { toast } = await import("react-toastify");
        toast.success(`Added to ${playlistName}!`);
        const trackId = trackUri.split(":").pop() || "";
        setPlaylistTracks((prev) => ({
          ...prev,
          [playlistId]: new Set([...(prev[playlistId] || []), trackId]),
        }));
      } else {
        throw new Error("Failed to add");
      }
    } catch {
      const { toast } = await import("react-toastify");
      toast.error("Failed to add to playlist");
    }
  };

  const handleSaveToLiked = async (trackId: string, trackName: string) => {
    const isLiked = likedTracks.has(trackId);
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/tracks?ids=${trackId}`,
        {
          method: isLiked ? "DELETE" : "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const { toast } = await import("react-toastify");
        if (isLiked) {
          toast.success(`"${trackName}" removed from Liked Songs`);
          setLikedTracks((prev) => {
            const next = new Set(prev);
            next.delete(trackId);
            return next;
          });
        } else {
          toast.success(`"${trackName}" saved to Liked Songs!`);
          setLikedTracks((prev) => new Set(prev).add(trackId));
        }
      }
    } catch {
      const { toast } = await import("react-toastify");
      toast.error("Failed to update Liked Songs");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // Fetch liked tracks for all album tracks
  useEffect(() => {
    if (!token || !album?.tracks?.items?.length) return;
    const ids = album.tracks.items.map((t: any) => t.id).join(",");
    fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${ids}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: boolean[]) => {
        const liked = new Set<string>();
        data.forEach((isLiked, i) => {
          if (isLiked) liked.add(album.tracks.items[i].id);
        });
        setLikedTracks(liked);
      })
      .catch(console.error);
  }, [token, album]);

  // Fetch user playlists + their track IDs
  useEffect(() => {
    if (!token) return;
    fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(async (data) => {
        const playlists = data.items || [];
        setUserPlaylists(playlists);
        const trackMap: Record<string, Set<string>> = {};
        await Promise.all(
          playlists.map(async (pl: any) => {
            const r = await fetch(
              `https://api.spotify.com/v1/playlists/${pl.id}/tracks?fields=items(track(id))&limit=100`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (r.ok) {
              const d = await r.json();
              trackMap[pl.id] = new Set(
                (d.items || []).map((it: any) => it.track?.id).filter(Boolean)
              );
            }
          })
        );
        setPlaylistTracks(trackMap);
      })
      .catch(console.error);
  }, [token]);

  if (!album) {
    return (
      <div className="space-y-4 sm:space-y-8">
        {/* Album Header Skeleton */}
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-brand/30 to-transparent rounded-lg p-8">
          <Skeleton className="w-48 h-48 rounded-lg" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        {/* Controls Skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
          </div>
        </div>
        {/* Table Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-8">
        {/* Enhanced Album Header */}
        <AlbumHeader
          album={album}
          isSaved={isSaved}
          toggleSaveAlbum={toggleSaveAlbum}
          artistImage={artistImage}
          handleArtistClick={handleArtistClick}
        />

        {/* Enhanced Controls */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tracks
            </h2>
            <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDisplayUI("Table")}
                className={`h-9 px-3 transition-all ${
                  displayUI === "Table"
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
                onClick={() => setDisplayUI("Grid")}
                className={`h-9 px-3 transition-all ${
                  displayUI === "Grid"
                    ? "bg-brand/10 text-brand hover:bg-brand/20 hover:text-brand"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
            </div>
          </div>

          {displayUI === "Table" ? (
            <div className="bg-zinc-900/50">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-zinc-400">#</TableHead>
                    <TableHead className="text-zinc-400 w-full sm:w-[50%]">Title</TableHead>
                    <TableHead className="hidden md:table-cell w-20 text-right text-zinc-400">
                      <Clock className="w-4 h-4 ml-auto" />
                    </TableHead>
                    <TableHead className="w-12 text-right text-zinc-400" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => (
                    <SongTableRow
                      key={item.id}
                      className="border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                      onActivate={() => handlePlayPauseTrack(item)}
                        aria-label={`${isTrackPlaying(item.id) ? "Pause" : "Play"} ${item.name}`}
                    >
                      <TableCell className="text-center">
                        <span className={isTrackPlaying(item.id) ? "text-brand tabular-nums text-xs" : "text-zinc-500 tabular-nums text-xs"}>{startIndex + index + 1}</span>
                      </TableCell>

                      <TableCell className="max-w-0 py-4">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={item.album?.images?.[0]?.url || album?.images?.[0]?.url || "/placeholder.svg"}
                              width={48}
                              height={48}
                              alt={item.name}
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`font-medium truncate transition-colors flex items-center gap-2 ${
                                isTrackPlaying(item.id)
                                  ? "text-brand"
                                  : "text-white group-hover:text-brand"
                              }`}
                            >
                              <span className="truncate">{item.name}</span>
                              {isTrackSaved(item.id) && (
                                <Heart className="w-4 h-4 fill-brand text-brand flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-zinc-400 text-sm truncate">
                              {item.artists.map((artist: any, artistIndex: number) => (
                                <span key={artist.id}>
                                  <span
                                    className="hover:underline hover:text-brand transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArtistClick(artist.id, artist.name);
                                    }}
                                  >
                                    {artist.name}
                                  </span>
                                  {artistIndex < item.artists.length - 1 && ", "}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-right text-zinc-400 text-sm">
                        {formatSongDuration(item.duration_ms)}
                      </TableCell>

                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`More options for ${item.name}`}
                              className="touch-action-reveal h-10 w-10 sm:h-8 sm:w-8 rounded-lg border border-transparent text-zinc-400 hover:border-brand/30 hover:bg-brand/15 hover:text-zinc-100 focus-visible:ring-brand data-[state=open]:opacity-100 data-[state=open]:border-brand/30 data-[state=open]:bg-brand/15 data-[state=open]:text-zinc-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-white hover:bg-brand/20">
                                <ListPlus className="mr-2 h-4 w-4" />
                                Add to playlist
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="bg-zinc-900 border-zinc-800 max-h-[300px] overflow-y-auto">
                                {userPlaylists.map((pl) => (
                                  <DropdownMenuItem
                                    key={pl.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToPlaylist(item.uri, pl.id, pl.name);
                                    }}
                                    className="text-white hover:bg-brand/20 flex items-center justify-between"
                                  >
                                    <span className="truncate">{pl.name}</span>
                                    {playlistTracks[pl.id]?.has(item.id) && (
                                      <Heart className="w-3 h-3 fill-brand text-brand flex-shrink-0 ml-2" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveToLiked(item.id, item.name);
                              }}
                              className="text-white hover:bg-brand/20"
                            >
                              <Heart
                                className={`mr-2 h-4 w-4 ${likedTracks.has(item.id) ? "fill-brand text-brand" : ""}`}
                              />
                              {likedTracks.has(item.id) ? "Remove from Liked Songs" : "Save to Liked Songs"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-zinc-800" />

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.artists?.[0]) {
                                  handleArtistClick(item.artists[0].id, item.artists[0].name);
                                }
                              }}
                              className="text-white hover:bg-brand/20"
                            >
                              <User className="mr-2 h-4 w-4" />
                              Go to artist
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://open.spotify.com/track/${item.uri.split(":").pop()}`, "_blank");
                              }}
                              className="text-white hover:bg-brand/20"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open in Spotify
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </SongTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="media-grid">
              {paginatedItems.map((item, index) => {
                const isThisTrack = currentTrackId === item.id;
                return (
                  <PlaylistCard
                    key={item.id}
                    id={item.id}
                    image={
                      item.album?.images?.[0]?.url ||
                      album?.images?.[0]?.url ||
                      "/placeholder.svg"
                    }
                    title={item.name}
                    description={item.artists
                      .map((a: any) => a.name)
                      .join(", ")}
                    badge={`#${startIndex + index + 1}`}
                    duration={formatSongDuration(item.duration_ms)}
                    externalUrl={`https://open.spotify.com/track/${item.uri
                      .split(":")
                      .pop()}`}
                    isPlaying={isThisTrack && isPlaying}
                    isPaused={isThisTrack && !isPlaying}
                    isLiked={isTrackSaved(item.id)}
                    onPlay={handlePlayTrackWrapper}
                    onPause={pauseTrack}
                    onResume={resumeTrack}
                    onClick={(id, name) =>
                      router.push(
                        `/Songs/${id}?name=${encodeURIComponent(name)}`
                      )
                    }
                    menu={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm rounded-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border-zinc-800">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-white hover:bg-brand/20">
                              <ListPlus className="mr-2 h-4 w-4" />
                              Add to playlist
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-zinc-900 border-zinc-800 max-h-[300px] overflow-y-auto">
                              {userPlaylists.map((pl) => (
                                <DropdownMenuItem
                                  key={pl.id}
                                  onClick={() => handleAddToPlaylist(item.uri, pl.id, pl.name)}
                                  className="text-white hover:bg-brand/20 flex items-center justify-between"
                                >
                                  <span className="truncate">{pl.name}</span>
                                  {playlistTracks[pl.id]?.has(item.id) && (
                                    <Heart className="w-3 h-3 fill-brand text-brand flex-shrink-0 ml-2" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <Pagination>
                <PaginationContent className="gap-2">
                  <PaginationPrevious
                    onClick={handlePagePrevious}
                    className={`${
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "hover:bg-zinc-800 cursor-pointer"
                    }`}
                  />

                  <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4">
                    <span className="text-xs sm:text-sm text-zinc-400 whitespace-nowrap">
                      {currentPage} / {totalPages}
                    </span>
                    <form
                      onSubmit={handleInputSubmit}
                      className="flex items-center gap-1 sm:gap-2"
                    >
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={inputPage}
                        onChange={handleInputChange}
                        placeholder={currentPage.toString()}
                        className="w-10 sm:w-16 px-1 sm:px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white text-center focus:outline-none focus:border-brand"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px] sm:text-xs"
                      >
                        Go
                      </Button>
                    </form>
                  </div>

                  <PaginationNext
                    onClick={handlePageNext}
                    className={`${
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "hover:bg-zinc-800 cursor-pointer"
                    }`}
                  />
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AlbumsIDPage;
