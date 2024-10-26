"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { truncateText } from "@/components/truncateText";

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
import { IoMdAdd } from "react-icons/io"; // Import the icon

type PlaylistsProps = {
  id: string;
  image: string;
  title: string;
  description: string;
};

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  console.log("userId", userId);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
  const router = useRouter();

  const handleClick = (id: string, name: string) => {
    router.push(`/Home/${id}?name=${encodeURIComponent(name)}`);
  };

  const fetchUserProfile = useCallback(async () => {
    if (!token) {
      console.error("No token available");
      return;
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();

      console.log("User profile:", data);
      setUserId(data.id);
      console.log("User ID:", data.id);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [token]);

  const handleCreatePlaylist = async () => {
    console.log("trigger");
    console.log("userId", userId);
    const playlistName = "My New Playlist";
    if (!playlistName || !userId) return;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: playlistName,
            description: "New playlist created with the app.",
            public: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create playlist");
      }

      fetchSpotifyPlaylists();
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile();
    }
  }, [fetchUserProfile]);

  const fetchSpotifyPlaylists = useCallback(async () => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch playlists");
      }

      const data = await response.json();

      const formattedPlaylists = data.items.map((playlist: any) => ({
        id: playlist.id,
        image: playlist.images?.[0]?.url || "",
        title: playlist.name || "",
        description: playlist.description || "",
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
        className={`flex-1 transition-all ml-16 duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-4 ">
          <Header />
          <div className="flex flex-wrap gap-8">
            <Card
              className="group w-36 cursor-pointer text-white"
              onClick={handleCreatePlaylist}
            >
              <CardHeader>
                <Avatar className="w-36 h-36 relative p-1">
                  <AvatarFallback className="rounded-xl">
                    <IoMdAdd size={36} className="text-green-500" />
                  </AvatarFallback>
                </Avatar>
              </CardHeader>
            </Card>

            {memoizedPlaylists.map((data) => (
              <Card
                key={data.id}
                className="group w-36 cursor-pointer text-white"
                onClick={() => handleClick(data.id, data.title)}
              >
                <CardHeader>
                  <Avatar className="w-36 h-36 relative p-1">
                    <AvatarImage src={data.image} className="rounded-xl" />
                    <AvatarFallback className="text-center text-black">
                      New Playlists
                    </AvatarFallback>
                  </Avatar>
                </CardHeader>
                <CardTitle>{data.title}</CardTitle>
                <CardFooter className="text-sm">
                  {truncateText(data.description, 100)}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
