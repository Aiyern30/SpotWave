"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/";
import { Button } from "@/components/ui/";
import { Skeleton } from "@/components/ui/";
import { BookOpen, Heart, Search, Filter } from "lucide-react";
import {
  fetchAudiobooks,
  fetchUserSavedAudiobooks,
  fetchAudiobookRecommendations,
  fetchDiscoverAudiobooks,
  saveAudiobooksForUser,
  removeAudiobooksFromUser,
} from "@/utils/fetchAudiobooks";
import { useRouter } from "next/navigation";

type AudiobookProps = {
  id: string;
  name: string;
  authors: { name: string }[];
  images: { url: string }[];
  description: string;
  publisher: string;
  total_chapters: number;
};

const AudiobooksPage = () => {
  const [token, setToken] = useState<string>("");
  const [audiobooks, setAudiobooks] = useState<AudiobookProps[]>([]);
  const [recommendations, setRecommendations] = useState<AudiobookProps[]>([]);
  const [savedAudiobooks, setSavedAudiobooks] = useState<AudiobookProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleFetchAudiobooks = useCallback(async () => {
    setLoading(true);
    try {
      const [data, recData, savedData, discoverData] = await Promise.all([
        fetchAudiobooks(token, "best sellers", 20),
        fetchAudiobookRecommendations(token),
        fetchUserSavedAudiobooks(token),
        fetchDiscoverAudiobooks(token),
      ]);

      // Combine general and discovery results to ensure no empty state if possible
      const combinedDiscovery = [
        ...(data || []),
        ...(discoverData || []),
      ].filter(
        (book, index, self) =>
          book !== null && self.findIndex((b) => b?.id === book?.id) === index
      );

      setAudiobooks(combinedDiscovery);

      if (recData) {
        const filtered = recData.filter((book: any) => book !== null);
        setRecommendations(filtered);
      }

      if (savedData) {
        const saved = savedData.map((item: any) => item.audiobook);
        setSavedAudiobooks(saved);
        setSavedIds(new Set(saved.map((book: any) => book.id)));
      }
    } catch (error) {
      console.error("Error loading audiobooks:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleToggleSave = async (audiobookId: string) => {
    const isSaved = savedIds.has(audiobookId);

    if (isSaved) {
      const success = await removeAudiobooksFromUser(token, [audiobookId]);
      if (success) {
        setSavedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(audiobookId);
          return newSet;
        });
      }
    } else {
      const success = await saveAudiobooksForUser(token, [audiobookId]);
      if (success) {
        setSavedIds((prev) => new Set(prev).add(audiobookId));
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
      handleFetchAudiobooks();
    }
  }, [token, handleFetchAudiobooks]);

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="w-full aspect-square rounded-lg bg-zinc-800" />
          <Skeleton className="h-4 w-3/4 bg-zinc-800" />
          <Skeleton className="h-3 w-1/2 bg-zinc-800" />
        </div>
      ))}
    </div>
  );

  const AudiobookCard = ({ audiobook }: { audiobook: AudiobookProps }) => {
    const isSaved = savedIds.has(audiobook.id);

    return (
      <Card className="group relative bg-zinc-900/50 hover:bg-zinc-800/70 border border-zinc-800 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden">
        <div className="relative w-full aspect-square">
          <Image
            src={audiobook.images?.[0]?.url || "/default-audiobook.png"}
            alt={audiobook.name}
            fill
            className="object-cover rounded-t-lg"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSave(audiobook.id);
              }}
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            >
              <Heart
                className={`h-6 w-6 ${
                  isSaved ? "fill-red-500 text-red-500" : "text-white"
                }`}
              />
            </Button>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="text-white font-semibold text-sm truncate mb-1">
            {audiobook.name}
          </h3>
          <p className="text-zinc-400 text-xs truncate">
            {audiobook.authors?.[0]?.name || "Unknown Author"}
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            {audiobook.total_chapters} chapters
          </p>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-32 h-32 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
        <BookOpen className="h-16 w-16 text-zinc-600" />
      </div>
      <div className="text-center space-y-3 max-w-md">
        <h3 className="text-2xl font-semibold text-white">
          No Audiobooks Available
        </h3>
        <p className="text-zinc-400 text-base">
          We couldn't find any audiobooks at the moment. Check back later or
          explore other content.
        </p>
      </div>
      <Button
        onClick={() => router.push("/Home")}
        className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 py-6 mt-4"
      >
        Back to Home
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Audiobooks</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {loading
                ? "Loading..."
                : `${audiobooks.length} audiobooks available`}
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
          <Button
            variant="outline"
            size="icon"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Saved Audiobooks Section */}
      {savedAudiobooks.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold text-white">
              Your Saved Audiobooks
            </h2>
            <span className="text-zinc-400 text-sm">
              ({savedAudiobooks.length})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {savedAudiobooks.map((audiobook) => (
              <AudiobookCard key={audiobook.id} audiobook={audiobook} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-yellow-500/10">
              <BookOpen className="h-5 w-5 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Recommended for You
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {recommendations.slice(0, 6).map((audiobook) => (
              <AudiobookCard key={audiobook.id} audiobook={audiobook} />
            ))}
          </div>
        </div>
      )}

      {/* Recommended for You Section (Hero Style) */}
      {recommendations.length > 0 && !loading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-yellow-500/20 shadow-sm shadow-yellow-500/10">
                <BookOpen className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Recommended for You
                </h2>
                <p className="text-zinc-500 text-sm">
                  Hand-picked based on what's trending right now.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {recommendations.map((audiobook) => (
              <AudiobookCard key={audiobook.id} audiobook={audiobook} />
            ))}
          </div>
        </div>
      )}

      {/* Discover Section */}
      <div className="space-y-6 pt-4">
        {!loading && audiobooks.length > 0 && (
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Discover Audiobooks
            </h2>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : audiobooks.length === 0 && savedAudiobooks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {audiobooks.map((audiobook) => (
              <AudiobookCard key={audiobook.id} audiobook={audiobook} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudiobooksPage;
