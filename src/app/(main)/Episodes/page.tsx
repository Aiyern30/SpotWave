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
  fetchDiscoverPodcasts,
  fetchShowEpisodes,
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
  const [localShows, setLocalShows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMarket, setSelectedMarket] = useState<string>("MY");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const markets = [
    { code: "MY", name: "Malaysia", flag: "🇲🇾" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  ];

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const handleFetchEpisodes = useCallback(async (market: string) => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem("Token");
      if (!storedToken) return;

      // 1. Fetch Discovery Shows for selected market
      const shows = await fetchDiscoverPodcasts(storedToken, market);
      setLocalShows(shows);

      // 2. Fetch Episodes from the first few local shows
      let allEpisodes: EpisodeProps[] = [];
      if (shows.length > 0) {
        const topShows = shows.slice(0, 3);
        const episodePromises = topShows.map((show: any) =>
          fetchShowEpisodes(storedToken, show.id, market)
        );
        const episodesResults = await Promise.all(episodePromises);
        allEpisodes = episodesResults.flat().slice(0, 15);
      }
      setEpisodes(allEpisodes);

      // 3. Fetch User Saved Episodes (Saved episodes are global)
      const savedData = await fetchUserSavedEpisodes(storedToken);
      if (savedData) {
        const saved = savedData.map((item: any) => item.episode);
        setSavedEpisodes(saved);
        setSavedIds(new Set(saved.map((episode: any) => episode.id)));
      }
    } catch (error) {
      console.error("Error loading podcast content:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      handleFetchEpisodes(selectedMarket);
    }
  }, [token, selectedMarket, handleFetchEpisodes]);

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
                className="h-12 w-12 rounded-full bg-brand hover:bg-brand"
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
                    isSaved ? "fill-green-500 bg-brand" : "text-zinc-400"
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
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      {/* Header & Market Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand/20 flex items-center justify-center shadow-lg shadow-brand/5">
            <Radio className="h-7 w-7 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Podcast Discovery
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Explore trending shows and episodes from around the world.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800">
          {markets.map((m) => (
            <button
              key={m.code}
              onClick={() => setSelectedMarket(m.code)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                selectedMarket === m.code
                  ? "bg-brand text-black shadow-[0_0_20px_rgba(30,215,96,0.3)]"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span>{m.flag}</span>
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Local Malaysian Shows Section */}
          {localShows.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-brand rounded-full" />
                  <h2 className="text-2xl font-bold text-white">
                    Trending in{" "}
                    {markets.find((m) => m.code === selectedMarket)?.name}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {localShows.map((show) => (
                  <Card
                    key={show.id}
                    onClick={() => router.push(`/Episodes/Podcast/${show.id}`)}
                    className="group bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="p-4 space-y-4">
                      <div className="relative aspect-square rounded-xl overflow-hidden shadow-2xl">
                        <Image
                          src={show.images?.[0]?.url || "/default-episode.png"}
                          alt={show.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-white font-semibold text-sm truncate group-hover:text-brand transition-colors">
                          {show.name}
                        </h3>
                        <p className="text-zinc-500 text-xs truncate">
                          {show.publisher}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Saved Episodes Section */}
          {savedEpisodes.length > 0 && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2 px-1">
                <Heart className="h-6 w-6 text-brand fill-brand" />
                <h2 className="text-2xl font-bold text-white">
                  Your Saved Episodes
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {savedEpisodes.map((episode) => (
                  <EpisodeCard key={episode.id} episode={episode} />
                ))}
              </div>
            </div>
          )}

          {/* Trending Episodes Section */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-2 px-1">
              <Clock className="h-6 w-6 text-zinc-400" />
              <h2 className="text-2xl font-bold text-white">
                Featured {markets.find((m) => m.code === selectedMarket)?.name}{" "}
                Episodes
              </h2>
            </div>
            {episodes.length === 0 && savedEpisodes.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {episodes.map((episode) => (
                  <EpisodeCard key={episode.id} episode={episode} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EpisodesPage;
