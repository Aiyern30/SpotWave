"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
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
import { Play, MoreHorizontal } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const router = useRouter();
  const { playTrack } = usePlayer();

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

  const handlePlayArtist = async (artistId: string) => {
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

        console.log("Playing artist's top track:", firstTrack.name);
      } else {
        console.error("No top tracks found for this artist");
      }
    } catch (error) {
      console.error("Error playing artist:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-4">
          <Header />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select onValueChange={handleSelectChange}>
                <SelectTrigger className="w-48 bg-zinc-800/50 border-zinc-700 text-zinc-300">
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
              <h1 className="text-2xl font-bold text-white">Top Artists</h1>
            </div>
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

          {displayUI === "Table" && (
            <div className="overflow-x-auto container">
              <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                <Table>
                  <TableCaption className="text-zinc-400">
                    A list of top artists from Last.fm
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                      <TableHead className="w-[60px] text-center text-zinc-400 font-medium">
                        #
                      </TableHead>
                      <TableHead className="text-zinc-400 font-medium">
                        Artist
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium">
                        Playcount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memoizedArtists.map((artist, index) => {
                      const imageUrl = artist.image[0]["#text"];

                      return (
                        <TableRow
                          key={artist.id || index}
                          onClick={() => handleClick(artist.id, artist.name)}
                          className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                        >
                          <TableCell className="text-center">
                            <span className="text-zinc-400 text-sm">
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage
                                    src={imageUrl || "/placeholder.svg"}
                                    alt={artist.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="bg-zinc-700 text-white">
                                    {artist.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-medium truncate hover:text-green-400 transition-colors">
                                  {artist.name}
                                </div>
                                <div className="text-zinc-400 text-sm">
                                  Artist
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
                            <NumberTicker
                              value={artist.playcount}
                              className="text-zinc-400 text-sm"
                            />
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

                return (
                  <PlaylistCard
                    key={artist.id || index}
                    id={artist.id}
                    image={imageUrl || "/placeholder.svg"}
                    title={artist.name}
                    description={`${artist.playcount.toLocaleString()} plays`}
                    onPlay={handlePlayArtist}
                    onClick={handleClick}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
