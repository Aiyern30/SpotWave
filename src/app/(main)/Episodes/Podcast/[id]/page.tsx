"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  fetchShowDetails,
  fetchShowEpisodes,
  saveEpisodesForUser,
  removeEpisodesFromUser,
  checkUserSavedEpisodes,
} from "@/utils/fetchEpisodes";
import { Button } from "@/components/ui/";
import { Card } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import {
  Play,
  Heart,
  Clock,
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

interface ShowDetails {
  id: string;
  name: string;
  publisher: string;
  description: string;
  images: { url: string }[];
  total_episodes: number;
}

interface Episode {
  id: string;
  name: string;
  description: string;
  duration_ms: number;
  release_date: string;
  images: { url: string }[];
}

const PodcastDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [show, setShow] = useState<ShowDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const { playTrack } = usePlayer();

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("Token");
    if (!token || !id) return;

    setLoading(true);
    try {
      const showId = Array.isArray(id) ? id[0] : id;
      const [showData, episodeData] = await Promise.all([
        fetchShowDetails(token, showId),
        fetchShowEpisodes(token, showId),
      ]);

      if (showData) setShow(showData);
      if (episodeData) setEpisodes(episodeData);

      // Check saved status for the first few episodes
      if (episodeData.length > 0) {
        const idsToCheck = episodeData.slice(0, 50).map((e: any) => e.id);
        const savedStatus = await checkUserSavedEpisodes(token, idsToCheck);
        const newSavedIds = new Set<string>();
        savedStatus.forEach((isSaved: boolean, index: number) => {
          if (isSaved) newSavedIds.add(idsToCheck[index]);
        });
        setSavedIds(newSavedIds);
      }
    } catch (error) {
      console.error("Error loading podcast details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const handleToggleSave = async (e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation();
    const token = localStorage.getItem("Token");
    if (!token) return;

    const isSaved = savedIds.has(episodeId);
    if (isSaved) {
      const success = await removeEpisodesFromUser(token, [episodeId]);
      if (success) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(episodeId);
          return next;
        });
      }
    } else {
      const success = await saveEpisodesForUser(token, [episodeId]);
      if (success) {
        setSavedIds((prev) => new Set(prev).add(episodeId));
      }
    }
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (!show) return;
    // Mapping episode to the format expected by playTrack
    playTrack({
      id: episode.id,
      name: episode.name,
      artists: [{ name: show.publisher || show.name, id: show.id }],
      album: {
        name: show.name,
        images: episode.images || show.images || [],
        id: show.id,
        artists: [{ name: show.publisher, id: show.id }],
        release_date: episode.release_date,
        total_tracks: show.total_episodes,
      },
      duration_ms: episode.duration_ms,
      explicit: false,
      external_urls: {
        spotify: `https://open.spotify.com/episode/${episode.id}`,
      },
      popularity: 0,
      track_number: 0,
      disc_number: 0,
      uri: `spotify:episode:${episode.id}`,
    });
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8 items-end">
          <Skeleton className="w-64 h-64 rounded-2xl bg-zinc-800" />
          <div className="space-y-4 flex-1">
            <Skeleton className="h-4 w-24 bg-zinc-800" />
            <Skeleton className="h-12 w-3/4 bg-zinc-800" />
            <Skeleton className="h-6 w-1/2 bg-zinc-800" />
          </div>
        </div>
        <div className="space-y-4 pt-8">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!show) return <div className="p-8 text-white">Podcast not found.</div>;

  return (
    <div className="min-h-screen pb-20">
      {/* Header Section */}
      <div className="relative p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-end bg-gradient-to-b from-zinc-800/50 to-transparent">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="absolute top-6 left-6 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Back
        </Button>

        <div className="relative w-64 h-64 flex-shrink-0 shadow-2xl group transition-transform duration-500 hover:scale-[1.02]">
          <Image
            src={show.images?.[0]?.url || "/default-episode.png"}
            alt={show.name}
            fill
            className="object-cover rounded-2xl"
          />
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left">
          <span className="text-brand font-bold uppercase tracking-widest text-xs">
            Podcast Show
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            {show.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-zinc-400 font-medium">
            <span className="text-white">{show.publisher}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            <span>{show.total_episodes} Episodes</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-10 py-6 flex items-center gap-6">
        <Button className="bg-brand text-black font-bold h-14 px-8 rounded-full hover:scale-105 transition-transform shadow-lg shadow-brand/20">
          <Play className="mr-2 h-6 w-6 fill-black" /> Follow
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-6 md:px-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Episodes List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">Episodes</h2>
          <div className="space-y-4">
            {episodes.map((episode) => (
              <Card
                key={episode.id}
                onClick={() => handlePlayEpisode(episode)}
                className="group bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-800/40 transition-all duration-300 p-4 md:p-6 cursor-pointer rounded-2xl border-0 overflow-hidden relative"
              >
                <div className="flex gap-6">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                    <Image
                      src={episode.images?.[0]?.url || show.images[0].url}
                      alt={episode.name}
                      fill
                      className="object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-6 h-6 text-black fill-black ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="text-white font-bold text-lg leading-tight group-hover:text-brand transition-colors line-clamp-1">
                        {episode.name}
                      </h3>
                      <button
                        onClick={(e) => handleToggleSave(e, episode.id)}
                        className="text-zinc-500 hover:text-brand transition-colors"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            savedIds.has(episode.id)
                              ? "text-brand fill-brand"
                              : ""
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed">
                      {episode.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 pt-2">
                      <div className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(episode.release_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDuration(episode.duration_ms)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white">About</h3>
            <p
              className="text-zinc-400 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: show.description }}
            ></p>
            <div className="pt-4 border-t border-zinc-800">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Publisher
              </span>
              <p className="text-white font-semibold mt-1">{show.publisher}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastDetailPage;
