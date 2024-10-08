"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "@/app/Sidebar";
import Header from "@/components/Header";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useRouter } from "next/navigation";

type PlaylistsProps = {
  id: string;
  image: string;
  title: string;
  description: string;
};

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
  const router = useRouter();

  const handleClick = (id: string, name: string) => {
    router.push(`/Home/${id}?name=${encodeURIComponent(name)}`);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchSpotifyPlaylists = useCallback(async () => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      const formattedPlaylists = data.items.map((playlist: any) => ({
        id: playlist.id,
        image: playlist.images[0]?.url || "",
        title: playlist.name,
        description: playlist.description,
      }));
      setPlaylists(formattedPlaylists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  }, [token]);

  const memoizedPlaylists = useMemo(() => playlists, [playlists]);

  useEffect(() => {
    if (token && playlists.length === 0) {
      fetchSpotifyPlaylists();
    }
  }, [token, fetchSpotifyPlaylists, playlists.length]);

  return (
    <div className="flex h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1  transition-all ml-16 duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-4 ">
          <Header />
          <div className="flex flex-wrap gap-8">
            {memoizedPlaylists.map((data) => (
              <Card
                key={data.id}
                className="group w-36 cursor-pointer text-white"
                onClick={() => handleClick(data.id, data.title)}
              >
                <CardHeader>
                  <Avatar className="w-36 h-36 relative p-1">
                    <AvatarImage src={data.image} className="rounded-xl" />
                    <AvatarFallback>{data.image}</AvatarFallback>
                  </Avatar>
                </CardHeader>
                <CardTitle>{data.title}</CardTitle>
                <CardFooter className="text-sm">{data.description}</CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
