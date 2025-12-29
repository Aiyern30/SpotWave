"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Card,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import {
  Music,
  Radio,
  ArrowLeft,
  Play,
  Pause,
  Clock,
  ListPlus,
  MoreHorizontal,
} from "lucide-react";
import { fetchCategory, fetchCategoryPlaylists } from "@/utils/fetchCategories";
import { usePlayer } from "@/contexts/PlayerContext";
import { PiTable } from "react-icons/pi";
import { LayoutGridIcon as LuLayoutGrid } from "lucide-react";

type CategoryPlaylist = {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: {
    display_name: string;
  };
  tracks: {
    total: number;
  };
};

type CategoryDetails = {
  id: string;
  name: string;
  icons: { url: string }[];
};

const CategoryDetailPage = () => {
  const [category, setCategory] = useState<CategoryDetails | null>(null);
  const [playlists, setPlaylists] = useState<CategoryPlaylist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string>("");
  const [displayUI, setDisplayUI] = useState<"Table" | "Grid">("Grid");
  const [currentPlaylistUri, setCurrentPlaylistUri] = useState<string | null>(
    null
  );
  const [hoveredPlaylistId, setHoveredPlaylistId] = useState<string | null>(
    null
  );

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playPlaylist, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();

  const segments = pathname.split("/");
  const categoryId = segments[segments.length - 1];
  const categoryName = searchParams.get("name");

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchCategoryData = useCallback(async () => {
    if (!token || !categoryId) return;

    setLoading(true);
    try {
      const [categoryData, playlistsData] = await Promise.all([
        fetchCategory(token, categoryId),
        fetchCategoryPlaylists(token, categoryId),
      ]);

      if (categoryData) {
        setCategory(categoryData);
      }
      if (playlistsData) {
        setPlaylists(playlistsData);
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
    } finally {
      setLoading(false);
    }
  }, [token, categoryId]);

  useEffect(() => {
    if (token) {
      fetchCategoryData();
    }
  }, [token, fetchCategoryData]);

  // Update current playlist URI when track changes
  useEffect(() => {
    if (currentTrack?.uri) {
      const contextUri = currentTrack.uri.split(":").slice(0, 3).join(":");
      if (contextUri.startsWith("spotify:playlist:")) {
        setCurrentPlaylistUri(contextUri);
      }
    }
  }, [currentTrack]);

  const handlePlaylistClick = (playlistId: string, playlistName: string) => {
    router.push(`/Home/${playlistId}?name=${encodeURIComponent(playlistName)}`);
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

  const isPlaylistPlaying = (playlistId: string) => {
    return currentPlaylistUri === `spotify:playlist:${playlistId}` && isPlaying;
  };

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-48 h-48 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array(12)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="w-full aspect-square rounded-lg bg-zinc-800" />
                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-32 h-32 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
        <Music className="h-16 w-16 text-zinc-600" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-2xl font-semibold text-white">
          No Playlists Available
        </h3>
        <p className="text-zinc-400 text-base">
          We couldn't find any playlists in this category at the moment.
        </p>
      </div>
      <Button
        onClick={() => router.push("/Categories")}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-6 mt-4"
      >
        Back to Categories
      </Button>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!category) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
            <Radio className="h-12 w-12 text-zinc-600" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">
              Category not found
            </h3>
            <p className="text-zinc-400 max-w-md">
              The category you're looking for doesn't exist or is not
              accessible.
            </p>
          </div>
          <Button
            onClick={() => router.push("/Categories")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 mt-4"
          >
            Back to Categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/Categories")}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Categories
        </Button>

        {/* Category Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Category Icon */}
          {category.icons?.[0]?.url && (
            <div className="relative w-48 h-48 rounded-lg overflow-hidden shadow-2xl flex-shrink-0">
              <Image
                src={category.icons[0].url}
                alt={category.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Category Info */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-semibold text-blue-500 uppercase tracking-wider">
                Category
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
              {categoryName || category.name}
            </h1>
            <p className="text-zinc-400 text-base">
              {playlists.length}{" "}
              {playlists.length === 1 ? "playlist" : "playlists"} available
            </p>
          </div>
        </div>
      </div>

      {/* Playlists Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Playlists
          </h2>
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

        {playlists.length === 0 ? (
          <EmptyState />
        ) : displayUI === "Table" ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
            <Table className="table-layout-fixed">
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                  <TableHead className="w-[50px] sm:w-[60px] text-center text-zinc-400 font-medium whitespace-nowrap">
                    #
                  </TableHead>
                  <TableHead className="text-zinc-400 font-medium">
                    Playlist
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                    Owner
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-zinc-400 font-medium text-center">
                    Tracks
                  </TableHead>
                  <TableHead className="w-[50px] text-zinc-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playlists.map((playlist, index) => {
                  const isPlayingThis = isPlaylistPlaying(playlist.id);
                  const isHovered = hoveredPlaylistId === playlist.id;

                  return (
                    <TableRow
                      key={playlist.id}
                      className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                      onClick={() =>
                        handlePlaylistClick(playlist.id, playlist.name)
                      }
                      onMouseEnter={() => setHoveredPlaylistId(playlist.id)}
                      onMouseLeave={() => setHoveredPlaylistId(null)}
                    >
                      <TableCell className="text-center py-4">
                        {isHovered ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 rounded-full hover:bg-green-500 hover:text-black"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPlaylist(playlist.id);
                            }}
                          >
                            {isPlayingThis ? (
                              <Pause className="w-4 h-4" fill="currentColor" />
                            ) : (
                              <Play
                                className="w-4 h-4 ml-0.5"
                                fill="currentColor"
                              />
                            )}
                          </Button>
                        ) : (
                          <span
                            className={`text-sm font-medium ${
                              isPlayingThis ? "text-green-400" : "text-zinc-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={
                                playlist.images?.[0]?.url || "/placeholder.svg"
                              }
                              alt={playlist.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`font-semibold truncate ${
                                isPlayingThis ? "text-green-400" : "text-white"
                              }`}
                            >
                              {playlist.name}
                            </div>
                            <div className="text-zinc-400 text-xs truncate max-w-md hidden sm:block">
                              {playlist.description?.replace(
                                /<[^>]*>?/gm,
                                ""
                              ) || "No description"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-zinc-400 text-sm">
                        {playlist.owner.display_name}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center text-zinc-400 text-sm">
                        {playlist.tracks.total}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-6">
            {playlists.map((playlist) => {
              const isPlayingThis = isPlaylistPlaying(playlist.id);
              return (
                <PlaylistCard
                  key={playlist.id}
                  id={playlist.id}
                  image={playlist.images?.[0]?.url || "/placeholder.svg"}
                  title={playlist.name}
                  description={
                    playlist.description?.replace(/<[^>]*>?/gm, "") ||
                    `By ${playlist.owner.display_name}`
                  }
                  badge={`${playlist.tracks.total} tracks`}
                  isPlaying={isPlayingThis}
                  onPlay={() => handlePlayPlaylist(playlist.id)}
                  onPause={pauseTrack}
                  onResume={resumeTrack}
                  onClick={(id) => handlePlaylistClick(id, playlist.name)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDetailPage;
