"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, Skeleton, Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Disc3, Heart, Play, Pause } from "lucide-react";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { usePlayer } from "@/contexts/PlayerContext";

const SavedAlbums = () => {
  const router = useRouter();
  const { playPlaylist, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();
  const [savedAlbums, setSavedAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchSavedAlbums = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        "https://api.spotify.com/v1/me/albums?limit=50",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSavedAlbums(data.items);
      }
    } catch (error) {
      console.error("Error fetching saved albums:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchSavedAlbums();
    }
  }, [token, fetchSavedAlbums]);

  const handlePlayAlbum = (albumId: string) => {
    const albumUri = `spotify:album:${albumId}`;
    playPlaylist(albumUri);
  };

  const handleAlbumClick = (id: string, name: string) => {
    router.push(`/Albums/${id}?name=${encodeURIComponent(name)}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array(12)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-xl bg-zinc-800/50" />
              <Skeleton className="h-4 w-3/4 bg-zinc-800/50" />
              <Skeleton className="h-4 w-1/2 bg-zinc-800/50" />
            </div>
          ))}
      </div>
    );
  }

  if (savedAlbums.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
          <Disc3 className="h-12 w-12 text-zinc-600" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">No saved albums</h3>
          <p className="text-zinc-400">Your saved albums will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {savedAlbums.map((item) => {
        const { album } = item;
        const isCurrentAlbum = currentTrack?.uri?.includes(album.id);

        return (
          <PlaylistCard
            key={album.id}
            id={album.id}
            image={album.images[0]?.url || "/default-artist.png"}
            title={album.name}
            description={album.artists.map((a: any) => a.name).join(", ")}
            isPlaying={isCurrentAlbum && isPlaying}
            isPaused={isCurrentAlbum && !isPlaying}
            onPlay={() => handlePlayAlbum(album.id)}
            onPause={pauseTrack}
            onResume={resumeTrack}
            onClick={handleAlbumClick}
          />
        );
      })}
    </div>
  );
};

export default SavedAlbums;
