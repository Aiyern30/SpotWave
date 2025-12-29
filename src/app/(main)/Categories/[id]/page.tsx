"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { Card, Button, Skeleton } from "@/components/ui";
import { Music, Radio, ArrowLeft } from "lucide-react";
import { fetchCategory, fetchCategoryPlaylists } from "@/utils/fetchCategories";

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

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const handlePlaylistClick = (playlistId: string, playlistName: string) => {
    router.push(`/Home/${playlistId}?name=${encodeURIComponent(playlistName)}`);
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
      <div className="space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Playlists
        </h2>

        {playlists.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                id={playlist.id}
                image={playlist.images?.[0]?.url || "/placeholder.svg"}
                title={playlist.name}
                description={
                  playlist.description || `By ${playlist.owner.display_name}`
                }
                badge={`${playlist.tracks.total} tracks`}
                onClick={(id) => handlePlaylistClick(id, playlist.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDetailPage;
