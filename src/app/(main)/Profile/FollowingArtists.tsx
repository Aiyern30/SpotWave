"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import type { Artist } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import { Play, MoreHorizontal, Users } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import Image from "next/image";

const FollowingArtists = () => {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayUI, setDisplayUI] = useState<string>("Grid");

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const fetchArtists = async () => {
      if (token) {
        setLoading(true);
        const artists = await fetchFollowedArtists(token);
        setFollowedArtists(artists);
        setLoading(false);
      }
    };
    fetchArtists();
  }, [token]);

  const memoizedFollowedArtists = useMemo(
    () => followedArtists,
    [followedArtists]
  );

  // Artist Card Component
  const ArtistCard = ({ artist }: { artist: Artist }) => (
    <TooltipProvider>
      <Card
        className="relative w-[200px] h-[280px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
        onClick={() =>
          router.push(
            `/Artists/${artist.id}?name=${encodeURIComponent(artist.name)}`
          )
        }
      >
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-4 pt-4 pb-2">
            <div className="w-[170px] h-[170px] rounded-full shadow-lg overflow-hidden">
              <Image
                src={artist.image || "/placeholder.svg"}
                width={170}
                height={170}
                className="object-cover rounded-full"
                alt={artist.name}
              />
            </div>

            {/* Play button overlay */}
            <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle play artist's top tracks
                }}
              >
                <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                {artist.name}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{artist.name}</p>
            </TooltipContent>
          </Tooltip>

          {artist.genres && artist.genres.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">
                  {artist.genres.join(", ")}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{artist.genres.join(", ")}</p>
              </TooltipContent>
            </Tooltip>
          )}
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Following Artists</h2>
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
          {loading ? (
            <div className="space-y-3">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-full rounded-lg bg-zinc-800"
                  />
                ))}
            </div>
          ) : memoizedFollowedArtists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
                <Users className="h-12 w-12 text-zinc-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  No followed artists
                </h3>
                <p className="text-zinc-400 max-w-md">
                  Start following artists to see them here
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                    <TableHead className="text-zinc-400 font-medium">
                      Artist
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                      Genres
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memoizedFollowedArtists.map((artist) => (
                    <TableRow
                      key={artist.id}
                      onClick={() =>
                        router.push(
                          `/Artists/${artist.id}?name=${encodeURIComponent(
                            artist.name
                          )}`
                        )
                      }
                      className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={artist.image || "/placeholder.svg"}
                              width={48}
                              height={48}
                              className="object-cover rounded-full"
                              alt={artist.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium truncate hover:text-green-400 transition-colors">
                              {artist.name}
                            </div>
                            <div className="text-zinc-400 text-sm">Artist</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-zinc-400 truncate max-w-xs">
                          {artist.genres?.join(", ") || "No genres"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
              {Array(12)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="w-[170px] h-[170px] mx-auto rounded-full bg-zinc-800" />
                    <Skeleton className="h-5 w-36 mx-auto bg-zinc-800" />
                    <Skeleton className="h-4 w-32 mx-auto bg-zinc-800" />
                  </div>
                ))}
            </div>
          ) : memoizedFollowedArtists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
                <Users className="h-12 w-12 text-zinc-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  No followed artists
                </h3>
                <p className="text-zinc-400 max-w-md">
                  Start following artists to see them here
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
              {memoizedFollowedArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FollowingArtists;
