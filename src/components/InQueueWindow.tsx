"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui";
import { Artist, RecentTracksProps } from "@/lib/types"; // Import the RecentTracksProps type
import { fetchRecentlyPlayed } from "@/utils/Artist/fetchRecentlyPlayed";

const InQueueWindow = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTracksProps[]>([]); // Use RecentTracksProps

  const getToken = () => {
    return localStorage.getItem("Token");
  };

  const fetchQueue = useCallback(async () => {
    const accessToken = getToken();
    if (!accessToken) {
      console.error("No access token found.");
      return;
    }

    const response = await fetch("https://api.spotify.com/v1/me/player/queue", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setQueue(data.queue || []);
    } else {
      console.error("Failed to fetch queue", response);
    }
  }, []);

  const fetchCurrentTrack = useCallback(async () => {
    const accessToken = getToken();
    if (!accessToken) {
      console.error("No access token found.");
      return;
    }

    const response = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const text = await response.text();
      if (text) {
        const data = JSON.parse(text);
        if (data && data.item) {
          setCurrentTrack(data.item);
        } else {
          setCurrentTrack(null);
          console.log("No track currently playing.");
        }
      } else {
        setCurrentTrack(null);
        console.log("Response is empty, no track currently playing.");
      }
    } else {
      console.error("Failed to fetch current track", response);
    }
  }, []);

  const handleFetchRecentlyPlayed = useCallback(async () => {
    const accessToken = getToken();
    if (!accessToken) {
      console.error("No access token found.");
      return;
    }

    const tracks = await fetchRecentlyPlayed(accessToken);
    setRecentTracks(tracks); // Set the recently played tracks in state
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentTrack();
      fetchQueue();
      handleFetchRecentlyPlayed(); // Fetch recently played when the window is opened
    }
  }, [isOpen, fetchCurrentTrack, fetchQueue, handleFetchRecentlyPlayed]);

  return (
    <div
      className={`fixed bottom-4 right-4 ${
        isOpen
          ? "w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] "
          : "w-[50px] h-[50px]"
      } bg-white shadow-lg rounded-md flex items-center justify-center`}
      style={{
        transition: "width 0.3s ease, height 0.3s ease",
      }}
    >
      {isOpen ? (
        <div className="w-full h-full p-4 flex flex-col">
          <div className="flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiChevronDown size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="Queue" className="w-full h-full">
              <TabsList>
                <TabsTrigger value="Queue">Queue</TabsTrigger>
                <TabsTrigger value="Recently played">
                  Recently played
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="Queue"
                className="overflow-y-auto h-[calc(100%-40px)]"
                style={{ maxHeight: "calc(100% - 40px)" }}
              >
                {currentTrack && (
                  <>
                    <h1>Now Playing</h1>
                    <div className="flex items-center justify-between">
                      <Avatar className="mr-4">
                        <AvatarImage
                          src={currentTrack?.album.images[2]?.url || ""}
                        />
                        <AvatarFallback className="text-black">
                          Album
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="font-bold">{currentTrack.name}</div>
                        <div>
                          {currentTrack.artists
                            .map((artist: Artist) => artist.name)
                            .join(", ")}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {currentTrack.album.name}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <h1>Next from: Your Library</h1>
                <div>
                  {queue.map((track) => (
                    <div key={track.id} className="flex items-center mt-2">
                      <Avatar className="mr-4">
                        <AvatarImage src={track.album.images[2]?.url || ""} />
                        <AvatarFallback className="text-black">
                          Album
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-bold">{track.name}</div>
                        <div>
                          {track.artists
                            .map((artist: Artist) => artist.name)
                            .join(", ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent
                value="Recently played"
                className="overflow-y-auto h-[calc(100%-40px)]"
                style={{ maxHeight: "calc(100% - 40px)" }}
              >
                {recentTracks.length > 0 ? (
                  recentTracks.map((track, index) => (
                    <div key={index} className="flex items-center mt-2">
                      <Avatar className="mr-4">
                        <AvatarImage
                          src={track.track.album.images[2]?.url || ""}
                        />
                        <AvatarFallback className="text-black">
                          Album
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-bold">{track.track.name}</div>
                        <div>
                          {track.track.album.artists.map(
                            (artist) => artist.name
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>No recently played tracks available.</div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="text-gray-500">
          <FiChevronUp size={24} />
        </button>
      )}
    </div>
  );
};

export default InQueueWindow;
