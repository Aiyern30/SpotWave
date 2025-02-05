"use client";
import ReactPlayer from "react-player";

import Sidebar from "@/components/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Skeleton,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui";
import Header from "@/components/Header";
import { Track } from "@/lib/types";
import { formatLyrics } from "@/utils/function";

const SongPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [lyrics, setLyrics] = useState<string | null>(null);
  console.log("lyrics", lyrics);
  const id = pathname.split("/").pop() || "";

  const fetchLyrics = async (artist: string, title: string) => {
    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${artist}/${title}`
      );
      const data = await response.json();

      if (data.lyrics && data.lyrics.trim()) {
        setLyrics(data.lyrics);
      } else {
        setLyrics("Lyrics not found");
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      setLyrics("Lyrics not found");
    }
  };

  const fetchTrackDetails = useCallback(async () => {
    const token = localStorage.getItem("Token");

    if (!token) {
      console.error("Spotify API token not found");
      return;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setTrack(data);
    } catch (error) {
      console.error("Error fetching track details from Spotify:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrackDetails();
  }, [fetchTrackDetails]);

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen((prev) => !prev)}
        />
        <div
          className={`flex-1 transition-all ml-16 duration-300 text-white ${
            sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
          }`}
        >
          <div className="p-4 space-y-4">
            <Header />
            <div className="text-center">
              <Skeleton className="w-60 h-60 mx-auto rounded-full" />
              <Skeleton className="mt-4 w-1/2 h-8 mx-auto" />
              <Skeleton className="mt-2 w-1/3 h-6 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 text-white ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-4 overflow-auto">
          <Header />
          {track && (
            <div className="flex flex-col items-center space-y-4">
              <Avatar>
                <AvatarImage
                  src={track.album?.images[0]?.url || "/default-artist.png"}
                  className="w-48 h-48 rounded-full object-cover"
                />
                <AvatarFallback className="text-black">
                  {track.name}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-4xl font-bold">{track.name}</h1>
              <div className="text-xl">
                <a
                  href={track.external_urls?.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  <Button>View on Spotify</Button>
                </a>
              </div>
              <div className="text-lg">
                <div
                  className="hover:underline cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/Albums/${track.album.id}?name=${track.album.name}`
                    )
                  }
                >
                  {track.album?.name}
                </div>
              </div>
              <div>Popularity: {track.popularity}</div>
              <Sheet>
                <SheetTrigger>
                  <Button
                    onClick={() =>
                      fetchLyrics(track.album.artists[0].name, track.album.name)
                    }
                  >
                    View Lyrics
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Lyrics</SheetTitle>
                    <SheetDescription className="h-[90vh] overflow-auto">
                      {formatLyrics(lyrics)}
                    </SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>

              {track.preview_url ? (
                <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden">
                  <ReactPlayer
                    url={track.preview_url}
                    controls
                    playing={false}
                    width="100%"
                    height="50px"
                    className=""
                  />
                </div>
              ) : (
                <p>No preview available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongPage;
