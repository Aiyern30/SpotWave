"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
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
} from "@/components/ui/";
import { Radio, Search, Play, Pause, Music } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { fetchBrowseCategories } from "@/utils/fetchCategories";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DisplayUIProps } from "@/lib/types";
import { usePlayer } from "@/contexts/PlayerContext";
import PlaylistCard from "@/components/PlaylistCard";
import { fetchCategoryPlaylists } from "@/utils/fetchCategories";

type CategoryProps = {
  id: string;
  name: string;
  icons: { url: string }[];
  href: string;
};

const CategoryCard = ({
  category,
  viewMode,
  onPlay,
  isPlaying,
}: {
  category: CategoryProps;
  viewMode: DisplayUIProps;
  onPlay: (id: string) => void;
  isPlaying: boolean;
}) => {
  const router = useRouter();
  const detailUrl = `/Categories/${category.id}?name=${encodeURIComponent(
    category.name
  )}`;

  const handleClick = () => {
    router.push(detailUrl);
  };

  if (viewMode === "Table") {
    return (
      <TableRow
        onClick={handleClick}
        className="border-zinc-800/30 hover:bg-zinc-800/20 transition-all duration-300 cursor-pointer group"
      >
        <TableCell className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group/image">
              <Image
                src={category.icons?.[0]?.url || "/default-category.png"}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-500 group-hover/image:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full bg-brand hover:bg-brand/80 text-brand-foreground shadow-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(category.id);
                  }}
                >
                  <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-base truncate group-hover:text-brand transition-colors ${
                  isPlaying ? "text-brand" : "text-white"
                }`}
              >
                {category.name}
              </h3>
              <p className="text-zinc-500 text-xs mt-0.5 uppercase tracking-wider font-medium">
                Category
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell text-zinc-400 text-sm">
          Browse {category.name.toLowerCase()} music & collections
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 group-hover:text-brand group-hover:bg-brand/10 transition-all"
          >
            Explore →
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <PlaylistCard
      id={category.id}
      title={category.name}
      image={category.icons?.[0]?.url || "/default-category.png"}
      description={`Browse ${category.name.toLowerCase()}`}
      onClick={handleClick}
      onPlay={() => onPlay(category.id)}
      isPlaying={isPlaying}
    />
  );
};

const CategoriesPage = () => {
  const [token, setToken] = useState<string>("");
  const [categories, setCategories] = useState<CategoryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [displayUI, setDisplayUI] = useState<DisplayUIProps>("Grid");
  const { playPlaylist, currentTrack, isPlaying } = usePlayer();
  const router = useRouter();

  const handleFetchCategories = useCallback(async () => {
    setLoading(true);
    const data = await fetchBrowseCategories(token);
    if (data) {
      setCategories(data);
    }
    setLoading(false);
  }, [token]);

  const handlePlayCategory = async (categoryId: string) => {
    try {
      // Logic to play a category: Fetch top playlists in this category and play the first one
      const playlists = await fetchCategoryPlaylists(token, categoryId);
      if (playlists && playlists.length > 0) {
        const playlistUri = `spotify:playlist:${playlists[0].id}`;
        playPlaylist(playlistUri);
      }
    } catch (error) {
      console.error("Error playing category:", error);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      handleFetchCategories();
    }
  }, [token, handleFetchCategories]);

  const LoadingSkeleton = () => (
    <div
      className={`grid ${
        displayUI === "Grid"
          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          : "grid-cols-1"
      } gap-4 sm:gap-6`}
    >
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton
            className={`w-full ${
              displayUI === "Grid" ? "aspect-square" : "h-24"
            } rounded-lg bg-zinc-800`}
          />
          <Skeleton className="h-4 w-3/4 bg-zinc-800" />
        </div>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-32 h-32 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
        <Radio className="h-16 w-16 text-zinc-600" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-2xl font-semibold text-white">
          No Categories Available
        </h3>
        <p className="text-zinc-400 text-base">
          We couldn't load any categories at the moment. Please try again later.
        </p>
      </div>
      <Button
        onClick={() => handleFetchCategories()}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-6 mt-4"
      >
        Retry
      </Button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
            <Radio className="h-6 w-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Browse Categories
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {loading
                ? "Searching for vibes..."
                : `Explore ${categories.length} musical genres and moods.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50 shadow-inner">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisplayUI("Table")}
            className={`h-9 px-3 transition-all ${
              displayUI === "Table"
                ? "bg-brand/10 text-brand hover:bg-brand/20 hover:text-brand"
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
                ? "bg-brand/10 text-brand hover:bg-brand/20 hover:text-brand"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : categories.length === 0 ? (
        <EmptyState />
      ) : displayUI === "Table" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800/50 bg-zinc-900/10 shadow-sm">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                <TableHead className="text-zinc-400 font-medium text-xs sm:text-sm w-[60%] sm:w-[50%]">
                  Category
                </TableHead>
                <TableHead className="hidden md:table-cell text-zinc-400 font-medium text-xs sm:text-sm">
                  Description
                </TableHead>
                <TableHead className="text-right text-zinc-400 font-medium text-xs sm:text-sm">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  viewMode={displayUI}
                  onPlay={handlePlayCategory}
                  isPlaying={false} // Category playing state is complex, keeping simple for now
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-6 justify-items-center">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              viewMode={displayUI}
              onPlay={handlePlayCategory}
              isPlaying={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
