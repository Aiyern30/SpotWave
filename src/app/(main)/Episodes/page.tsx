"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/";
import { Button } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import { Radio, Heart, Search, Clock, Play } from "lucide-react";
import {
  fetchSeveralEpisodes,
  fetchUserSavedEpisodes,
  saveEpisodesForUser,
  removeEpisodesFromUser,
} from "@/utils/fetchEpisodes";
import { useRouter } from "next/navigation";

type EpisodeProps = {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  duration_ms: number;
  release_date: string;
  show: {
    name: string;
    publisher: string;
  };
};

const EpisodesPage = () => {
  const [token, setToken] = useState<string>("");
  const [episodes, setEpisodes] = useState<EpisodeProps[]>([]);
  const [savedEpisodes, setSavedEpisodes] = useState<EpisodeProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const handleFetchEpisodes = useCallback(async () => {
    setLoading(true);
    // Sample episode IDs - in production, you'd fetch from a show or user's library
    const episodeIds = [
      "512ojhOuo1ktJprKbVcKyQ",
      "0Q86acNRm6V9GYx55SXKwf",
      "4zugY5eJisugQj9rj8TYuh",
      "1XRq3FZFfVJLPjCLtDlFAT",
    ];

    const data = await fetchSeveralEpisodes(token, episodeIds);
    const savedData = await fetchUserSavedEpisodes(token);

    if (data) {
      const filtered = data.filter((episode: any) => episode !== null);
      setEpisodes(filtered);
    }

    if (savedData) {
      const saved = savedData.map((item: any) => item.episode);
      setSavedEpisodes(saved);
      setSavedIds(new Set(saved.map((episode: any) => episode.id)));
    }

    setLoading(false);
  }, [token]);

  const handleToggleSave = async (episodeId: string) => {
    const isSaved = savedIds.has(episodeId);

    if (isSaved) {
      const success = await removeEpisodesFromUser(token, [episodeId]);
      if (success) {
        setSavedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(episodeId);
          return newSet;
        });
      }
    } else {
      const success = await saveEpisodesForUser(token, [episodeId]);
      if (success) {
        setSavedIds((prev) => new Set(prev).add(episodeId));
      }
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
      handleFetchEpisodes();
    }
  }, [token, handleFetchEpisodes]);

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-32 h-32 rounded-lg bg-zinc-800 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-3/4 bg-zinc-800" />
            <Skeleton className="h-4 w-1/2 bg-zinc-800" />
            <Skeleton className="h-4 w-full bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );

  const EpisodeCard = ({ episode }: { episode: EpisodeProps }) => {
    const isSaved = savedIds.has(episode.id);

    return (
      <Card className="group bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-[1.01] cursor-pointer overflow-hidden">
        <div className="flex gap-4 p-4">
          <div className="relative w-32 h-32 flex-shrink-0">
            <Image
              src={episode.images?.[0]?.url || "/default-episode.png"}
              alt={episode.name}
              fill
              className="object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-brand-500 hover:bg-brand-600"
              >
                <Play className="h-6 w-6 text-black fill-black" />
              </Button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base truncate mb-1">
                  {episode.name}
                </h3>
                <p className="text-zinc-400 text-sm truncate mb-2">
                  {episode.show?.name || "Unknown Show"}
                </p>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSave(episode.id);
                }}
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
              >
                <Heart
                  className={`h-5 w-5 ${
                    isSaved ? "fill-green-500 bg-brand-500" : "text-zinc-400"
                  }`}
                />
              </Button>
            </div>

            <p className="text-zinc-500 text-sm line-clamp-2 mb-3">
              {episode.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(episode.duration_ms)}</span>
              </div>
              {episode.release_date && (
                <span>
                  {new Date(episode.release_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-32 h-32 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
        <Radio className="h-16 w-16 text-zinc-600" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-2xl font-semibold text-white">
          No Episodes Available
        </h3>
        <p className="text-zinc-400 text-base">
          We couldn't find any podcast episodes at the moment. Try following
          some shows to see episodes here.
        </p>
      </div>
      <Button
        onClick={() => router.push("/Home")}
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-6 mt-4"
      >
        Explore Shows
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Radio className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Podcast Episodes</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {loading ? "Loading..." : `${episodes.length} episodes`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Saved Episodes Section */}
      {savedEpisodes.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 bg-brand-500" />
            <h2 className="text-xl font-bold text-white">
              Your Saved Episodes
            </h2>
            <span className="text-zinc-400 text-sm">
              ({savedEpisodes.length})
            </span>
          </div>
          <div className="space-y-3">
            {savedEpisodes.map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        </div>
      )}

      {/* All Episodes Section */}
      <div className="space-y-4">
        {savedEpisodes.length > 0 && !loading && (
          <h2 className="text-xl font-bold text-white">Recommended Episodes</h2>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : episodes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {episodes.map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EpisodesPage;
