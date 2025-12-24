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
import { Play, MoreHorizontal, Users, Pause } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { usePlayer } from "@/contexts/PlayerContext";

const FollowingArtists = () => {
  const router = useRouter();
  const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } = usePlayer();
  const [token, setToken] = useState<string>("");
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayUI, setDisplayUI] = useState<string>("Grid");
  const [currentArtistId, setCurrentArtistId] = useState<string | null>(null);

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

  // Update current artist ID when track changes
  useEffect(() => {
    if (currentTrack?.artists?.[0]?.id) {
      setCurrentArtistId(currentTrack.artists[0].id);
    }
  }, [currentTrack]);

  const memoizedFollowedArtists = useMemo(
    () => followedArtists,
    [followedArtists]
  );

  // Handler to play artist's top tracks
  const handlePlayArtist = async (artistId?: string) => {
    if (!artistId) return;

    try {
      // Fetch artist's top tracks
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch artist's top tracks");
        return;
      }

      const data = await response.json();
      const topTracks = data.tracks;

      if (topTracks && topTracks.length > 0) {
        // Play the first top track
        const track = topTracks[0];
        playTrack({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: {
            name: track.album.name,
            images: track.album.images,
            id: track.album.id,
            artists: track.artists,
            release_date: track.album.release_date || "",
            total_tracks: track.album.total_tracks || 0,
          },
          duration_ms: track.duration_ms,
          explicit: track.explicit || false,
          external_urls: track.external_urls || { spotify: "" },
          popularity: track.popularity || 0,
          preview_url: track.preview_url || null,
          track_number: track.track_number || 0,
          disc_number: track.disc_number || 1,
          uri: track.uri,
        });
        setCurrentArtistId(artistId);
      }
    } catch (error) {
      console.error("Error playing artist:", error);
    }
  };

  const handlePlayPauseArtist = async (artistId?: string) => {
    if (!artistId) return;

    // Check if this artist is currently playing
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
  };

  const handleClick = (id: string, name: string) => {
    router.push(`/Artists/${id}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Following Artists</h2>
        <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayUI("Table")}
            className={`h-9 px-3 transition-all ${
              displayUI === "Table"
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
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
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
        </div>
      </div>

      {displayUI === "Table" ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
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
            <div className="bg-zinc-900/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                    <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm">
                      Artist
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
                      Genres
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memoizedFollowedArtists.map((artist) => {
                    const isThisArtist = currentArtistId === artist.id;
                    
                    return (
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
                        <TableCell className="py-3 sm:py-4">
                          <div className="flex items-center space-x-3">
                            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 group/image">
                              <Image
                                src={artist.image || "/placeholder.svg"}
                                width={48}
                                height={48}
                                className="object-cover rounded-full"
                                alt={artist.name}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPauseArtist(artist.id);
                                  }}
                                >
                                  {isThisArtist && isPlaying ? (
                                    <Pause className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" />
                                  ) : (
                                    <Play className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5" fill="currentColor" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`font-medium truncate transition-colors text-sm sm:text-base ${
                                isThisArtist ? "text-green-400" : "text-white hover:text-green-400"
                              }`}>
                                {artist.name}
                              </div>
                              <div className="text-zinc-400 text-xs sm:text-sm">
                                Artist
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-3 sm:py-4">
                          <div className="text-zinc-400 truncate max-w-xs text-sm">
                            {artist.genres?.join(", ") || "No genres"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
              {memoizedFollowedArtists.map((artist) => {
                const isThisArtist = currentArtistId === artist.id;
                
                return (
                  <PlaylistCard
                    key={artist.id}
                    id={artist.id}
                    image={artist.image || "/placeholder.svg"}
                    title={artist.name}
                    description={artist.genres?.join(", ") || "Artist"}
                    isPlaying={isThisArtist && isPlaying}
                    isPaused={isThisArtist && !isPlaying}
                    onPlay={handlePlayPauseArtist}
                    onPause={pauseTrack}
                    onResume={resumeTrack}
                    onClick={handleClick}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FollowingArtists;
