"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { PlaylistProps, User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { Play, MoreHorizontal, Music, Pause } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { usePlayer } from "@/contexts/PlayerContext";

const PublicLibrary = ({ userId }: { userId?: string }) => {
  const router = useRouter();
  const { playPlaylist, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();
  const [publicPlaylists, setPublicPlaylists] = useState<PlaylistProps[]>([]);
  const [token, setToken] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string | null>(
    userId || null
  );
  const [loading, setLoading] = useState(true);
  const [displayUI, setDisplayUI] = useState<string>("Grid");
  const [currentPlaylistUri, setCurrentPlaylistUri] = useState<string | null>(
    null
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchProfileAndPlaylists = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);

      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const profile = await fetchUserProfile(token);
        effectiveUserId = profile?.id;
      }

      if (effectiveUserId) {
        setTargetUserId(effectiveUserId);
        const playlistsData = await fetchSpotifyPlaylists(
          token,
          effectiveUserId
        );
        if (playlistsData) {
          // If viewing another user, Spotify API only returns public playlists anyway.
          // We can show them all or filter if we want to be strict.
          setPublicPlaylists(playlistsData);
        }
      }
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (token) {
      fetchProfileAndPlaylists();
    }
  }, [token, fetchProfileAndPlaylists]);

  const handlePlayPausePlaylist = useCallback(
    async (playlistId?: string) => {
      if (!playlistId) return;

      const playlistUri = `spotify:playlist:${playlistId}`;

      // Check if this playlist is currently playing
      if (currentPlaylistUri === playlistUri) {
        // Same playlist - just toggle play/pause
        if (isPlaying) {
          pauseTrack();
        } else {
          resumeTrack();
        }
      } else {
        // Different playlist - play it from the beginning
        try {
          playPlaylist(playlistUri);
          setCurrentPlaylistUri(playlistUri);
        } catch (error) {
          console.error("Error playing playlist:", error);
        }
      }
    },
    [playPlaylist, pauseTrack, resumeTrack, currentPlaylistUri, isPlaying]
  );

  // Update current playlist URI when track changes
  useEffect(() => {
    if (currentTrack?.uri) {
      // Extract playlist URI from context
      const contextUri = currentTrack.uri.split(":").slice(0, 3).join(":");
      if (contextUri.startsWith("spotify:playlist:")) {
        setCurrentPlaylistUri(contextUri);
      }
    }
  }, [currentTrack]);

  const handleClick = (id: string, name: string) => {
    router.push(`/Playlists/${id}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Playlists</h2>
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
          ) : publicPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
                <Music className="h-12 w-12 text-zinc-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  No playlists yet
                </h3>
                <p className="text-zinc-400 max-w-md">
                  Create your first playlist to start organizing your music
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/30">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                    <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm w-[45%] sm:w-[50%]">
                      Playlist
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-zinc-400 font-medium text-xs sm:text-sm w-[30%] sm:w-[35%]">
                      Description
                    </TableHead>
                    <TableHead className="hidden md:table-cell w-28 text-right text-zinc-400 font-medium text-xs sm:text-sm">
                      Tracks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publicPlaylists.map((playlist) => {
                    const playlistUri = `spotify:playlist:${playlist.id}`;
                    const isThisPlaylist = currentPlaylistUri === playlistUri;

                    return (
                      <TableRow
                        key={playlist.id}
                        onClick={() => handleClick(playlist.id, playlist.name)}
                        className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                      >
                        <TableCell className="py-3 sm:py-4 max-w-0">
                          <div className="flex items-center space-x-3">
                            <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 group/image">
                              <Image
                                src={
                                  playlist.images?.[0]?.url ||
                                  "/placeholder.svg"
                                }
                                width={48}
                                height={48}
                                className="object-cover"
                                alt={playlist.name}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPausePlaylist(playlist.id);
                                  }}
                                >
                                  {isThisPlaylist && isPlaying ? (
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
                                className={`font-medium truncate transition-colors ${
                                  isThisPlaylist
                                    ? "text-green-400"
                                    : "text-white hover:text-green-400"
                                }`}
                              >
                                {playlist.name}
                              </div>
                              <div className="text-zinc-400 text-sm">
                                Playlist
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-zinc-400 truncate max-w-xs text-sm">
                            {playlist.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">
                          <span className="text-zinc-400 text-sm">
                            {playlist.tracks?.total || 0} tracks
                          </span>
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
                    <Skeleton className="w-[170px] h-[170px] mx-auto rounded-lg bg-zinc-800" />
                    <Skeleton className="h-5 w-36 mx-auto bg-zinc-800" />
                    <Skeleton className="h-4 w-32 mx-auto bg-zinc-800" />
                  </div>
                ))}
            </div>
          ) : publicPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
                <Music className="h-12 w-12 text-zinc-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  No playlists yet
                </h3>
                <p className="text-zinc-400 max-w-md">
                  Create your first playlist to start organizing your music
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
              {publicPlaylists.map((playlist) => {
                const playlistUri = `spotify:playlist:${playlist.id}`;
                const isThisPlaylist = currentPlaylistUri === playlistUri;

                return (
                  <PlaylistCard
                    key={playlist.id}
                    id={playlist.id}
                    image={playlist.images?.[0]?.url || ""}
                    title={playlist.name}
                    description={playlist.description || ""}
                    isPlaying={isThisPlaylist && isPlaying}
                    isPaused={isThisPlaylist && !isPlaying}
                    onPlay={handlePlayPausePlaylist}
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

export default PublicLibrary;
