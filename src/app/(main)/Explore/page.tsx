"use client";

import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Button, // Add Button for Expand/Collapse
} from "@/components/ui";
import { useRouter } from "next/navigation";
import { Artist, RecentTracksProps } from "@/lib/types";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import { fetchFavoriteArtists } from "@/utils/Artist/fetchFavoriteArtists";
import { fetchRecentlyPlayed } from "@/utils/Artist/fetchRecentlyPlayed";

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [recentTracks, setRecentTracks] = useState<RecentTracksProps[]>([]);
  const router = useRouter();

  // Track which accordion items are open
  const [openAccordions, setOpenAccordions] = useState<string[]>([
    "item-1",
    "item-2",
    "item-3",
  ]);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        const [followed, favorite, recent] = await Promise.all([
          fetchFollowedArtists(token),
          fetchFavoriteArtists(token),
          fetchRecentlyPlayed(token),
        ]);
        setFollowedArtists(followed);
        setFavoriteArtists(favorite);
        setRecentTracks(recent);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [token]);

  const memoizedFollowedArtists = useMemo(
    () => followedArtists,
    [followedArtists]
  );
  const memoizedFavoriteArtists = useMemo(
    () => favoriteArtists,
    [favoriteArtists]
  );
  const memoizedRecentTracks = useMemo(() => recentTracks, [recentTracks]);

  // Check if all accordions are open
  const allOpen = openAccordions.length === 3;

  // Toggle Expand/Collapse All
  const handleToggleAll = () => {
    if (allOpen) {
      setOpenAccordions([]); // Close all
    } else {
      setOpenAccordions(["item-1", "item-2", "item-3"]); // Open all
    }
  };

  return (
    <div className="flex h-screen">
      {token && (
        <>
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen((prev) => !prev)}
          />
          <div
            className={`flex-1 transition-all ml-16 duration-300 ${
              sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
            }`}
          >
            <div className="p-4 space-y-4">
              <Header />

              <div className="flex justify-end mb-4">
                <Button onClick={handleToggleAll}>
                  {allOpen ? "Collapse All" : "Expand All"}
                </Button>
              </div>

              <Accordion
                type="multiple"
                className="w-full space-y-3"
                value={openAccordions}
                onValueChange={setOpenAccordions}
              >
                {/* Followed Artists */}
                <AccordionItem value="item-1">
                  <AccordionTrigger>Your Followed Artists</AccordionTrigger>
                  <AccordionContent className="text-white p-4">
                    <div className="flex flex-wrap gap-8">
                      {memoizedFollowedArtists.map((artist) => (
                        <Card
                          key={artist.id}
                          className="group w-36 cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/Artists/${artist.id}?name=${encodeURIComponent(
                                artist.name
                              )}`
                            )
                          }
                        >
                          <CardHeader>
                            <Avatar className="w-36 h-36 relative p-1">
                              <AvatarImage
                                src={artist.image}
                                className="rounded-xl"
                              />
                              <AvatarFallback className="text-black">
                                {artist.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </CardHeader>
                          <CardTitle>{artist.name}</CardTitle>
                          <CardContent>{artist.genres.join(", ")}</CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Favorite Artists */}
                <AccordionItem value="item-2">
                  <AccordionTrigger>Your Favorite Artists</AccordionTrigger>
                  <AccordionContent className="text-white p-4">
                    <div className="flex flex-wrap gap-8">
                      {memoizedFavoriteArtists.map((artist) => (
                        <Card
                          key={artist.id}
                          className="group w-36 cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/Artists/${artist.id}?name=${encodeURIComponent(
                                artist.name
                              )}`
                            )
                          }
                        >
                          <CardHeader>
                            <Avatar className="w-36 h-36 relative p-1">
                              <AvatarImage
                                src={artist.image}
                                className="rounded-xl"
                              />
                              <AvatarFallback className="text-black">
                                {artist.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </CardHeader>
                          <CardTitle>{artist.name}</CardTitle>
                          <CardContent>{artist.genres.join(", ")}</CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Recently Played Tracks */}
                <AccordionItem value="item-3">
                  <AccordionTrigger>Your Recently Listening</AccordionTrigger>
                  <AccordionContent className="text-white p-4">
                    <div className="flex flex-wrap gap-8">
                      {memoizedRecentTracks.map((tracks, index) => (
                        <Card
                          key={`${index}`}
                          className="group w-36 cursor-pointer"
                        >
                          <CardHeader>
                            <Avatar className="w-36 h-36 relative p-1">
                              <AvatarImage
                                src={tracks.track.album.images[0].url}
                                className="rounded-xl"
                              />
                              <AvatarFallback className="text-black">
                                {tracks.track.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </CardHeader>
                          <CardTitle>{tracks.track.name}</CardTitle>
                          <CardContent>
                            {tracks.track.album.artists.map(
                              (artist) => artist.name
                            )}
                          </CardContent>
                          <CardFooter>
                            {tracks.track.album.release_date}
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Page;
