"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
} from "./ui";
import { Artist, RecentTracksProps, Track } from "@/lib/types";
import { usePlayer } from "@/contexts/PlayerContext";
import { fetchRecentlyPlayed } from "@/utils/Artist/fetchRecentlyPlayed";

const InQueueWindow = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTracksProps[]>([]);
  const router = useRouter();
  const { playTrack } = usePlayer();

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

  const handlePlayTrack = (track: Track) => {
    playTrack(track);
  };

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
                    <div className="flex items-center justify-between group">
                      <div className="relative mr-4">
                        <Avatar>
                          <AvatarImage
                            src={currentTrack?.album.images[2]?.url || ""}
                          />
                          <AvatarFallback className="text-black">
                            Album
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl hover:scale-110 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(currentTrack);
                            }}
                          >
                            <Play
                              className="h-4 w-4 ml-0.5"
                              fill="currentColor"
                            />
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div
                          className="font-bold cursor-pointer hover:underline"
                          onClick={() =>
                            router.push(`/Albums/${currentTrack.album.id}`)
                          }
                        >
                          {currentTrack.name}
                        </div>
                        <div>
                          {currentTrack.artists.map(
                            (artist: Artist, idx: number) => (
                              <React.Fragment key={artist.id}>
                                <span
                                  className="cursor-pointer hover:underline text-gray-700"
                                  onClick={() =>
                                    router.push(`/Artists/${artist.id}`)
                                  }
                                >
                                  {artist.name}
                                </span>
                                {idx < currentTrack.artists.length - 1 && ", "}
                              </React.Fragment>
                            )
                          )}
                        </div>
                        <div
                          className="text-gray-500 text-sm cursor-pointer hover:underline"
                          onClick={() =>
                            router.push(`/Albums/${currentTrack.album.id}`)
                          }
                        >
                          {currentTrack.album.name}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <h1>Next from: Your Library</h1>
                <div>
                  {queue.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center mt-2 group"
                    >
                      <div className="relative mr-4">
                        <Avatar>
                          <AvatarImage src={track.album.images[2]?.url || ""} />
                          <AvatarFallback className="text-black">
                            Album
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl hover:scale-110 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(track);
                            }}
                          >
                            <Play
                              className="h-4 w-4 ml-0.5"
                              fill="currentColor"
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div
                          className="font-bold cursor-pointer hover:underline"
                          onClick={() =>
                            router.push(`/Albums/${track.album.id}`)
                          }
                        >
                          {track.name}
                        </div>
                        <div>
                          {track.artists.map((artist: Artist, idx: number) => (
                            <React.Fragment key={artist.id}>
                              <span
                                className="cursor-pointer hover:underline text-gray-700"
                                onClick={() =>
                                  router.push(`/Artists/${artist.id}`)
                                }
                              >
                                {artist.name}
                              </span>
                              {idx < track.artists.length - 1 && ", "}
                            </React.Fragment>
                          ))}
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
                    <div key={index} className="flex items-center mt-2 group">
                      <div className="relative mr-4">
                        <Avatar>
                          <AvatarImage
                            src={track.track.album.images[2]?.url || ""}
                          />
                          <AvatarFallback className="text-black">
                            Album
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl hover:scale-110 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(track.track as Track);
                            }}
                          >
                            <Play
                              className="h-4 w-4 ml-0.5"
                              fill="currentColor"
                            />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div
                          className="font-bold cursor-pointer hover:underline"
                          onClick={() =>
                            router.push(`/Albums/${track.track.id}`)
                          }
                        >
                          {track.track.name}
                        </div>
                        <div>
                          {track.track.album.artists.map((artist, idx) => (
                            <React.Fragment key={artist.id || idx}>
                              <span
                                className="cursor-pointer hover:underline text-gray-700"
                                onClick={() =>
                                  router.push(`/Artists/${artist.id}`)
                                }
                              >
                                {artist.name}
                              </span>
                              {idx < track.track.album.artists.length - 1 &&
                                ", "}
                            </React.Fragment>
                          ))}
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
