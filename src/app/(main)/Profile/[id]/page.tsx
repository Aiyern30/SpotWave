"use client";

import { useParams } from "next/navigation";
import ProfileComponent from "../Profile";
import PublicLibrary from "../PublicLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { useEffect, useState } from "react";

const PublicProfilePage = () => {
  const params = useParams();
  const id = params.id as string;
  const [isMe, setIsMe] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
      fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id === id) setIsMe(true);
        })
        .catch(console.error);
    }
  }, [id]);

  return (
    <div className="space-y-6">
      <ProfileComponent userId={id} />

      <Tabs defaultValue="Public Playlists" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/50 p-1 rounded-lg">
          <TabsTrigger
            value="Public Playlists"
            className="data-[state=active]:bg-brand data-[state=active]:text-black text-zinc-400 hover:text-white transition-colors px-6 py-2 rounded-md font-medium"
          >
            {isMe ? "My Library" : "Public Playlists"}
          </TabsTrigger>
          {isMe && (
            <TabsTrigger
              value="Following Artists"
              className="data-[state=active]:bg-brand data-[state=active]:text-black text-zinc-400 hover:text-white transition-colors px-6 py-2 rounded-md font-medium"
            >
              Following Artists
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="Public Playlists" className="mt-6">
          <PublicLibrary userId={id} />
        </TabsContent>

        {isMe && (
          <TabsContent value="Following Artists" className="mt-6">
            {/* We could import FollowingArtists here if needed, but for now we focus on the public view */}
            <p className="text-zinc-400">
              Your followed artists are only visible to you.
            </p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default PublicProfilePage;
