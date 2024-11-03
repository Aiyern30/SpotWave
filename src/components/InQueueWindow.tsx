"use client";

import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
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
import { Artist } from "@/lib/types";

const InQueueWindow = () => {
  const [isOpen, setIsOpen] = useState(false); // State to track if the window is open
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null); // State for the current track

  const getToken = () => {
    return localStorage.getItem("Token"); // Get the access token from localStorage
  };

  const fetchQueue = useCallback(async () => {
    // Wrap in useCallback
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
  }, []); // No dependencies, fetchQueue won't change

  const fetchCurrentTrack = useCallback(async () => {
    // Wrap in useCallback
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
  }, []); // No dependencies, fetchCurrentTrack won't change

  useEffect(() => {
    if (isOpen) {
      fetchCurrentTrack();
      fetchQueue();
    }
  }, [isOpen, fetchCurrentTrack, fetchQueue]); // Now includes the functions

  return (
    <div
      className={`fixed bottom-4 right-4 ${
        isOpen ? "w-[500px] h-[500px]" : "w-[50px] h-[50px]"
      } bg-white shadow-lg rounded-md flex items-center justify-center`}
      style={{
        transition: "width 0.3s ease, height 0.3s ease", // Smooth transition for open/close
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
                className="overflow-y-auto h-[calc(100%-40px)]" // Updated height calculation
                style={{ maxHeight: "calc(100% - 40px)" }} // Ensure the height allows for scrolling
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
                <h1>Next from: Your Library</h1> {/* Change made here */}
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
              >
                Change your Recently played here.
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
