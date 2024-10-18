"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/app/Sidebar";
import Header from "@/components/Header";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { useRouter } from "next/navigation";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import {
  ArtistsResponseLASTFM,
  DisplayUIProps,
  GlobalArtistPropsLASTFM,
} from "@/lib/types";

const Page = () => {
  const [artists, setArtists] = useState<GlobalArtistPropsLASTFM[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [numArtists, setNumArtists] = useState<number>(10);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const router = useRouter();

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
    setNumArtists(parseInt(value));
  };

  return (
    <div className="flex h-screen">
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
            <Select onValueChange={handleSelectChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select number of artists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
                <SelectItem value="30">Top 30</SelectItem>
                <SelectItem value="40">Top 40</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
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
          </div>
          {displayUI === "Table" && (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>A list of top artists.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">
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
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {artist.image[0]["#text"] && (
                              <Avatar className="w-36 h-36 relative p-1">
                                <AvatarImage src={imageUrl} alt={artist.name} />
                                <AvatarFallback>
                                  {artist.name[0]}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div className="text-xl">{artist.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {artist.playcount}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {displayUI === "Grid" && (
            <div className="flex flex-wrap gap-8">
              {memoizedArtists.map((artist, index) => {
                const imageUrl = artist.image[0]["#text"];

                return (
                  <Card
                    key={artist.id || index}
                    className="group w-36 cursor-pointer text-white"
                    onClick={() => handleClick(artist.id, artist.name)}
                  >
                    <CardHeader>
                      <Avatar className="w-36 h-36 relative p-1">
                        <AvatarImage src={imageUrl} alt={artist.name} />
                        <AvatarFallback>{artist.name[0]}</AvatarFallback>
                      </Avatar>
                      <CardTitle>{artist.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="text-sm">
                      {artist.playcount}
                    </CardFooter>
                  </Card>
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
