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
import { Play, MoreHorizontal, Music } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { usePlayer } from "@/contexts/PlayerContext";

const PublicLibrary = () => {
  const router = useRouter();
  const { playPlaylist } = usePlayer();
  const [publicPlaylists, setPublicPlaylists] = useState<PlaylistProps[]>([]);
  const [token, setToken] = useState<string>("");
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayUI, setDisplayUI] = useState<string>("Grid");

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      console.error("No token found. Please authenticate.");
    }
  }, []);

  const fetchMyProfile = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    const profileData = await fetchUserProfile(token);
    if (profileData) {
      setMyProfile(profileData);
    }
  }, [token]);

  const fetchPublicPlaylists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    try {
      setLoading(true);
      const playlistsData = await fetchSpotifyPlaylists(token);
      if (playlistsData) {
        const myPlaylists = playlistsData.filter(
          (playlist: PlaylistProps) => playlist.owner.id === myProfile?.id
        );
        setPublicPlaylists(myPlaylists);
      }
    } catch (error) {
      console.error("Error fetching public playlists:", error);
    } finally {
      setLoading(false);
    }
  }, [token, myProfile]);

  const handleClick = (id: string, name: string) => {
    router.push(`/Home/${id}?name=${encodeURIComponent(name)}`);
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      const playlistUri = `spotify:playlist:${playlistId}`;
      playPlaylist(playlistUri);
    } catch (error) {
      console.error("Error playing playlist:", error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMyProfile();
    }
  }, [token, fetchMyProfile]);

  useEffect(() => {
    if (token && myProfile) {
      fetchPublicPlaylists();
    }
  }, [token, myProfile, fetchPublicPlaylists]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">My Playlists</h2>
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
            <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                    <TableHead className="text-zinc-400 font-medium">
                      Playlist
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                      Description
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium">
                      Tracks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publicPlaylists.map((playlist) => (
                    <TableRow
                      key={playlist.id}
                      onClick={() => handleClick(playlist.id, playlist.name)}
                      className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={
                                playlist.images?.[0]?.url || "/placeholder.svg"
                              }
                              width={48}
                              height={48}
                              className="object-cover"
                              alt={playlist.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium truncate hover:text-green-400 transition-colors">
                              {playlist.name}
                            </div>
                            <div className="text-zinc-400 text-sm">
                              Playlist
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-zinc-400 truncate max-w-xs">
                          {playlist.description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right">
                        <span className="text-zinc-400 text-sm">
                          {playlist.tracks?.total || 0} tracks
                        </span>
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
              {publicPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  id={playlist.id}
                  image={playlist.images?.[0]?.url || ""}
                  title={playlist.name}
                  description={playlist.description || ""}
                  onPlay={handlePlayPlaylist}
                  onClick={handleClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicLibrary;
