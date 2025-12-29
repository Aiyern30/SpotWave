"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHeader,
  TableHead,
  TableRow,
  Button,
  Skeleton,
} from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { useRouter } from "next/navigation";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { Play, MoreHorizontal, Pause, ExternalLink, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import type {
  ArtistsResponseLASTFM,
  DisplayUIProps,
  GlobalArtistPropsLASTFM,
} from "@/lib/types";
import { NumberTicker } from "@/components/magicui/NumberTicker";
import { usePlayer } from "@/contexts/PlayerContext";
import { fetchArtistTopTracks } from "@/utils/Tracks/fetchArtistTopTracks";

const Page = () => {
  const [artists, setArtists] = useState<GlobalArtistPropsLASTFM[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [numArtists, setNumArtists] = useState<number>(10);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const router = useRouter();
  const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();
  const [hoveredArtistId, setHoveredArtistId] = useState<string | null>(null);
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);

  const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;

  const fetchSpotifyImages = useCallback(
    async (artists: GlobalArtistPropsLASTFM[]) => {
      const updatedArtists = await Promise.all(
        artists.map(async (artist) => {
          const spotifyData = await searchArtistOnSpotify(artist.name);
          if (spotifyData) {
            return {
              ...artist,
              id: spotifyData.id,
              image: spotifyData.imageUrl
                ? [{ "#text": spotifyData.imageUrl, size: "large" }]
                : artist.image,
            };
          }
          return artist;
        })
      );
      return updatedArtists;
    },
    []
  );

  const fetchTopArtists = useCallback(
    async (apiKey: string, limit: number) => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&limit=${limit}&api_key=${apiKey}&format=json`
        );
        const data: ArtistsResponseLASTFM = await response.json();

        if (response.ok) {
          const artistsWithImages = await fetchSpotifyImages(
            data.artists.artist
          );
          setArtists(artistsWithImages.slice(0, limit));
        } else {
          console.error("Failed to fetch top artists from Last.fm:", data);
        }
      } catch (error) {
        console.error("Error fetching top artists:", error);
      }
      setLoading(false);
    },
    [fetchSpotifyImages]
  );

  const searchArtistOnSpotify = async (
    artistName: string
  ): Promise<{ id: string; imageUrl: string } | null> => {
    const token = localStorage.getItem("Token");

    if (!token) {
      console.error("Spotify API token not found");
      return null;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          artistName
        )}&type=artist`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.artists && data.artists.items.length > 0) {
        const artist = data.artists.items[0];
        return {
          id: artist.id,
          imageUrl: artist.images[0]?.url || null,
        };
      }
    } catch (error) {
      console.error(
        `Error fetching artist data from Spotify for ${artistName}:`,
        error
      );
    }
    return null;
  };

  useEffect(() => {
    if (LASTFM_API_KEY === undefined) {
      return;
    }
    fetchTopArtists(LASTFM_API_KEY, numArtists);
  }, [LASTFM_API_KEY, numArtists, fetchTopArtists]);

  const memoizedArtists = useMemo(() => artists, [artists]);

  const handleClick = (id: string, name: string) => {
    router.push(`/Artists/${id}?name=${encodeURIComponent(name)}`);
  };

  const handleSelectChange = (value: string) => {
    setNumArtists(Number.parseInt(value));
  };

  // Update current artist ID when track changes
  useEffect(() => {
    if (currentTrack?.artists?.[0]?.id) {
      setCurrentArtistId(currentTrack.artists[0].id);
    }
  }, [currentTrack]);

  const handlePlayArtist = useCallback(
    async (artistId?: string) => {
      if (!artistId) return;

      try {
        console.log("Fetching top tracks for artist:", artistId);

        // Fetch the artist's top tracks
        const topTracks = await fetchArtistTopTracks(artistId);

        if (topTracks && topTracks.length > 0) {
          // Play the first top track
          const firstTrack = topTracks[0];

          playTrack({
            id: firstTrack.id,
            name: firstTrack.name,
            artists: firstTrack.artists.map((artist: any) => ({
              name: artist.name,
              id: artist.id,
            })),
            album: {
              name: firstTrack.album.name,
              images: firstTrack.album.images,
              id: firstTrack.album.id,
              artists: firstTrack.album.artists || firstTrack.artists,
              release_date: firstTrack.album.release_date || "",
              total_tracks: firstTrack.album.total_tracks || 0,
            },
            duration_ms: firstTrack.duration_ms,
            explicit: firstTrack.explicit || false,
            external_urls: {
              spotify: `https://open.spotify.com/track/${firstTrack.id}`,
            },
            popularity: firstTrack.popularity || 0,
            preview_url: firstTrack.preview_url || null,
            track_number: firstTrack.track_number || 0,
            disc_number: firstTrack.disc_number || 1,
            uri: firstTrack.uri,
          });

          setCurrentArtistId(artistId);
          console.log("Playing artist's top track:", firstTrack.name);
        } else {
          console.error("No top tracks found for this artist");
        }
      } catch (error) {
        console.error("Error playing artist:", error);
      }
    },
    [playTrack]
  );

  // Add loading skeleton component
  const TableSkeleton = () => (
    <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
            <TableHead className="w-[60px] text-center text-zinc-400 font-medium">
              #
            </TableHead>
            <TableHead className="text-zinc-400 font-medium">Artist</TableHead>
            <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium">
              Playcount
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array(10)
            .fill(0)
            .map((_, index) => (
              <TableRow
                key={index}
                className="border-zinc-800/30 hover:bg-zinc-800/20"
              >
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-6 mx-auto bg-zinc-800" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-12 h-12 rounded-full bg-zinc-800" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32 bg-zinc-800" />
                      <Skeleton className="h-3 w-20 bg-zinc-800" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-right">
                  <Skeleton className="h-4 w-24 ml-auto bg-zinc-800" />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );

  const GridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
      {Array(10)
        .fill(0)
        .map((_, index) => (
          <div
            key={index}
            className="space-y-3 w-full max-w-[140px] sm:max-w-[200px]"
          >
            <Skeleton className="w-full aspect-square rounded-lg bg-zinc-800" />
            <Skeleton className="h-4 w-3/4 bg-zinc-800" />
            <Skeleton className="h-3 w-2/3 bg-zinc-800" />
          </div>
        ))}
    </div>
  );

  const handlePlayPauseArtist = useCallback(
    async (artistId: string) => {
      // Check if this artist's music is currently playing
      if (currentArtistId === artistId) {
        // Same artist - toggle play/pause
        if (isPlaying) {
          pauseTrack();
        } else {
          resumeTrack();
        }
      } else {
        // Different artist - play their top track
        await handlePlayArtist(artistId);
      }
    },
    [currentArtistId, isPlaying, pauseTrack, resumeTrack, handlePlayArtist]
  );

  // Helper function to check if artist is currently playing
  const isArtistPlaying = (artistId: string) => {
    return currentArtistId === artistId && isPlaying;
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Header Section */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Select onValueChange={handleSelectChange} defaultValue="10">
              <SelectTrigger className="w-full sm:w-48 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors">
                <SelectValue placeholder="Select number of artists" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="30">Top 30</SelectItem>
                <SelectItem value="40">Top 40</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Top Artists
            </h1>
          </div>

          {/* Enhanced View Selector */}
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

        {/* Loading State */}
        {loading ? (
          displayUI === "Table" ? (
            <TableSkeleton />
          ) : (
            <GridSkeleton />
          )
        ) : (
          <>
            {displayUI === "Table" && (
              <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
                <div className="bg-zinc-900/30">
                  <Table>
                    <TableCaption className="text-zinc-400 pb-4">
                      A list of top artists from Last.fm
                    </TableCaption>
                    <TableHeader>
                      <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                        <TableHead className="w-[50px] sm:w-[60px] text-center text-zinc-400 font-medium text-xs sm:text-sm">
                          #
                        </TableHead>
                        <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm">
                          Artist
                        </TableHead>
                        <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium text-xs sm:text-sm">
                          Playcount
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memoizedArtists.map((artist, index) => {
                        const imageUrl = artist.image[0]["#text"];
                        const isThisArtist = currentArtistId === artist.id;

                        return (
                          <TableRow
                            key={artist.id || index}
                            onClick={() => handleClick(artist.id, artist.name)}
                            onMouseEnter={() => setHoveredArtistId(artist.id)}
                            onMouseLeave={() => setHoveredArtistId(null)}
                            className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                          >
                            <TableCell className="text-center py-3 sm:py-4">
                              <span
                                className={`text-xs sm:text-sm font-medium ${
                                  isThisArtist ? "text-brand" : "text-zinc-400"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 sm:py-4">
                              <div className="flex items-center space-x-2 sm:space-x-3">
                                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 group/image">
                                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                                    <AvatarImage
                                      src={imageUrl || "/placeholder.svg"}
                                      alt={artist.name}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-zinc-700 text-white text-sm">
                                      {artist.name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-brand hover:bg-brand text-black shadow-xl"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayPauseArtist(artist.id);
                                      }}
                                    >
                                      {isArtistPlaying(artist.id) ? (
                                        <Pause
                                          className="h-3 w-3 sm:h-4 sm:w-4"
                                          fill="currentColor"
                                        />
                                      ) : (
                                        <Play
                                          className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5"
                                          fill="currentColor"
                                        />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`font-medium truncate transition-colors text-sm sm:text-base ${
                                      isThisArtist
                                        ? "text-brand"
                                        : "text-white hover:text-brand"
                                    }`}
                                  >
                                    {artist.name}
                                  </div>
                                  <div className="text-zinc-400 text-xs sm:text-sm">
                                    Artist
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-right py-3 sm:py-4">
                              <NumberTicker
                                value={artist.playcount}
                                className="text-zinc-400 text-sm"
                              />
                            </TableCell>
                            <TableCell className="py-3 sm:py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 bg-brand/10  hover:bg-brand hover:text-black rounded-full transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-56 bg-zinc-900 border-zinc-800"
                                >
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClick(artist.id, artist.name);
                                    }}
                                    className="text-white hover:bg-brand/20 "
                                  >
                                    <User className="mr-2 h-4 w-4" />
                                    Go to artist
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(
                                        `https://open.spotify.com/artist/${artist.id}`,
                                        "_blank"
                                      );
                                    }}
                                    className="text-white hover:bg-brand/20 "
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open in Spotify
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
            )}

            {displayUI === "Grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
                {memoizedArtists.map((artist, index) => {
                  const imageUrl = artist.image[0]["#text"];
                  const isThisArtist = currentArtistId === artist.id;

                  return (
                    <PlaylistCard
                      key={artist.id || index}
                      id={artist.id}
                      image={imageUrl || "/placeholder.svg"}
                      title={artist.name}
                      description={`${artist.playcount.toLocaleString()} plays`}
                      isPlaying={isThisArtist && isPlaying}
                      isPaused={isThisArtist && !isPlaying}
                      onPlay={handlePlayArtist}
                      onPause={pauseTrack}
                      onResume={resumeTrack}
                      onClick={handleClick}
                      menu={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-brand/10 hover:bg-brand hover:text-black rounded-full backdrop-blur-sm shadow-sm transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-56 bg-zinc-900 border-zinc-800"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClick(artist.id, artist.name);
                              }}
                              className="text-white hover:bg-brand/20 "
                            >
                              <User className="mr-2 h-4 w-4" />
                              Go to artist
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://open.spotify.com/artist/${artist.id}`,
                                  "_blank"
                                );
                              }}
                              className="text-white hover:bg-brand/20 "
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open in Spotify
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Page;
