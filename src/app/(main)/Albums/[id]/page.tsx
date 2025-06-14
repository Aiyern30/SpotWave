"use client";

import type React from "react";

import Sidebar from "@/components/Sidebar";
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
import Header from "@/components/Header";
import Image from "next/image";
import { formatSongDuration } from "@/utils/function";
import { fetchAlbumDetails } from "@/utils/fetchAlbumDetails";
import type { Album } from "@/lib/types";

const itemsPerPage = 10;

const AlbumsIDPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const playPreview = (url: string | null, trackId: string) => {
    if (audio) {
      audio.pause();
      setPlayingTrack(null);
    }
    if (url) {
      const newAudio = new Audio(url);
      setAudio(newAudio);
      setPlayingTrack(trackId);
      newAudio.play();
      newAudio.onended = () => setPlayingTrack(null);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
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
      <div className="flex h-screen">
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

            {/* Album Header Skeleton */}
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
              <Skeleton className="w-80 h-80 rounded-xl" />
              <div className="flex-1 space-y-4 text-center lg:text-left">
                <Skeleton className="h-12 w-96 mx-auto lg:mx-0" />
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-28" />
                </div>
                <Skeleton className="h-16 w-full max-w-2xl mx-auto lg:mx-0" />
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
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/50"
                >
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="w-12 h-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="w-24 h-8 rounded-full" />
                  <Skeleton className="w-16 h-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-black ">
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

            {/* Enhanced Album Header */}
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
              <div className="relative group">
                <Image
                  src={album.images[0]?.url || "/default-artist.png"}
                  width={320}
                  height={320}
                  alt={album.name}
                  className="rounded-xl shadow-2xl object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              <div className="flex-1 space-y-4 text-center lg:text-left">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    <Disc3 className="w-3 h-3 mr-1" />
                    {album.album_type.toUpperCase()}
                  </Badge>
                  <h1 className="text-4xl lg:text-6xl font-bold mb-4">
                    {album.name}
                  </h1>
                </div>

                <div className="flex flex-wrap gap-4 text-zinc-400 justify-center lg:justify-start">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(album.release_date).getFullYear()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    <span>{album.total_tracks} tracks</span>
                  </div>
                </div>

                {album.artists && (
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                    {album.artists.map((artist: any, index: number) => (
                      <Button
                        key={artist.id}
                        variant="link"
                        className="text-white hover:text-green-400 p-0 h-auto font-medium text-lg"
                        onClick={() =>
                          handleArtistClick(artist.id, artist.name)
                        }
                      >
                        {artist.name}
                        {index < album.artists.length - 1 && ","}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Controls */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Tracks</h2>
              <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1">
                <Button
                  variant={displayUI === "Table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayUI("Table")}
                  className="h-8 px-3"
                >
                  <PiTable className="w-4 h-4" />
                </Button>
                <Button
                  variant={displayUI === "Grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayUI("Grid")}
                  className="h-8 px-3"
                >
                  <LuLayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {displayUI === "Table" ? (
              <div className="bg-zinc-900/50 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableCell className="w-12 text-center text-zinc-400">
                        #
                      </TableCell>
                      <TableCell className="text-zinc-400">Title</TableCell>
                      <TableCell className="text-center text-zinc-400 hidden md:table-cell">
                        Action
                      </TableCell>
                      <TableCell className="text-right text-zinc-400 hidden md:table-cell">
                        <Clock className="w-4 h-4 ml-auto" />
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item, index) => (
                      <TableRow
                        key={item.id}
                        className="border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() =>
                          router.push(
                            `/Songs/${item.id}?name=${encodeURIComponent(
                              item.name
                            )}`
                          )
                        }
                      >
                        <TableCell className="text-center">
                          {hoveredIndex === index ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 rounded-full hover:bg-green-500 hover:text-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                playPreview(item.preview_url, item.id);
                              }}
                            >
                              <Play className="w-3 h-3" fill="currentColor" />
                            </Button>
                          ) : (
                            <span className="text-zinc-400 text-sm">
                              {startIndex + index + 1}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.album?.images?.[0]?.url && (
                              <Image
                                src={
                                  item.album.images[0].url || "/placeholder.svg"
                                }
                                width={48}
                                height={48}
                                alt={item.name}
                                className="rounded-md"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="font-medium text-white truncate">
                                    {item.name}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{item.name}</p>
                                </TooltipContent>
                              </Tooltip>
                              <div className="flex items-center gap-1 text-sm text-zinc-400">
                                {item.artists.map(
                                  (artist: any, artistIndex: number) => (
                                    <span key={artist.id}>
                                      <Button
                                        variant="link"
                                        className="p-0 h-auto text-zinc-400 hover:text-white text-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleArtistClick(
                                            artist.id,
                                            artist.name
                                          );
                                        }}
                                      >
                                        {artist.name}
                                      </Button>
                                      {artistIndex < item.artists.length - 1 &&
                                        ", "}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center hidden md:table-cell">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all duration-200"
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

                        <TableCell className="text-right text-zinc-400 text-sm hidden md:table-cell">
                          {formatSongDuration(item.duration_ms)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedItems.map((item, index) => (
                  <Card
                    key={item.id}
                    className="group bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    onClick={() =>
                      router.push(
                        `/Songs/${item.id}?name=${encodeURIComponent(
                          item.name
                        )}`
                      )
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="relative">
                        {item.album?.images?.[0]?.url ? (
                          <Image
                            src={item.album.images[0].url || "/placeholder.svg"}
                            width={200}
                            height={200}
                            alt={item.name}
                            className="w-full aspect-square object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-zinc-800 rounded-lg flex items-center justify-center">
                            <Music className="w-12 h-12 text-zinc-600" />
                          </div>
                        )}

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-400 text-black rounded-full w-12 h-12 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              playPreview(item.preview_url, item.id);
                            }}
                          >
                            <Play className="w-5 h-5" fill="currentColor" />
                          </Button>
                        </div>

                        {/* Track Number Badge */}
                        <Badge className="absolute top-2 left-2 bg-black/70 text-white">
                          #{startIndex + index + 1}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CardTitle className="text-base font-semibold text-white truncate mb-2">
                            {item.name}
                          </CardTitle>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.name}</p>
                        </TooltipContent>
                      </Tooltip>

                      <div className="space-y-2">
                        <div className="text-sm text-zinc-400">
                          {item.artists.map(
                            (artist: any, artistIndex: number) => (
                              <span key={artist.id}>
                                <Button
                                  variant="link"
                                  className="p-0 h-auto text-zinc-400 hover:text-white text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArtistClick(artist.id, artist.name);
                                  }}
                                >
                                  {artist.name}
                                </Button>
                                {artistIndex < item.artists.length - 1 && ", "}
                              </span>
                            )
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span>{formatSongDuration(item.duration_ms)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs hover:text-green-400"
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
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
      </div>
    </TooltipProvider>
  );
};

export default AlbumsIDPage;
