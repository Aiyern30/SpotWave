"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
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
  TableHeader,
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

import {
  TrackDataLASTFM,
  TopTracksResponseLASTFM,
  DisplayUIProps,
} from "@/lib/types";
import { searchTrackOnSpotify } from "@/utils/Songs/searchTrackOnSpotify";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { NumberTicker } from "@/components/magicui/NumberTicker";

const Page = () => {
  const [tracks, setTracks] = useState<TrackDataLASTFM[]>([]);
  const [numTracks, setNumTracks] = useState<number>(10);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");

  const router = useRouter();

  const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;

  const fetchSpotifyData = useCallback(async (tracks: TrackDataLASTFM[]) => {
    const updatedTracks = await Promise.all(
      tracks.map(async (track) => {
        const spotifyData = await searchTrackOnSpotify(
          track.name,
          track.artist.name
        );
        return spotifyData
          ? {
              ...track,
              id: spotifyData.id,
              image: spotifyData.imageUrl
                ? [{ "#text": spotifyData.imageUrl, size: "large" }]
                : track.image,
              artist: {
                ...track.artist,
                id: spotifyData.artistId,
              },
            }
          : track;
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
        const data: TopTracksResponseLASTFM = await response.json();

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

  useEffect(() => {
    if (LASTFM_API_KEY === undefined) return;
    fetchTopTracks(LASTFM_API_KEY, numTracks);
  }, [LASTFM_API_KEY, numTracks, fetchTopTracks]);

  const memoizedTracks = useMemo(() => tracks, [tracks]);

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
          sidebarOpen ? "lg:ml-64" : "lg:ml-16"
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
                {[10, 20, 30, 40, 50].map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    Top {value}
                  </SelectItem>
                ))}
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
                <TableHeader>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Name</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memoizedTracks.map((track, index) => (
                    <TableRow
                      key={track.id || index}
                      onClick={() =>
                        router.push(`/Songs/${track.id}?name=${track.name}`)
                      }
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {track.image[0]["#text"] && (
                            <Avatar className="w-32 h-32 sm:w-36 sm:h-36 relative p-1">
                              <AvatarImage
                                src={track.image[0]["#text"]}
                                alt={track.name}
                              />
                              <AvatarFallback className="text-black">
                                {track.name[0]}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex flex-col space-y-1">
                            <div className="text-xl">{track.name}</div>
                            <div
                              className="hover:underline cursor-pointer text-blue-600"
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
                              Monthly Listeners:{" "}
                              <NumberTicker
                                value={track.listeners}
                                className="text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {displayUI === "Grid" && (
            <div className="grid grid-cols-2 mx-auto sm:flex sm:flex-wrap gap-2 sm:gap-8 sm:gap-8">
              {memoizedTracks.map((track, index) => {
                const imageUrl = track.image[0]["#text"];

                return (
                  <Card
                    key={track.id || index}
                    className="group w-36 cursor-pointer text-white"
                    onClick={() =>
                      router.push(`/Songs/${track.id}?name=${track.name}`)
                    }
                  >
                    <CardHeader>
                      <Avatar className="w-32 h-32 sm:w-36 sm:h-36 relative p-1">
                        <AvatarImage src={imageUrl} alt={track.name} />
                        <AvatarFallback className="text-black">
                          {track.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle>{track.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="text-sm">
                      Monthly Listeners: {track.listeners}
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
