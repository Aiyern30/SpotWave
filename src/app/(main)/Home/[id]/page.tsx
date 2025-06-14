"use client";
import { LuLayoutGrid } from "react-icons/lu";
import { PiTable } from "react-icons/pi";
import type React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Image from "next/image";
import { FaPauseCircle } from "react-icons/fa";

import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  PaginationContent,
  PaginationPrevious,
  PaginationNext,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { GiDuration } from "react-icons/gi";
import {
  Play,
  MoreHorizontal,
  Music,
  FileText,
  ExternalLink,
  Heart,
  Plus,
} from "lucide-react";
import type { DisplayUIProps, PlaylistProps, UserProfile } from "@/lib/types";
import UserHeader from "@/components/Home/UserHeader";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { AddSongsToTrack } from "@/utils/Tracks/AddSongsToTrack";
import { useToast } from "@/hooks/use-toast";
import { removePlaylist } from "@/utils/Tracks/removeSongsFromTrack";
import { formatSongDuration } from "@/utils/function";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { fetchPlaylistDetails } from "@/utils/fetchPlaylist";
import { togglePreview } from "@/utils/audioUtils";
import NoTracks from "@/components/NoTracks";

const itemsPerPage = 10;

const PlaylistPage = () => {
  const { toast } = useToast();

  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [playlist, setPlaylist] = useState<PlaylistProps | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string>("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const router = useRouter();

  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const [currentPage, setCurrentPage] = useState(1);
  const [inputPage, setInputPage] = useState<string>("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState<boolean>(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  const handleArtistClick = (artistId: string, name: string) => {
    router.push(`/Artists/${artistId}?name=${encodeURIComponent(name)}`);
  };
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedItems = useMemo(() => {
    return playlist?.tracks?.items?.slice(startIndex, endIndex) || [];
  }, [playlist?.tracks?.items, startIndex, endIndex]);

  const totalPages = Math.ceil(
    (playlist?.tracks?.items?.length || 0) / itemsPerPage
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
    } else {
    }
  };

  const [currentlyPlayingUrl, setCurrentlyPlayingUrl] = useState<string | null>(
    null
  );

  console.log("currentlyPlayingUrl", currentlyPlayingUrl);

  const handlePlay = (url: string) => {
    togglePreview(url, setCurrentlyPlayingUrl);
  };

  const handleImageError = (trackId: string) => {
    setImageError((prev) => ({
      ...prev,
      [trackId]: true,
    }));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const [playlists, setPlaylists] = useState<PlaylistProps[]>([]);

  const [myID, setMyID] = useState<string>("");

  const fetchMyID = useCallback(async () => {
    const profileDetails = await fetchUserProfile(token);
    const userId = profileDetails?.id;
    if (userId) {
      setMyID(userId);
    }
  }, [token]);

  const handleAddSongsToTrack = async (
    id: string,
    selectedLibraryID: string
  ) => {
    const { success, message } = await AddSongsToTrack(
      id,
      selectedLibraryID,
      token
    );
    if (success) {
      toast({
        title: "Success!",
        description: "Track added successfully.",
      });
    } else {
      toast({
        title: "Error",
        description: message,
      });
    }
  };

  const handleRemoveSongsFromTrack = async (
    playlistID: string,
    trackID: string
  ) => {
    const { success, message } = await removePlaylist(
      playlistID,
      trackID,
      token
    );
    if (success) {
      handleFetchPlaylistDetails(id);

      toast({
        title: "Success!",
        description: message,
      });
    } else {
      toast({
        title: "Error",
        description: message,
      });
    }
  };
  useEffect(() => {
    const handleFetchSpotifyPlaylists = async () => {
      const profileDetails = await fetchSpotifyPlaylists(token);
      if (profileDetails) {
        const myPlaylists = profileDetails.filter(
          (playlist: { owner: { id: string } }) => playlist?.owner.id === myID
        );

        setPlaylists(myPlaylists);
      }
    };
    handleFetchSpotifyPlaylists();
  }, [token, myID]);

  const fetchLyrics = async (artist: string, title: string) => {
    setLoadingLyrics(true);
    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(
          artist
        )}/${encodeURIComponent(title)}`
      );
      const data = await response.json();

      if (data.lyrics && data.lyrics.trim()) {
        setLyrics(data.lyrics);
      } else {
        setLyrics("Lyrics not found for this track.");
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyrics("Unable to fetch lyrics at this time.");
    } finally {
      setLoadingLyrics(false);
    }
  };

  const handleFetchPlaylistDetails = useCallback(
    async (playlistID: string) => {
      const data = await fetchPlaylistDetails(playlistID, token);

      if (data) {
        if (data.tracks && Array.isArray(data.tracks.items)) {
          const validTracks = data.tracks.items.filter(
            (track: { track: { name: any; duration_ms: any } }) =>
              track.track && track.track.name && track.track.duration_ms
          );

          setPlaylist({
            ...data,
            tracks: {
              ...data.tracks,
              items: validTracks,
            },
          });

          if (data.owner?.id) {
            fetchMyID();
          }
        } else {
          console.warn("Invalid playlist data:", data);
        }
      }
    },
    [token, fetchMyID, setPlaylist]
  );

  useEffect(() => {
    if (token && id) {
      handleFetchPlaylistDetails(id);
    }
  }, [token, id, handleFetchPlaylistDetails]);

  const TrackCard = ({ track, index }: { track: any; index: number }) => (
    <TooltipProvider>
      <Card className="relative w-[200px] h-[320px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group">
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-4 pt-4 pb-2">
            <div className="w-[170px] h-[170px] rounded-lg shadow-lg overflow-hidden">
              {imageError[track.track.id] ||
              !track.track.album.images[0]?.url ? (
                <Image
                  src="/default-artist.png"
                  width={170}
                  height={170}
                  className="object-cover rounded-lg"
                  alt={track.track.name}
                  priority
                />
              ) : (
                <Image
                  src={
                    track.track.album.images[0]?.url || "/default-artist.png"
                  }
                  width={170}
                  height={170}
                  className="object-cover rounded-lg"
                  alt={track.track.name}
                  onError={() => handleImageError(track.track.id)}
                  priority
                />
              )}
            </div>

            {/* Play button overlay */}
            <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(track.track.preview_url);
                }}
              >
                {currentlyPlayingUrl === track.track.preview_url ? (
                  <FaPauseCircle className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                {track.track.name}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{track.track.name}</p>
            </TooltipContent>
          </Tooltip>

          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-zinc-400 text-sm line-clamp-1 hover:text-zinc-300 transition-colors cursor-pointer">
                  {track.track.artists.map((artist: any, idx: number) => (
                    <span
                      key={artist.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArtistClick(artist.id, artist.name);
                      }}
                      className="hover:underline"
                    >
                      {artist.name}
                      {idx < track.track.artists.length - 1 && ", "}
                    </span>
                  ))}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>
                  {track.track.artists
                    .map((artist: any) => artist.name)
                    .join(", ")}
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="text-zinc-500 text-xs line-clamp-1 hover:text-zinc-400 transition-colors cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/Albums/${track.track.album.id}`);
                  }}
                >
                  {track.track.album.name}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{track.track.album.name}</p>
              </TooltipContent>
            </Tooltip>

            <div className="text-zinc-500 text-xs">
              {formatSongDuration(track.track?.duration_ms)}
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

  return (
    <div className="flex min-h-screen bg-black">
      {token && (
        <>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen((prev) => !prev)}
          />
          <div
            className={`flex-1 text-white transition-all ml-16 duration-300 ${
              sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
            }`}
          >
            <div className="p-4 space-y-4">
              <Header />
              {playlist ? (
                <>
                  <UserHeader
                    playlist={playlist}
                    user={user as UserProfile}
                    id={myID}
                    refetch={(id) => handleFetchPlaylistDetails(id)}
                  />

                  <div className="flex justify-end space-x-3 items-center">
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
                  {displayUI === "Table" && (
                    <div className="overflow-x-auto container">
                      {paginatedItems.length === 0 ? (
                        <NoTracks onExplore={() => router.push("/Explore")} />
                      ) : (
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
                                <TableHead className="hidden lg:table-cell text-zinc-400 font-medium">
                                  Artist
                                </TableHead>
                                <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                                  Lyrics
                                </TableHead>
                                <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium">
                                  <div className="flex items-center justify-end">
                                    <GiDuration className="mr-2" />
                                    Duration
                                  </div>
                                </TableHead>
                                <TableHead className="w-[100px] text-center text-zinc-400 font-medium">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedItems.map((item, index) => (
                                <TableRow
                                  key={`${item.track.id}-${index}`}
                                  className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors group"
                                  onMouseEnter={() => setHoveredIndex(index)}
                                  onMouseLeave={() => setHoveredIndex(null)}
                                >
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center">
                                      {hoveredIndex === index ? (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-500 hover:text-green-400"
                                          onClick={() =>
                                            handlePlay(item.track.preview_url)
                                          }
                                        >
                                          {currentlyPlayingUrl ===
                                          item.track.preview_url ? (
                                            <FaPauseCircle className="h-4 w-4" />
                                          ) : (
                                            <Play
                                              className="h-4 w-4"
                                              fill="currentColor"
                                            />
                                          )}
                                        </Button>
                                      ) : (
                                        <span className="text-zinc-400 text-sm">
                                          {startIndex + index + 1}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex items-center space-x-3">
                                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                        <Image
                                          src={
                                            item.track.album.images[0]?.url ||
                                            "/default-artist.png"
                                          }
                                          width={48}
                                          height={48}
                                          className="object-cover"
                                          alt={item.track.name}
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-white font-medium truncate hover:text-green-400 transition-colors cursor-pointer">
                                          {item.track.name}
                                        </div>
                                        <div className="text-zinc-400 text-sm truncate">
                                          {item.track.artists.map(
                                            (artist: any, idx: number) => (
                                              <span
                                                key={artist.id}
                                                onClick={() =>
                                                  handleArtistClick(
                                                    artist.id,
                                                    artist.name
                                                  )
                                                }
                                                className="hover:underline hover:text-white cursor-pointer"
                                              >
                                                {artist.name}
                                                {idx <
                                                  item.track.artists.length -
                                                    1 && ", "}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="hidden md:table-cell">
                                    <div
                                      className="text-zinc-400 hover:text-white hover:underline cursor-pointer truncate"
                                      onClick={() =>
                                        router.push(
                                          `/Albums/${item.track.album.id}`
                                        )
                                      }
                                    >
                                      {item.track.album.name}
                                    </div>
                                  </TableCell>

                                  <TableCell className="hidden lg:table-cell">
                                    <div className="text-zinc-400 truncate">
                                      {item.track.artists.map(
                                        (artist: any, idx: number) => (
                                          <span
                                            key={artist.id}
                                            onClick={() =>
                                              handleArtistClick(
                                                artist.id,
                                                artist.name
                                              )
                                            }
                                            className="hover:underline hover:text-white cursor-pointer"
                                          >
                                            {artist.name}
                                            {idx <
                                              item.track.artists.length - 1 &&
                                              ", "}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="hidden md:table-cell">
                                    <Sheet>
                                      <SheetTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all duration-200"
                                          onClick={() => {
                                            setSelectedTrack(item.track);
                                            fetchLyrics(
                                              item.track.artists[0].name,
                                              item.track.name
                                            );
                                          }}
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
                                                  selectedTrack?.album.images[0]
                                                    ?.url ||
                                                  "/default-artist.png"
                                                }
                                                width={64}
                                                height={64}
                                                className="object-cover"
                                                alt={
                                                  selectedTrack?.name || "Track"
                                                }
                                              />
                                            </div>
                                            <div>
                                              <SheetTitle className="text-white text-lg font-semibold">
                                                {selectedTrack?.name}
                                              </SheetTitle>
                                              <p className="text-zinc-400 text-sm">
                                                by{" "}
                                                {selectedTrack?.artists
                                                  .map(
                                                    (artist: any) => artist.name
                                                  )
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
                                                {lyrics ||
                                                  "No lyrics available for this track."}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      </SheetContent>
                                    </Sheet>
                                  </TableCell>

                                  <TableCell className="hidden md:table-cell text-right">
                                    <span className="text-zinc-400 text-sm">
                                      {formatSongDuration(
                                        item.track?.duration_ms
                                      )}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        className="bg-zinc-800 border-zinc-700"
                                        align="end"
                                      >
                                        <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-700">
                                          <Heart className="h-4 w-4 mr-2" />
                                          Add to Liked Songs
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-700">
                                          <Plus className="h-4 w-4 mr-2" />
                                          Add to Playlist
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-700">
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Open in Spotify
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-400 hover:text-red-300 hover:bg-zinc-700"
                                          onClick={() =>
                                            handleRemoveSongsFromTrack(
                                              id,
                                              item.track.id
                                            )
                                          }
                                        >
                                          <Music className="h-4 w-4 mr-2" />
                                          Remove from Playlist
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}

                  {displayUI === "Grid" && (
                    <>
                      {paginatedItems.length === 0 ? (
                        <NoTracks onExplore={() => router.push("/Explore")} />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
                          {paginatedItems.map((track, index) => (
                            <TrackCard
                              key={`${track.track.id}-${index}`}
                              track={track}
                              index={index}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationPrevious
                          className={`p-2 ${
                            currentPage === 1
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          onClick={handlePagePrevious}
                        >
                          Previous
                        </PaginationPrevious>

                        <div className="flex items-center mx-4">
                          <span className="text-white">
                            Page {currentPage} of {totalPages}
                          </span>
                          <form
                            onSubmit={handleInputSubmit}
                            className="flex items-center ml-4"
                          >
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={inputPage}
                              onChange={handleInputChange}
                              className="w-16 p-1 text-black rounded"
                            />
                          </form>
                        </div>

                        <PaginationNext
                          className={`p-2 ${
                            currentPage === totalPages
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          onClick={handlePageNext}
                        >
                          Next
                        </PaginationNext>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </>
              ) : (
                <div className="flex flex-col space-y-3">
                  <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-[125px] w-full rounded-xl" />
                  <Skeleton className="h-[125px] w-full rounded-xl" />
                  <Skeleton className="h-[125px] w-full rounded-xl" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlaylistPage;
