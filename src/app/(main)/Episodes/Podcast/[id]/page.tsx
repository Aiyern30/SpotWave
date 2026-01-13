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
  checkUserFollowsShow,
  followShow,
  unfollowShow,
} from "@/utils/fetchEpisodes";
import { Button, Card, Skeleton, Badge } from "@/components/ui/";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/";
import {
  Play,
  Heart,
  Clock,
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Calendar,
  Music,
  Check,
  Plus,
  X,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { toast } from "sonner";

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const { playTrack } = usePlayer();

  const checkFollowStatus = useCallback(async () => {
    const token = localStorage.getItem("Token");
    if (!token || !id) return;
    const showId = Array.isArray(id) ? id[0] : id;
    const followed = await checkUserFollowsShow(token, showId);
    if (followed && followed.length > 0) {
      setIsFollowing(followed[0]);
    }
  }, [id]);

  const fetchPlaylists = useCallback(async () => {
    const token = localStorage.getItem("Token");
    if (!token) return;
    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/playlists?limit=50",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setUserPlaylists(data.items);
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  }, []);

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
    checkFollowStatus();
    fetchPlaylists();
  }, [loadData, checkFollowStatus, fetchPlaylists]);

  const handleToggleFollow = async () => {
    const token = localStorage.getItem("Token");
    if (!token || !show) return;

    if (isFollowing) {
      const success = await unfollowShow(token, show.id);
      if (success) {
        setIsFollowing(false);
        toast.success(`Stopped following ${show.name}`);
      }
    } else {
      const success = await followShow(token, show.id);
      if (success) {
        setIsFollowing(true);
        toast.success(`Following ${show.name}!`);
      }
    }
  };

  const handleShare = () => {
    if (!show) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleAddEpisodeToPlaylist = async (
    episodeId: string,
    playlistId: string,
    playlistName: string
  ) => {
    const token = localStorage.getItem("Token");
    if (!token) return;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [`spotify:episode:${episodeId}`] }),
        }
      );

      if (response.ok) {
        toast.success(`Episode added to ${playlistName}`);
      } else {
        toast.error("Failed to add episode to playlist");
      }
    } catch (error) {
      console.error("Error adding episode to playlist:", error);
      toast.error("An error occurred");
    }
  };

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
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand/30 via-zinc-800/50 to-zinc-900/90 backdrop-blur-sm border border-zinc-800/50 mb-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--brand-primary)/0.15),transparent_70%)]" />

        <div className="relative p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-end">
          <div className="relative w-64 h-64 flex-shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transition-transform duration-500 hover:scale-[1.02]">
            <Image
              src={show.images?.[0]?.url || "/default-episode.png"}
              alt={show.name}
              fill
              className="object-cover rounded-2xl ring-1 ring-white/10"
            />
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              {show.name}
            </h1>
            <Badge
              variant="secondary"
              className="bg-brand/20 text-brand border-brand/30 px-3 py-1 font-bold uppercase tracking-widest text-[10px]"
            >
              Podcast Show
            </Badge>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-zinc-400 font-medium pt-2">
              <span className="text-white hover:text-brand transition-colors cursor-pointer">
                {show.publisher}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              <span className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-brand" />
                {show.total_episodes} Episodes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-10 py-6 flex items-center gap-6">
        <Button
          onClick={handleToggleFollow}
          className={`${
            isFollowing
              ? "bg-zinc-800 text-white border border-zinc-700"
              : "bg-brand text-black"
          } font-bold h-12 px-8 rounded-full hover:scale-105 transition-all shadow-lg shadow-brand/20 border-none`}
        >
          {isFollowing ? (
            <>
              <Check className="mr-2 h-5 w-5" /> Following
            </>
          ) : (
            <>
              <Plus className="mr-2 h-5 w-5" /> Follow
            </>
          )}
        </Button>
        <Button
          onClick={handleShare}
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-brand text-black hover:bg-brand/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-brand/20 border-none"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-brand text-black hover:bg-brand/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-brand/20 border-none"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-zinc-900 border-zinc-800 w-48"
          >
            <DropdownMenuItem
              onClick={handleShare}
              className="text-white hover:bg-brand/10 cursor-pointer"
            >
              <Share2 className="mr-2 h-4 w-4" /> Share Show
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleToggleFollow}
              className="text-white hover:bg-brand/10 cursor-pointer"
            >
              {isFollowing ? (
                <>
                  <X className="mr-2 h-4 w-4" /> Unfollow
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" /> Follow
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                      <div className="flex items-center gap-2">
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

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-zinc-500 hover:text-white transition-colors p-1"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-zinc-900 border-zinc-800 w-56 p-1 py-1"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSave(e, episode.id);
                              }}
                              className="text-white hover:bg-brand/10 cursor-pointer"
                            >
                              <Heart
                                className={`mr-2 h-4 w-4 ${
                                  savedIds.has(episode.id)
                                    ? "text-brand fill-brand"
                                    : ""
                                }`}
                              />
                              {savedIds.has(episode.id)
                                ? "Remove from Your Episodes"
                                : "Save to Your Episodes"}
                            </DropdownMenuItem>

                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-white hover:bg-brand/10 cursor-pointer">
                                <Plus className="mr-2 h-4 w-4" /> Add to
                                Playlist
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="bg-zinc-900 border-zinc-800 max-h-64 overflow-y-auto w-56">
                                {userPlaylists.length > 0 ? (
                                  userPlaylists.map((pl) => (
                                    <DropdownMenuItem
                                      key={pl.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddEpisodeToPlaylist(
                                          episode.id,
                                          pl.id,
                                          pl.name
                                        );
                                      }}
                                      className="text-white hover:bg-brand/10 cursor-pointer"
                                    >
                                      {pl.name}
                                    </DropdownMenuItem>
                                  ))
                                ) : (
                                  <DropdownMenuItem
                                    disabled
                                    className="text-zinc-500"
                                  >
                                    No playlists found
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `https://open.spotify.com/episode/${episode.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Episode link copied!");
                              }}
                              className="text-white hover:bg-brand/10 cursor-pointer"
                            >
                              <Share2 className="mr-2 h-4 w-4" /> Share Episode
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
