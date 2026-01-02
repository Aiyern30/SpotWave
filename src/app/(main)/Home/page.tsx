"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { Card, CardContent } from "@/components/ui/";
import { Button } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import { useRouter } from "next/navigation";
import { IoMdAdd } from "react-icons/io";
import { Music, Radio } from "lucide-react";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { CreatePlaylist } from "@/utils/createPlaylist";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { fetchBrowseCategories } from "@/utils/fetchCategories";
import { usePlayer } from "@/contexts/PlayerContext";

type PlaylistsProps = {
  id: string;
  image: string;
  title: string;
  description: string;
};

type CategoryProps = {
  id: string;
  name: string;
  icons: { url: string }[];
};

type UserProfile = {
  id: string;
  display_name: string;
  images: { url: string }[];
};

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
  const [categories, setCategories] = useState<CategoryProps[]>([]);

  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(true);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);

  const [creating, setCreating] = useState<boolean>(false);
  const [currentPlaylistUri, setCurrentPlaylistUri] = useState<string | null>(
    null
  );

  const router = useRouter();
  const { playPlaylist, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();

  const handleClick = (id: string, name: string) => {
    router.push(`/Playlists/${id}?name=${encodeURIComponent(name)}`);
  };

  const handleCategoryClick = (id: string, name: string) => {
    router.push(`/Categories/${id}?name=${encodeURIComponent(name)}`);
  };

  const handleFetchUserProfile = useCallback(async () => {
    const profile = await fetchUserProfile(token);
    if (profile) {
      setUserProfile(profile);
    }
  }, [token]);

  const userID = userProfile?.id || "";

  // Fetch Playlists
  const handleFetchAllProfilePlaylist = useCallback(async () => {
    setLoadingPlaylists(true);
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
    setLoadingPlaylists(false);
  }, [token]);

  // Fetch Categories
  const handleFetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    const data = await fetchBrowseCategories(token);
    if (data) {
      setCategories(data.slice(0, 8)); // Show first 8 categories
    }
    setLoadingCategories(false);
  }, [token]);

  const handleCreatePlaylist = async () => {
    setCreating(true);
    const playlistResponse = await CreatePlaylist(userID, token);
    if (playlistResponse) {
      await handleFetchAllProfilePlaylist();
    }
    setCreating(false);
  };

  const handlePlayPlaylist = useCallback(
    async (playlistId?: string) => {
      if (!playlistId) return;
      const playlistUri = `spotify:playlist:${playlistId}`;
      if (currentPlaylistUri === playlistUri) {
        if (isPlaying) {
          pauseTrack();
        } else {
          resumeTrack();
        }
      } else {
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

  useEffect(() => {
    if (currentTrack?.uri) {
      const contextUri = currentTrack.uri.split(":").slice(0, 3).join(":");
      if (contextUri.startsWith("spotify:playlist:")) {
        setCurrentPlaylistUri(contextUri);
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      handleFetchUserProfile();
      handleFetchAllProfilePlaylist();
      handleFetchCategories();
    }
  }, [
    token,
    handleFetchUserProfile,
    handleFetchAllProfilePlaylist,
    handleFetchCategories,
  ]);

  const CreatePlaylistCard = () => (
    <Card
      className="relative w-full max-w-[140px] sm:max-w-[200px] h-[165px] sm:h-[290px] cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/50 border-2 border-dashed border-zinc-700 hover:border-brand/50 transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center group mx-auto"
      onClick={handleCreatePlaylist}
    >
      <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-5">
        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-zinc-800/50 group-hover:bg-brand/20 flex items-center justify-center transition-all duration-300 border border-zinc-700 group-hover:border-brand/50">
          {creating ? (
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-brand border-t-transparent" />
          ) : (
            <IoMdAdd
              size={24}
              className="sm:w-9 sm:h-9 text-brand group-hover:scale-110 transition-transform"
            />
          )}
        </div>
        <p className="text-zinc-400 group-hover:text-white text-xs sm:text-base font-medium transition-colors px-2 text-center">
          {creating ? "Creating..." : "Create Playlist"}
        </p>
      </div>
    </Card>
  );

  const LoadingSkeleton = ({ count = 8 }: { count?: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
      {[...Array(count)].map((_, i) => (
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

  const GenericCard = ({
    item,
    type,
    onClick,
  }: {
    item: any;
    type: string;
    onClick?: (id: string, name: string) => void;
  }) => (
    <Card
      className="relative w-full max-w-[140px] sm:max-w-[200px] h-[165px] sm:h-[290px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-105 group mx-auto overflow-hidden"
      onClick={() => onClick && onClick(item.id, item.name || item.title)}
    >
      <div className="relative w-full h-[100px] sm:h-[200px]">
        <Image
          src={
            item.image ||
            item.icons?.[0]?.url ||
            item.images?.[0]?.url ||
            "/default-artist.png"
          }
          alt={item.name || item.title}
          fill
          className="object-cover"
        />
      </div>
      <CardContent className="p-2 sm:p-4">
        <h3 className="text-white text-xs sm:text-sm font-semibold truncate">
          {item.name || item.title}
        </h3>
        <p className="text-zinc-400 text-[10px] sm:text-xs truncate mt-1">
          {type === "category" && "Browse"}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Playlists Section */}
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
          <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Music className="h-6 w-6 text-brand" />
            Your Playlists
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm font-medium">
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
          </p>
        </div>
        {loadingPlaylists ? (
          <LoadingSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            <CreatePlaylistCard />
            {playlists.map((playlist) => {
              const playlistUri = `spotify:playlist:${playlist.id}`;
              const isThisPlaylist = currentPlaylistUri === playlistUri;
              return (
                <PlaylistCard
                  key={playlist.id}
                  id={playlist.id}
                  image={playlist.image}
                  title={playlist.title}
                  description={playlist.description}
                  isPlaying={isThisPlaylist && isPlaying}
                  isPaused={isThisPlaylist && !isPlaying}
                  onPlay={handlePlayPlaylist}
                  onPause={pauseTrack}
                  onResume={resumeTrack}
                  onClick={handleClick}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Browse Categories Section */}
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Radio className="h-6 w-6 text-brand" />
              Browse Categories
            </h2>
            <Button
              variant="outline"
              className="font-semibold text-sm sm:text-base transition-colors"
              onClick={() => router.push("/Categories")}
            >
              See All
            </Button>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm font-medium">
            {categories.length} categories
          </p>
        </div>
        {loadingCategories ? (
          <LoadingSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            {categories.map((category) => (
              <GenericCard
                key={category.id}
                item={category}
                type="category"
                onClick={handleCategoryClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
