"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { truncateText } from "@/components/truncateText";
import Sidebar from "@/components/Sidebar";
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
import { IoMdAdd } from "react-icons/io";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { CreatePlaylist } from "@/utils/createPlaylist";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";

type PlaylistsProps = {
  id: string;
  image: string;
  title: string;
  description: string;
};

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [userID, setUserID] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
  const router = useRouter();

  const handleClick = (id: string, name: string) => {
    router.push(`/Home/${id}?name=${encodeURIComponent(name)}`);
  };

  const handleFetchUserProfile = useCallback(async () => {
    const UserProfile = await fetchUserProfile(token);
    if (UserProfile) {
      setUserID(UserProfile.id);
    }
  }, [token]);

  const handleFetchAllProfilePlaylist = useCallback(async () => {
    const data = await fetchSpotifyPlaylists(token);
    if (data) {
      const formattedPlaylists = data.map((playlist: any) => ({
        id: playlist?.id,
        image: playlist?.images?.[0]?.url || "",
        title: playlist?.name || "",
        description: playlist?.description || "",
      }));

      setPlaylists(formattedPlaylists);
    }
  }, [token]);

  const handleCreatePlaylist = async () => {
    const playlistResponse = await CreatePlaylist(userID, token);
    if (playlistResponse) {
      handleFetchAllProfilePlaylist();
    } else {
      console.log("Playlist creation failed.");
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
      handleFetchUserProfile();
    }
  }, [handleFetchUserProfile]);

  useEffect(() => {
    if (token && playlists.length === 0) {
      handleFetchAllProfilePlaylist();
    }
  }, [token, handleFetchAllProfilePlaylist, playlists.length]);

  const memoizedPlaylists = useMemo(() => playlists, [playlists]);

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
                  <AvatarFallback className="rounded-xl text-black">
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
