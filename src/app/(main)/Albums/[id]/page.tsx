"use client";

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
  Pause,
} from "lucide-react";
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
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

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
        }
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  if (!album) {
    return (
      <div className="space-y-4 sm:space-y-8">
        {/* Album Header Skeleton */}
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
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
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
          <div className="relative group flex-shrink-0">
            <Image
              src={album.images[0]?.url || "/default-artist.png"}
              width={192}
              height={192}
              alt={album.name}
              className="w-48 h-48 rounded-lg shadow-2xl object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <Badge variant="secondary" className="mb-2 capitalize">
                <Disc3 className="w-3 h-3 mr-1" />
                {album.album_type}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-white">
                {album.name}
              </h1>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-300">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(album.release_date).getFullYear()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Music className="h-4 w-4" />
                <span>{album.total_tracks} tracks</span>
              </div>
            </div>

            {album.artists && (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {album.artists.map((artist: any, index: number) => (
                  <span key={artist.id}>
                    <Button
                      variant="link"
                      className="text-white hover:text-green-400 p-0 h-auto font-medium text-lg transition-colors"
                      onClick={() => handleArtistClick(artist.id, artist.name)}
                    >
                      {artist.name}
                    </Button>
                    {index < album.artists.length - 1 && (
                      <span className="text-zinc-400">,</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

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

          {displayUI === "Table" ? (
            <div className="bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-zinc-400">
                      #
                    </TableHead>
                    <TableHead className="text-zinc-400">Title</TableHead>
                    <TableHead className="hidden lg:table-cell text-center text-zinc-400">
                      Action
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-right text-zinc-400">
                      <Clock className="w-4 h-4 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className="border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                      onMouseEnter={() => setHoveredTrackId(item.id)}
                      onMouseLeave={() => setHoveredTrackId(null)}
                      onClick={() =>
                        router.push(
                          `/Songs/${item.id}?name=${encodeURIComponent(
                            item.name
                          )}`
                        )
                      }
                    >
                      <TableCell className="text-center">
                        {hoveredTrackId === item.id ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 p-0 rounded-full hover:bg-green-500 hover:text-black"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPauseTrack(item);
                            }}
                          >
                            {isTrackPlaying(item.id) ? (
                              <Pause className="w-3 h-3" fill="currentColor" />
                            ) : (
                              <Play className="w-3 h-3" fill="currentColor" />
                            )}
                          </Button>
                        ) : (
                          <span
                            className={`text-sm ${
                              isTrackPlaying(item.id)
                                ? "text-green-400"
                                : "text-zinc-400"
                            }`}
                          >
                            {startIndex + index + 1}
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {item.album?.images?.[0]?.url && (
                            <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={
                                  item.album.images[0].url || "/placeholder.svg"
                                }
                                width={48}
                                height={48}
                                alt={item.name}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div
                              className={`font-medium truncate transition-colors ${
                                isTrackPlaying(item.id)
                                  ? "text-green-400"
                                  : "text-white group-hover:text-green-400"
                              }`}
                            >
                              {item.name}
                            </div>
                            <div className="text-zinc-400 text-sm truncate">
                              {item.artists.map(
                                (artist: any, artistIndex: number) => (
                                  <span key={artist.id}>
                                    <span
                                      className="hover:underline hover:text-white transition-colors cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArtistClick(
                                          artist.id,
                                          artist.name
                                        );
                                      }}
                                    >
                                      {artist.name}
                                    </span>
                                    {artistIndex < item.artists.length - 1 &&
                                      ", "}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-700 text-green-500 hover:bg-green-500/10 hover:border-green-500 hover:text-green-400 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://open.spotify.com/track/${item.uri
                                .split(":")
                                .pop()}`,
                              "_blank"
                            );
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Spotify
                        </Button>
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-right text-zinc-400 text-sm">
                        {formatSongDuration(item.duration_ms)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6">
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

                  <div className="flex items-center gap-4 px-4">
                    <span className="text-sm text-zinc-400">
                      Page {currentPage} of {totalPages}
                    </span>
                    <form
                      onSubmit={handleInputSubmit}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={inputPage}
                        onChange={handleInputChange}
                        placeholder={currentPage.toString()}
                        className="w-16 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white text-center focus:outline-none focus:border-green-500"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="text-xs"
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
