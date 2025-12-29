"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/";
import { Button } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import { useRouter } from "next/navigation";
import { IoMdAdd } from "react-icons/io";
import { Music, BookOpen, Headphones, Radio, Heart } from "lucide-react";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { CreatePlaylist } from "@/utils/createPlaylist";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { fetchBrowseCategories } from "@/utils/fetchCategories";
import {
  fetchAudiobooks,
  fetchUserSavedAudiobooks,
  saveAudiobooksForUser,
  removeAudiobooksFromUser,
} from "@/utils/fetchAudiobooks";
import { fetchSeveralChapters } from "@/utils/fetchChapters";
import {
  fetchSeveralEpisodes,
  fetchUserSavedEpisodes,
  saveEpisodesForUser,
  removeEpisodesFromUser,
} from "@/utils/fetchEpisodes";
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

type AudiobookProps = {
  id: string;
  name: string;
  authors: { name: string }[];
  images: { url: string }[];
  description: string;
};

type ChapterProps = {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  duration_ms: number;
};

type EpisodeProps = {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  duration_ms: number;
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
  const [audiobooks, setAudiobooks] = useState<AudiobookProps[]>([]);
  const [savedAudiobooks, setSavedAudiobooks] = useState<AudiobookProps[]>([]);
  const [chapters, setChapters] = useState<ChapterProps[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeProps[]>([]);
  const [savedEpisodes, setSavedEpisodes] = useState<EpisodeProps[]>([]);

  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(true);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [loadingAudiobooks, setLoadingAudiobooks] = useState<boolean>(true);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(true);

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

  // Fetch Audiobooks
  const handleFetchAudiobooks = useCallback(async () => {
    setLoadingAudiobooks(true);
    const data = await fetchAudiobooks(token);
    const savedData = await fetchUserSavedAudiobooks(token);
    if (data) {
      setAudiobooks(data.filter((book: any) => book !== null));
    }
    if (savedData) {
      setSavedAudiobooks(savedData.map((item: any) => item.audiobook));
    }
    setLoadingAudiobooks(false);
  }, [token]);

  // Fetch Chapters (sample)
  const handleFetchChapters = useCallback(async () => {
    setLoadingChapters(true);
    const chapterIds = ["0D5wENdkdwbqlrHoaJ9g29", "1HGw3J3NxZO1TP1BTtVhpZ"];
    const data = await fetchSeveralChapters(token, chapterIds);
    if (data) {
      setChapters(data.filter((chapter: any) => chapter !== null));
    }
    setLoadingChapters(false);
  }, [token]);

  // Fetch Episodes
  const handleFetchEpisodes = useCallback(async () => {
    setLoadingEpisodes(true);
    const episodeIds = ["512ojhOuo1ktJprKbVcKyQ", "0Q86acNRm6V9GYx55SXKwf"];
    const data = await fetchSeveralEpisodes(token, episodeIds);
    const savedData = await fetchUserSavedEpisodes(token);
    if (data) {
      setEpisodes(data.filter((episode: any) => episode !== null));
    }
    if (savedData) {
      setSavedEpisodes(savedData.map((item: any) => item.episode));
    }
    setLoadingEpisodes(false);
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
      handleFetchAudiobooks();
      handleFetchChapters();
      handleFetchEpisodes();
    }
  }, [
    token,
    handleFetchUserProfile,
    handleFetchAllProfilePlaylist,
    handleFetchCategories,
    handleFetchAudiobooks,
    handleFetchChapters,
    handleFetchEpisodes,
  ]);

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

  const GenericCard = ({ item, type }: { item: any; type: string }) => (
    <Card className="relative w-full max-w-[140px] sm:max-w-[200px] h-[165px] sm:h-[290px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-105 group mx-auto overflow-hidden">
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
          {type === "audiobook" && item.authors?.[0]?.name}
          {type === "category" && "Browse"}
          {(type === "chapter" || type === "episode") && "Podcast"}
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
            <Music className="h-6 w-6 text-green-500" />
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
          <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="h-6 w-6 text-blue-500" />
            Browse Categories
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-medium">
            {categories.length} categories
          </p>
        </div>
        {loadingCategories ? (
          <LoadingSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            {categories.map((category) => (
              <GenericCard key={category.id} item={category} type="category" />
            ))}
          </div>
        )}
      </div>

      {/* Audiobooks Section */}
      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
          <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-500" />
            Audiobooks
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-medium">
            {audiobooks.length} audiobooks
          </p>
        </div>
        {loadingAudiobooks ? (
          <LoadingSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            {audiobooks.map((audiobook) => (
              <GenericCard
                key={audiobook.id}
                item={audiobook}
                type="audiobook"
              />
            ))}
          </div>
        )}
      </div>

      {/* Saved Audiobooks Section */}
      {savedAudiobooks.length > 0 && (
        <div className="space-y-3 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500" />
              Saved Audiobooks
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium">
              {savedAudiobooks.length} saved
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            {savedAudiobooks.map((audiobook) => (
              <GenericCard
                key={audiobook.id}
                item={audiobook}
                type="audiobook"
              />
            ))}
          </div>
        </div>
      )}

      {/* Chapters Section */}
      {chapters.length > 0 && (
        <div className="space-y-3 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Headphones className="h-6 w-6 text-yellow-500" />
              Chapters
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium">
              {chapters.length} chapters
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            {chapters.map((chapter) => (
              <GenericCard key={chapter.id} item={chapter} type="chapter" />
            ))}
          </div>
        </div>
      )}

      {/* Episodes Section */}
      {episodes.length > 0 && (
        <div className="space-y-3 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Radio className="h-6 w-6 text-orange-500" />
              Episodes
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium">
              {episodes.length} episodes
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            {episodes.map((episode) => (
              <GenericCard key={episode.id} item={episode} type="episode" />
            ))}
          </div>
        </div>
      )}

      {/* Saved Episodes Section */}
      {savedEpisodes.length > 0 && (
        <div className="space-y-3 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 px-1 sm:px-2">
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Heart className="h-6 w-6 text-pink-500" />
              Saved Episodes
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-medium">
              {savedEpisodes.length} saved
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
            {savedEpisodes.map((episode) => (
              <GenericCard key={episode.id} item={episode} type="episode" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
