"use client";
import { LuLayoutGrid } from "react-icons/lu";
import { PiTable } from "react-icons/pi";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Image from "next/image";
import {
  FaPauseCircle,
  FaPlayCircle,
  FaRegCopy,
  FaRegShareSquare,
} from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  PaginationContent,
  PaginationPrevious,
  PaginationNext,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { GiDuration } from "react-icons/gi";
import { PlusCircle, UserPlus } from "lucide-react";
import { IoMdMore } from "react-icons/io";
import {
  DisplayUIProps,
  PlaylistProps,
  Track,
  User,
  UserProfile,
} from "@/lib/types";
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

  const router = useRouter();

  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const [currentPage, setCurrentPage] = useState(1);
  const [inputPage, setInputPage] = useState<string>("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lyrics, setLyrics] = useState<String | null>(null);

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
    const page = parseInt(inputPage, 10);
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
    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${artist}/${title}`
      );
      const data = await response.json();

      if (data.lyrics && data.lyrics.trim()) {
        setLyrics(data.lyrics);
      } else {
        setLyrics("Lyrics not found");
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyrics("Lyrics not found");
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

  return (
    <div className="flex h-screen">
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
                      className={`${
                        displayUI === "Table" ? "text-white" : "text-[#707070]"
                      }`}
                    />
                    <LuLayoutGrid
                      size={30}
                      onClick={() => setDisplayUI("Grid")}
                      className={`${
                        displayUI === "Grid" ? "text-white" : "text-[#707070]"
                      }`}
                    />
                  </div>
                  {displayUI === "Table" && (
                    <div className="overflow-x-auto container">
                      {paginatedItems.length === 0 ? (
                        <NoTracks onExplore={() => router.push("/Explore")} />
                      ) : (
                        <Table>
                          <TableCaption>
                            A list of tracks in the playlist.
                          </TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px] text-center">
                                #
                              </TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead className="hidden md:table-cell">
                                Album
                              </TableHead>
                              <TableHead className="hidden md:table-cell ">
                                Lyrics
                              </TableHead>
                              <TableHead className="hidden md:table-cell text-right">
                                <GiDuration className="float-right" />
                              </TableHead>
                              <TableHead className="hidden md:table-cell text-center w-12">
                                Action
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedItems.map((item, index) => (
                              <TableRow key={index} className="relative group">
                                <TableCell className="relative text-center">
                                  {index + 1}
                                </TableCell>
                                <TableCell>{item.track.name}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {item.track.album.name}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Sheet>
                                    <SheetTrigger>
                                      <Button>View</Button>
                                    </SheetTrigger>
                                    <SheetContent>
                                      <SheetHeader>
                                        <SheetTitle>Lyrics</SheetTitle>
                                        <SheetDescription>
                                          {lyrics}
                                        </SheetDescription>
                                      </SheetHeader>
                                    </SheetContent>
                                  </Sheet>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right">
                                  {formatSongDuration(item.track?.duration_ms)}
                                </TableCell>
                                <TableCell>
                                  <Button>Action</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}

                  {displayUI === "Grid" && (
                    <>
                      {paginatedItems.length === 0 ? (
                        <NoTracks onExplore={() => router.push("/Explore")} />
                      ) : (
                        <div className="grid grid-cols-2 mx-auto sm:flex sm:flex-wrap gap-2 sm:gap-8 sm:gap-8 container">
                          {paginatedItems.map((data, index) => (
                            <Card
                              key={index}
                              className="group w-36 cursor-pointer text-white relative"
                            >
                              <CardHeader>
                                <Avatar className="w-32 h-32 sm:w-36 sm:h-36 relative p-1">
                                  <AvatarImage
                                    src={data.track.album.images[0].url}
                                    className="rounded-xl"
                                  />
                                  <AvatarFallback className="text-black">
                                    {data.track.name}
                                  </AvatarFallback>

                                  <div
                                    onClick={() =>
                                      handlePlay(data.track.preview_url)
                                    }
                                    className="absolute bottom-2 right-2 flex items-center justify-center border rounded-full w-8 h-8 bg-play opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  >
                                    {currentlyPlayingUrl ===
                                    data.track.preview_url ? (
                                      <FaPauseCircle size={32} color="white" />
                                    ) : (
                                      <FaPlayCircle size={32} color="white" />
                                    )}
                                  </div>
                                </Avatar>
                              </CardHeader>
                              <CardTitle>{data.track.name}</CardTitle>
                              <CardContent className="text-sm flex space-x-3">
                                {data.track.album.artists.map((artist) => (
                                  <div
                                    key={artist.id}
                                    onClick={() =>
                                      router.push(`/Artists/${artist.id}`)
                                    }
                                    className="cursor-pointer hover:underline"
                                  >
                                    {artist.name}
                                  </div>
                                ))}
                              </CardContent>
                              <CardFooter className="text-sm space-x-3">
                                <div
                                  className="hover:underline"
                                  onClick={() =>
                                    router.push(
                                      `/Albums/${data.track.album.id}`
                                    )
                                  }
                                >
                                  {data.track.album.name}
                                </div>
                              </CardFooter>
                              <CardFooter className="text-sm flex space-x-3">
                                {formatSongDuration(data.track?.duration_ms)}
                              </CardFooter>
                            </Card>
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
                              className="w-16 p-1 text-black"
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
