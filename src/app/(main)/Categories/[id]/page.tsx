"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  Music,
  Radio,
  ArrowLeft,
  Play,
  Pause,
  Clock,
  MoreHorizontal,
  Disc,
  LayoutGrid,
} from "lucide-react";
import { fetchCategory, fetchCategorySearch } from "@/utils/fetchCategories";
import { usePlayer } from "@/contexts/PlayerContext";
import { formatSongDuration } from "@/utils/function";

export default function CategoryDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id as string;
  const nameFromUrl = searchParams.get("name") ?? "";

  const [token, setToken] = useState("");
  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    currentTrack,
    isPlaying,
    playPlaylist,
  } = usePlayer();

  useEffect(() => {
    const stored = localStorage.getItem("Token");
    if (stored) setToken(stored);
  }, []);

  const loadData = useCallback(async () => {
    if (!token || !id) return;

    try {
      setLoading(true);
      setError("");

      // Step 1: Get category details (for the visual icon/name)
      // Step 2: Use search for the content (hybrid fix)
      const [categoryRes, searchRes] = await Promise.all([
        fetchCategory(token, id),
        fetchCategorySearch(token, nameFromUrl || id),
      ]);

      setCategoryInfo(categoryRes);
      setTracks((searchRes.tracks || []).filter((t: any) => t !== null));
      setPlaylists((searchRes.playlists || []).filter((p: any) => p !== null));
      setAlbums((searchRes.albums || []).filter((a: any) => a !== null));
    } catch (e: any) {
      console.error("Error loading category hybrid data:", e);
      setError("Failed to load category content. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, id, nameFromUrl]);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const handlePlayPauseTrack = (track: any) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pauseTrack() : resumeTrack();
    } else {
      playTrack({
        id: track.id,
        name: track.name,
        artists: track.artists,
        album: {
          name: track.album.name,
          images: track.album.images,
          id: track.album.id,
          artists: track.artists,
          release_date: track.album.release_date,
          total_tracks: track.album.total_tracks,
        },
        duration_ms: track.duration_ms,
        explicit: track.explicit,
        external_urls: track.external_urls,
        popularity: track.popularity,
        preview_url: track.preview_url,
        track_number: track.track_number,
        disc_number: track.disc_number,
        uri: track.uri,
      });
    }
  };

  const isTrackPlaying = (trackId: string) =>
    currentTrack?.id === trackId && isPlaying;

  const LoadingSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Skeleton className="w-48 h-48 rounded-lg bg-zinc-800" />
        <div className="space-y-4 flex-1 w-full text-center sm:text-left">
          <Skeleton className="h-4 w-24 bg-zinc-800 mx-auto sm:mx-0" />
          <Skeleton className="h-12 w-3/4 bg-zinc-800 mx-auto sm:mx-0" />
          <Skeleton className="h-4 w-1/3 bg-zinc-800 mx-auto sm:mx-0" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-zinc-800" />
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-16 w-full bg-zinc-800/50" />
          ))}
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Radio className="h-16 w-16 text-zinc-700 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{error}</h3>
        <Button
          onClick={loadData}
          className="bg-brand hover:bg-brand/80 text-brand-foreground"
        >
          Try Again
        </Button>
      </div>
    );

  const displayName = categoryInfo?.name || nameFromUrl || "Category";

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/Categories")}
        className="text-zinc-400 hover:text-white hover:bg-zinc-800 -ml-2 transition-all"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Categories
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 bg-gradient-to-b from-zinc-800/10 to-transparent p-4 rounded-xl border border-white/5">
        {categoryInfo?.icons?.[0]?.url && (
          <div className="relative w-48 h-48 rounded-lg overflow-hidden shadow-2xl flex-shrink-0 group">
            <Image
              src={categoryInfo.icons[0].url}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              priority
            />
          </div>
        )}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-brand" />
            <span className="text-xs font-bold text-brand uppercase tracking-widest">
              Category
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-none">
            {displayName}
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base font-medium mt-2">
            Explore the best of {displayName.toLowerCase()} across tracks,
            albums, and playlists.
          </p>
        </div>
      </div>

      {/* Popular Tracks Section */}
      {tracks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Music className="h-5 w-5 text-brand" />
            Top Tracks
          </h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="w-12 text-center text-zinc-500">
                    #
                  </TableHead>
                  <TableHead className="text-zinc-500 w-[50%] sm:w-[60%]">
                    Title
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-zinc-500 w-[30%]">
                    Album
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-right text-zinc-500 w-20">
                    <Clock className="h-4 w-4 ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tracks.slice(0, 10).map((track, index) => {
                  const isPlayingThis = isTrackPlaying(track.id);
                  const isHovered = hoveredTrackId === track.id;

                  return (
                    <TableRow
                      key={track.id}
                      className="border-zinc-800/30 hover:bg-zinc-800/30 transition-all cursor-pointer group"
                      onClick={() => handlePlayPauseTrack(track)}
                      onMouseEnter={() => setHoveredTrackId(track.id)}
                      onMouseLeave={() => setHoveredTrackId(null)}
                    >
                      <TableCell className="text-center py-4">
                        {isHovered ? (
                          <div className="flex justify-center">
                            {isPlayingThis ? (
                              <Pause
                                className="w-4 h-4 text-brand"
                                fill="currentColor"
                              />
                            ) : (
                              <Play
                                className="w-4 h-4 text-white ml-0.5"
                                fill="currentColor"
                              />
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-sm ${
                              isPlayingThis ? "text-brand" : "text-zinc-500"
                            }`}
                          >
                            {index + 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 max-w-0">
                        <div className="flex items-center gap-3">
                          <Image
                            src={
                              track.album?.images?.[0]?.url ||
                              "/placeholder.svg"
                            }
                            width={40}
                            height={40}
                            className="rounded object-cover"
                            alt={track.name}
                          />
                          <div className="min-w-0">
                            <div
                              className={`font-bold truncate ${
                                isPlayingThis ? "text-brand" : "text-white"
                              }`}
                            >
                              {track.name}
                            </div>
                            <div className="text-zinc-400 text-xs truncate">
                              {track.artists.map((a: any) => a.name).join(", ")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-zinc-400 text-sm truncate max-w-[200px]">
                        {track.album.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-zinc-400 text-sm">
                        {formatSongDuration(track.duration_ms)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Featured Playlists Section */}
      {playlists.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-500" />
              Featured Playlists
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
            {playlists.slice(0, 16).map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                id={playlist.id}
                image={playlist.images?.[0]?.url || "/placeholder.svg"}
                title={playlist.name}
                description={
                  playlist.description?.replace(/<[^>]*>?/gm, "") ||
                  `By ${playlist.owner?.display_name}`
                }
                badge={`${playlist.tracks?.total || 0} tracks`}
                onClick={(id) =>
                  router.push(
                    `/Playlists/${id}?name=${encodeURIComponent(playlist.name)}`
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Related Albums Section */}
      {albums.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Disc className="h-5 w-5 text-purple-500" />
            Popular Albums
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
            {albums.slice(0, 16).map((album) => (
              <PlaylistCard
                key={album.id}
                id={album.id}
                image={album.images?.[0]?.url || "/placeholder.svg"}
                title={album.name}
                description={album.artists.map((a: any) => a.name).join(", ")}
                badge={album.album_type}
                onClick={(id) =>
                  router.push(
                    `/Albums/${id}?name=${encodeURIComponent(album.name)}`
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      {tracks.length === 0 && playlists.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <Radio className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg">No content found for this category.</p>
          <Button
            variant="link"
            onClick={() => router.push("/Categories")}
            className="text-brand mt-2"
          >
            Explore other categories
          </Button>
        </div>
      )}
    </div>
  );
}
