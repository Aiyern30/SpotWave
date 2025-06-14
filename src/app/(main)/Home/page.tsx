"use client";
import Image from "next/image";
import { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
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
import { usePlayer } from "@/contexts/playerContext";

type PlaylistsProps = {
  id: string;
  image: string;
  title: string;
  description: string;
};

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [userID, setUserID] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const { playTrack } = usePlayer();

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
    // Fetch first track from playlist and play it
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items.length > 0) {
          const track = data.items[0].track;
          playTrack({
            id: track.id,
            name: track.name,
            artists: track.artists,
            album: track.album,
            duration_ms: track.duration_ms,
            uri: track.uri,
            preview_url: track.preview_url,
          });
        }
      }
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
        className="relative w-[200px] h-[280px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
        onClick={() => handleClick(playlist.id, playlist.title)}
      >
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-4 pt-4 pb-2">
            <div className="w-[170px] h-[170px] rounded-lg shadow-lg overflow-hidden">
              {imageError[playlist.id] || !playlist.image ? (
                <Image
                  src="/default-artist.png"
                  width={170}
                  height={170}
                  className="object-cover rounded-lg"
                  alt={playlist.title}
                  priority
                />
              ) : (
                <Image
                  src={playlist.image || "/placeholder.svg"}
                  width={170}
                  height={170}
                  className="object-cover rounded-lg"
                  alt={playlist.title}
                  onError={() => handleImageError(playlist.id)}
                  priority
                />
              )}
            </div>

            {/* Play button overlay */}
            <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPlaylist(playlist.id);
                }}
              >
                <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
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
                <CardDescription className="text-zinc-400 text-sm line-clamp-2 leading-relaxed mt-1">
                  {playlist.description}
                </CardDescription>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{playlist.description}</p>
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

  const CreatePlaylistCard = () => (
    <Card
      className="relative w-[200px] h-[280px] cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/50 border border-dashed border-zinc-700 transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center group"
      onClick={handleCreatePlaylist}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-zinc-700 group-hover:bg-green-500/20 flex items-center justify-center transition-all duration-300">
          {creating ? (
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
          ) : (
            <IoMdAdd
              size={32}
              className="text-green-500 group-hover:scale-110 transition-transform"
            />
          )}
        </div>
        <p className="text-zinc-400 group-hover:text-white text-base font-medium transition-colors">
          {creating ? "Creating..." : "Create Playlist"}
        </p>
      </div>
    </Card>
  );

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="w-[170px] h-[170px] mx-auto rounded-lg bg-zinc-800" />
          <Skeleton className="h-5 w-36 mx-auto bg-zinc-800" />
          <Skeleton className="h-4 w-32 mx-auto bg-zinc-800" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="px-6 py-4 space-y-5">
          <Header />

          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <h1 className="text-2xl font-bold text-white">Your Playlists</h1>
              <p className="text-zinc-400 text-sm">
                {memoizedPlaylists.length} playlist
                {memoizedPlaylists.length !== 1 ? "s" : ""}
              </p>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
                <CreatePlaylistCard />
                {memoizedPlaylists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            )}

            {!loading && memoizedPlaylists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Music className="h-12 w-12 text-zinc-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    No playlists yet
                  </h3>
                  <p className="text-zinc-400 max-w-md">
                    Create your first playlist to start organizing your favorite
                    music
                  </p>
                </div>
                <Button
                  onClick={handleCreatePlaylist}
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Your First Playlist"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
