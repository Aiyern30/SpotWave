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

interface Image {
  ["#text"]: string;
  size: string;
}

interface TrackData {
  name: string;
  playcount: string;
  listeners: string;
  artist: {
    name: string;
    id: string;
  };
  image: Image[];
  id: string;
}

interface TopTracksResponse {
  tracks: {
    track: TrackData[];
  };
}

interface DisplayUIProps {
  displayUI: "Table" | "Grid";
}

const Page = () => {
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [numTracks, setNumTracks] = useState<number>(10);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const router = useRouter();

  const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;

  const fetchSpotifyData = useCallback(async (tracks: TrackData[]) => {
    const updatedTracks = await Promise.all(
      tracks.map(async (track) => {
        const spotifyData = await searchTrackOnSpotify(
          track.name,
          track.artist.name
        );
        if (spotifyData) {
          return {
            ...track,
            id: spotifyData.id,
            image: spotifyData.imageUrl
              ? [{ "#text": spotifyData.imageUrl, size: "large" }]
              : track.image,
            artist: {
              ...track.artist,
              id: spotifyData.artistId, // Add artistId here
            },
          };
        }
        return track;
      })
    );
    return updatedTracks;
  }, []);

  const fetchTopTracks = useCallback(
    async (apiKey: string, limit: number) => {
      try {
        const response = await fetch(
          `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&limit=${limit}&api_key=${apiKey}&format=json`
        );
        const data: TopTracksResponse = await response.json();

        if (response.ok) {
          const tracksWithImages = await fetchSpotifyData(data.tracks.track);
          setTracks(tracksWithImages.slice(0, limit));
        } else {
          console.error("Failed to fetch top tracks from Last.fm:", data);
        }
      } catch (error) {
        console.error("Error fetching top tracks:", error);
      }
    },
    [fetchSpotifyData]
  );

  const searchTrackOnSpotify = async (
    trackName: string,
    artistName: string
  ): Promise<{ id: string; imageUrl: string; artistId: string } | null> => {
    const token = localStorage.getItem("Token");

    if (!token) {
      console.error("Spotify API token not found");
      return null;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          trackName
        )} ${encodeURIComponent(artistName)}&type=track`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.tracks && data.tracks.items.length > 0) {
        const track = data.tracks.items[0];
        return {
          id: track.id,
          imageUrl: track.album.images[0]?.url || null,
          artistId: track.artists[0]?.id || null, // Fetch the artist ID
        };
      }
    } catch (error) {
      console.error(
        `Error fetching track data from Spotify for ${trackName} by ${artistName}:`,
        error
      );
    }
    return null;
  };

  useEffect(() => {
    if (LASTFM_API_KEY === undefined) {
      return;
    }
    fetchTopTracks(LASTFM_API_KEY, numTracks);
  }, [LASTFM_API_KEY, numTracks, fetchTopTracks]);

  const memoizedTracks = useMemo(() => tracks, [tracks]);

  const handleClick = (id: string, name: string) => {
    router.push(`/Songs/${id}?name=${encodeURIComponent(name)}`);
  };

  const handleSelectChange = (value: string) => {
    setNumTracks(parseInt(value));
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
                <SelectValue placeholder="Select number of tracks" />
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
                <TableCaption>A list of top tracks.</TableCaption>
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
                  {memoizedTracks.map((track, index) => {
                    const imageUrl = track.image[0]["#text"];

                    return (
                      <TableRow
                        key={track.id || index}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/Songs/${track.id}?name=${track.name}`);
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {track.image[0]["#text"] && (
                              <Avatar className="w-36 h-36 relative p-1">
                                <AvatarImage src={imageUrl} alt={track.name} />
                                <AvatarFallback>{track.name[0]}</AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex flex-col space-y-3">
                              <div className="text-xl">{track.name}</div>
                              <div
                                className="hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  router.push(
                                    `/Artists/${track.artist.id}?name=${track.artist.name}`
                                  );
                                }}
                              >
                                {track.artist.name}
                              </div>
                              <div className="text-xs">
                                Monthly Listeners: {track.listeners}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {track.playcount}
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
              {memoizedTracks.map((track, index) => {
                const imageUrl = track.image[0]["#text"];

                return (
                  <Card
                    key={track.id || index}
                    className="group w-60 cursor-pointer text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/Songs/${track.id}?name=${track.name}`);
                    }}
                  >
                    <CardHeader>
                      <Avatar className="w-36 h-36 relative p-1 mx-auto">
                        <AvatarImage src={imageUrl} alt={track.name} />
                        <AvatarFallback>{track.name[0]}</AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-xl">{track.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="text-sm space-y-1 p-2 flex flex-col">
                      <div
                        className="text-xs hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();

                          router.push(
                            `/Artists/${track.artist.id}?name=${track.artist.name}`
                          );
                        }}
                      >
                        {track.artist.name}
                      </div>
                      <div className="text-xs">
                        <strong>Playcount:</strong> {track.playcount}
                      </div>
                      <div className="text-xs">
                        <strong>Monthly Listeners:</strong> {track.listeners}
                      </div>
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
