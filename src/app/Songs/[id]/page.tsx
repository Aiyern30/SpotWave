"use client";
import ReactPlayer from "react-player";

import Sidebar from "@/app/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Skeleton,
  Button,
} from "@/components/ui";
import Header from "@/components/Header";
interface Image {
  url: string;
}
interface TrackProps {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  release_date: string;
  external_urls: {
    spotify: string;
  };
  popularity: string;

  album: {
    id: string;
    name: string;
    images: Image[];
    artists: {
      id: string;
      name: string;
    }[];
    external_urls: {
      spotify: string;
    };
  };
}
const SongPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [track, setTrack] = useState<TrackProps | null>(null);
  console.log("track", track);
  const [loading, setLoading] = useState<boolean>(true);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = pathname.split("/").pop() || "";

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
                <AvatarFallback>{track.name}</AvatarFallback>
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

const formatDuration = (durationMs: number | undefined) => {
  if (durationMs === undefined || durationMs === 0) return "00:00";

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

export default SongPage;
