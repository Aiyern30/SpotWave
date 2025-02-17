"use client";

import Sidebar from "@/components/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Pagination,
  PaginationContent,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui";
import Header from "@/components/Header";
import Image from "next/image";
import { GiDuration } from "react-icons/gi";
import { formatSongDuration } from "@/utils/function";
import { fetchAlbumDetails } from "@/utils/fetchAlbumDetails";
import { Album } from "@/lib/types";

const itemsPerPage = 10;

const ArtistProfilePage = () => {
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
    const page = parseInt(inputPage, 10);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      // Optionally show an error message for invalid page numbers
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

  const playPreview = (url: string | null) => {
    if (audio) {
      audio.pause();
    }
    if (url) {
      const newAudio = new Audio(url);
      setAudio(newAudio);
      newAudio.play();
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

  return (
    <div className="flex h-screen ">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 text-white ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-4 ">
          <Header />

          {album ? (
            <div className="flex flex-col items-center space-y-4">
              <h1 className="text-4xl font-bold">{album.name}</h1>

              <Avatar>
                <AvatarImage
                  src={album.images[0]?.url || "/default-artist.png"}
                  className="w-48 h-48 rounded-full object-cover"
                />
                <AvatarFallback className="text-black">
                  {album.name}
                </AvatarFallback>
              </Avatar>

              <p className="text-lg">Release Date: {album.release_date}</p>
              <p className="text-lg">Total Tracks: {album.total_tracks}</p>
              <p className="text-lg">Type: {album.album_type}</p>

              <h2 className="text-3xl font-bold mt-8">Tracks</h2>
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

              {displayUI === "Table" ? (
                <div className="overflow-x-auto w-full container">
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
                        <TableHead className="hidden md:table-cell text-center">
                          Action
                        </TableHead>

                        <TableHead className="hidden md:table-cell text-right">
                          <GiDuration className="float-right" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item, index) => (
                        <TableRow
                          key={index}
                          onMouseEnter={() => setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          onClick={() => {
                            router.push(`/Songs/${item.id}?name=${item.name}`);
                          }}
                          className="relative group"
                        >
                          <TableCell className="relative text-center">
                            {hoveredIndex === index ? (
                              <div
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  playPreview(item.preview_url);
                                }}
                                className="flex items-center justify-center border rounded-full w-8 h-8 bg-play mx-auto"
                              >
                                <Image
                                  src={"/play-button.png"}
                                  width={16}
                                  height={16}
                                  alt="Play"
                                  className="hover:opacity-"
                                />
                              </div>
                            ) : (
                              <div>{startIndex + index + 1}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {item?.album?.images?.[0]?.url && (
                                <Image
                                  src={item.album.images[0].url}
                                  width={50}
                                  height={50}
                                  alt={item.name || "Track cover image"}
                                  className="rounded"
                                />
                              )}
                              <div>
                                <div className="font-medium">{item?.name}</div>
                                <div className="text-sm text-secondary-background">
                                  {item?.artists.map((artist: any) => (
                                    <span
                                      key={artist.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArtistClick(
                                          artist.id,
                                          artist.name
                                        );
                                      }}
                                      onMouseEnter={() =>
                                        setHoveredArtist(artist.id)
                                      }
                                      onMouseLeave={() =>
                                        setHoveredArtist(null)
                                      }
                                      className={`cursor-pointer ${
                                        hoveredArtist === artist.id
                                          ? "underline"
                                          : ""
                                      } ${artist.id ? "hover:underline" : ""}`}
                                    >
                                      {artist.name}
                                      {item.artists.length > 1 &&
                                      artist !==
                                        item.artists[item.artists.length - 1]
                                        ? ", "
                                        : ""}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-center">
                            <a
                              href={`https://open.spotify.com/track/${item.uri
                                .split(":")
                                .pop()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                listen in Spotify
                              </Button>
                            </a>
                          </TableCell>

                          <TableCell className="hidden md:table-cell text-right">
                            {formatSongDuration(item.duration_ms)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-2 mx-auto sm:flex sm:flex-wrap gap-2 sm:gap-8 sm:gap-8 container">
                  {paginatedItems.map((item, index) => (
                    <Card
                      key={index}
                      className="group w-40 h-40 text-center bg-white text-black flex flex-col relative hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/Songs/${item.id}?name=${item.name}`);
                      }}
                    >
                      <span className="font-bold">{item.name}</span>
                      {item.artists.map((artist: any) => (
                        <div
                          key={artist.id}
                          onClick={() =>
                            router.push(
                              `/Artists/${artist.id}?name=${artist.name}`
                            )
                          }
                          className="cursor-pointer hover:underline"
                        >
                          {artist.name}
                        </div>
                      ))}
                      <a
                        href={`https://open.spotify.com/track/${item.uri
                          .split(":")
                          .pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="absolute bottom-2 left-2"
                        >
                          listen in Spotify
                        </Button>
                      </a>
                      <div
                        onClick={() => playPreview(item.preview_url)}
                        className="absolute top-2 right-2 flex items-center justify-center border rounded-full w-8 h-8 bg-play opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <Image
                          src="/play-button.png"
                          width={16}
                          height={16}
                          alt="Play"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
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
            </div>
          ) : (
            <div className="p-4 space-y-8 flex flex-col items-center">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="w-48 h-48 rounded-full" />
                <Skeleton className="w-64 h-8 rounded" />
                <Skeleton className="w-32 h-6 rounded" />
                <Skeleton className="w-32 h-6 rounded" />
              </div>

              <div className="flex justify-end space-x-3 items-center">
                <Skeleton className="w-10 h-10 rounded" />
                <Skeleton className="w-10 h-10 rounded" />
              </div>

              <div className="space-y-4 ">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-48 h-6 rounded" />
                    <Skeleton className="w-32 h-6 rounded hidden md:block" />
                    <Skeleton className="w-16 h-6 rounded hidden md:block" />
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-4">
                <Skeleton className="w-20 h-8 rounded" />
                <Skeleton className="w-32 h-8 rounded" />
                <Skeleton className="w-20 h-8 rounded" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistProfilePage;
