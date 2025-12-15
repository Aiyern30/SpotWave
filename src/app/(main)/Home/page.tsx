"use client";
import Image from "next/image";
import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { Button } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import { useRouter } from "next/navigation";
import { IoMdAdd } from "react-icons/io";
import { Play, Music, MoreHorizontal } from "lucide-react";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { CreatePlaylist } from "@/utils/createPlaylist";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { usePlayer } from "@/contexts/PlayerContext";

type PlaylistsProps = {
  id: string;
  image: string;
  title: string;
  description: string;
};

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [userID, setUserID] = useState<string>("");
  const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { playPlaylist } = usePlayer();

  const handleClick = (id: string, name: string) => {
    router.push(`/Home/${id}?name=${encodeURIComponent(name)}`);
  };

  const handleFetchUserProfile = useCallback(async () => {
    const UserProfile = await fetchUserProfile(token);
    if (UserProfile) {
      setUserID(UserProfile.id);
    }
  }, [token]);

  const handleFetchAllProfilePlaylist = useCallback(async () => {
    setLoading(true);
    const data = await fetchSpotifyPlaylists(token);
    if (data) {
      const formattedPlaylists = data.map((playlist: any) => ({
        id: playlist?.id,
        image: playlist?.images?.[0]?.url || "",
        title: playlist?.name || "",
        description: playlist?.description || "",
      }));

      setPlaylists(formattedPlaylists);
    }
    setLoading(false);
  }, [token]);

  const handleCreatePlaylist = async () => {
    setCreating(true);
    const playlistResponse = await CreatePlaylist(userID, token);
    if (playlistResponse) {
      await handleFetchAllProfilePlaylist();
    } else {
      console.log("Playlist creation failed.");
    }
    setCreating(false);
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    try {
      // Play the entire playlist using Spotify URI
      const playlistUri = `spotify:playlist:${playlistId}`;
      playPlaylist(playlistUri);
    } catch (error) {
      console.error("Error playing playlist:", error);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
      handleFetchUserProfile();
    }
  }, [handleFetchUserProfile]);

  useEffect(() => {
    if (token && playlists.length === 0) {
      handleFetchAllProfilePlaylist();
    }
  }, [token, handleFetchAllProfilePlaylist, playlists.length]);

  const memoizedPlaylists = useMemo(() => playlists, [playlists]);

  const handleImageError = (id: string) => {
    setImageError((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  const PlaylistCard = ({ playlist }: { playlist: PlaylistsProps }) => (
    <TooltipProvider>
      <Card
        className="relative w-full max-w-[140px] sm:max-w-[200px] h-[165px] sm:h-[290px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group border-zinc-800/50 mx-auto"
        onClick={() => handleClick(playlist.id, playlist.title)}
      >
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3">
            <div className="w-full aspect-square max-w-[115px] sm:max-w-[170px] mx-auto rounded-lg shadow-xl overflow-hidden">
              {imageError[playlist.id] || !playlist.image ? (
                <Image
                  src="/default-artist.png"
                  width={170}
                  height={170}
                  className="object-cover rounded-lg w-full h-full"
                  alt={playlist.title}
                  priority
                />
              ) : (
                <Image
                  src={playlist.image || "/placeholder.svg"}
                  width={170}
                  height={170}
                  className="object-cover rounded-lg w-full h-full"
                  alt={playlist.title}
                  onError={() => handleImageError(playlist.id)}
                  priority
                />
              )}
            </div>

            {/* Play button overlay */}
            <div className="absolute bottom-2 right-4 sm:bottom-4 sm:right-7 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl hover:scale-110 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPlaylist(playlist.id);
                }}
              >
                <Play
                  className="h-4 w-4 sm:h-6 sm:w-6 ml-0.5"
                  fill="currentColor"
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-1 sm:p-5 sm:pt-2 sm:space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-xs sm:text-base font-semibold line-clamp-2 sm:line-clamp-1 hover:text-green-400 transition-colors leading-tight sm:leading-normal">
                {playlist.title}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{playlist.title}</p>
            </TooltipContent>
          </Tooltip>

          {playlist.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CardDescription className="hidden sm:block text-zinc-400 text-sm line-clamp-2 truncate leading-relaxed mt-1">
                  {playlist.description}
                </CardDescription>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="truncate">{playlist.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>

        {/* More options button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          onClick={(e) => {
            e.stopPropagation();
            // Handle more options
          }}
        >
          <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </Card>
    </TooltipProvider>
  );

  const CreatePlaylistCard = () => (
    <Card
      className="relative w-full max-w-[140px] sm:max-w-[200px] h-[165px] sm:h-[290px] cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/50 border-2 border-dashed border-zinc-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center group mx-auto"
      onClick={handleCreatePlaylist}
    >
      <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-5">
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-zinc-800/50 group-hover:bg-green-500/20 flex items-center justify-center transition-all duration-300 border border-zinc-700 group-hover:border-green-500/50">
          {creating ? (
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-green-500 border-t-transparent" />
          ) : (
            <IoMdAdd
              size={24}
              className="sm:w-9 sm:h-9 text-green-500 group-hover:scale-110 transition-transform"
            />
          )}
        </div>
        <p className="text-zinc-400 group-hover:text-white text-xs sm:text-base font-medium transition-colors px-2 text-center">
          {creating ? "Creating..." : "Create Playlist"}
        </p>
      </div>
    </Card>
  );

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="space-y-2 sm:space-y-4 w-full max-w-[140px] sm:max-w-[200px]"
        >
          <Skeleton className="w-full aspect-square rounded-lg bg-zinc-800" />
          <Skeleton className="h-4 sm:h-5 w-3/4 bg-zinc-800" />
          <Skeleton className="hidden sm:block h-4 w-2/3 bg-zinc-800" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <Header />

      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
          <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
            Your Playlists
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm font-medium">
            {memoizedPlaylists.length} playlist
            {memoizedPlaylists.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            <CreatePlaylistCard />
            {memoizedPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        )}

        {!loading && memoizedPlaylists.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 space-y-4 sm:space-y-6 px-4">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
              <Music className="h-10 w-10 sm:h-14 sm:w-14 text-zinc-600" />
            </div>
            <div className="text-center space-y-2 sm:space-y-3">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">
                No playlists yet
              </h3>
              <p className="text-zinc-400 max-w-md text-sm sm:text-base px-4">
                Create your first playlist to start organizing your favorite
                music
              </p>
            </div>
            <Button
              onClick={handleCreatePlaylist}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold px-5 sm:px-6 py-5 sm:py-6 text-sm sm:text-base mt-2 sm:mt-4"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Your First Playlist"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
