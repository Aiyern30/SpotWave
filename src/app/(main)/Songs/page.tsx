"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
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
import { Play, MoreHorizontal, Music } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { NumberTicker } from "@/components/magicui/NumberTicker";
import type {
  TrackDataLASTFM,
  TopTracksResponseLASTFM,
  DisplayUIProps,
} from "@/lib/types";
import { searchTrackOnSpotify } from "@/utils/Songs/searchTrackOnSpotify";
import Image from "next/image";

const Page = () => {
  const [tracks, setTracks] = useState<TrackDataLASTFM[]>([]);
  const [numTracks, setNumTracks] = useState<number>(10);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps | string>("Table");
  const [loading, setLoading] = useState<boolean>(false);

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
      setLoading(true);
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
      setLoading(false);
    },
    [fetchSpotifyData]
  );

  useEffect(() => {
    if (LASTFM_API_KEY === undefined) return;
    fetchTopTracks(LASTFM_API_KEY, numTracks);
  }, [LASTFM_API_KEY, numTracks, fetchTopTracks]);

  const memoizedTracks = useMemo(() => tracks, [tracks]);

  const handleSelectChange = (value: string) => {
    setNumTracks(Number.parseInt(value));
  };

  // Track Card Component
  const TrackCard = ({
    track,
    index,
  }: {
    track: TrackDataLASTFM;
    index: number;
  }) => (
    <TooltipProvider>
      <Card
        className="relative w-[200px] h-[300px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
        onClick={() => router.push(`/Songs/${track.id}?name=${track.name}`)}
      >
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-4 pt-4 pb-2">
            <div className="w-[170px] h-[170px] rounded-lg shadow-lg overflow-hidden">
              <Image
                src={track.image[0]["#text"] || "/placeholder.svg"}
                width={170}
                height={170}
                className="object-cover rounded-lg"
                alt={track.name}
              />
            </div>

            {/* Play button overlay */}
            <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle play track
                }}
              >
                <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
              </Button>
            </div>

            {/* Rank badge */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
              #{index + 1}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                {track.name}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{track.name}</p>
            </TooltipContent>
          </Tooltip>

          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="text-zinc-400 text-sm line-clamp-1 hover:text-zinc-300 transition-colors cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/Artists/${track.artist.id}?name=${track.artist.name}`
                    );
                  }}
                >
                  {track.artist.name}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{track.artist.name}</p>
              </TooltipContent>
            </Tooltip>

            <div className="text-zinc-500 text-xs">
              <NumberTicker value={track.listeners} className="text-zinc-500" />{" "}
              listeners
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
                  <SelectValue placeholder="Select number of tracks" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {[10, 20, 30, 40, 50].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      Top {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <h1 className="text-2xl font-bold text-white">Top Tracks</h1>
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

          {displayUI === "Table" ? (
            <div className="overflow-x-auto container">
              <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                      <TableHead className="w-[60px] text-center text-zinc-400 font-medium">
                        #
                      </TableHead>
                      <TableHead className="text-zinc-400 font-medium">
                        Track
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                        Artist
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium">
                        Listeners
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium">
                        Playcount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memoizedTracks.map((track, index) => (
                      <TableRow
                        key={track.id || index}
                        onClick={() =>
                          router.push(`/Songs/${track.id}?name=${track.name}`)
                        }
                        className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                      >
                        <TableCell className="text-center">
                          <span className="text-zinc-400 text-sm">
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={
                                  track.image[0]["#text"] || "/placeholder.svg"
                                }
                                width={48}
                                height={48}
                                className="object-cover"
                                alt={track.name}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium truncate hover:text-green-400 transition-colors">
                                {track.name}
                              </div>
                              <div className="text-zinc-400 text-sm">Track</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div
                            className="text-zinc-400 hover:text-white hover:underline cursor-pointer truncate"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/Artists/${track.artist.id}?name=${track.artist.name}`
                              );
                            }}
                          >
                            {track.artist.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right">
                          <NumberTicker
                            value={track.listeners}
                            className="text-zinc-400 text-sm"
                          />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right">
                          <NumberTicker
                            value={track.playcount}
                            className="text-zinc-400 text-sm"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
              {memoizedTracks.map((track, index) => (
                <TrackCard
                  key={track.id || index}
                  track={track}
                  index={index}
                />
              ))}
            </div>
          )}

          {memoizedTracks.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
                <Music className="h-12 w-12 text-zinc-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  No tracks found
                </h3>
                <p className="text-zinc-400 max-w-md">
                  Unable to load tracks at this time. Please try again later.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
