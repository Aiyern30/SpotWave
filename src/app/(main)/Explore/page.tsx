"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import PlaylistCard from "@/components/PlaylistCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
} from "@/components/ui";
import { useRouter } from "next/navigation";
import { Play, Music, Users, Clock } from "lucide-react";
import type { Artist, RecentTracksProps } from "@/lib/types";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import { fetchFavoriteArtists } from "@/utils/Artist/fetchFavoriteArtists";
import { fetchRecentlyPlayed } from "@/utils/Artist/fetchRecentlyPlayed";
import { usePlayer } from "@/contexts/PlayerContext";

const Page = () => {
  const [token, setToken] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [recentTracks, setRecentTracks] = useState<RecentTracksProps[]>([]);
  const router = useRouter();
  const { playTrack } = usePlayer();

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

  // Handler to play artist's top tracks
  const handlePlayArtist = async (artistId: string) => {
    try {
      // Fetch artist's top tracks
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch artist's top tracks");
        return;
      }

      const data = await response.json();
      const topTracks = data.tracks;

      if (topTracks && topTracks.length > 0) {
        // Play the first top track
        const track = topTracks[0];
        playTrack({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
          uri: track.uri,
          preview_url: track.preview_url || null,
        });
      }
    } catch (error) {
      console.error("Error playing artist:", error);
    }
  };

  // Handler to play a track
  const handlePlayTrack = (track: RecentTracksProps["track"]) => {
    try {
      playTrack({
        id: track.id,
        name: track.name,
        artists: track.album.artists,
        album: track.album,
        duration_ms: track.duration_ms,
        uri: track.uri,
        preview_url: track.preview_url || null,
      });
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  // Empty State Component
  const EmptyState = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: any;
    title: string;
    description: string;
  }) => (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center">
        <Icon className="h-12 w-12 text-zinc-600" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-zinc-400 max-w-md">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-black">
      {token && (
        <>
          <div
            className={`flex-1 transition-all ml-16 duration-300 ${
              sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
            }`}
          >
            <div className="p-4 space-y-4">
              <Header />

              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-white">
                  Explore Your Music
                </h1>
                <Button
                  onClick={handleToggleAll}
                  variant="outline"
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
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
                <AccordionItem
                  value="item-1"
                  className="bg-zinc-900/30 rounded-lg border border-zinc-800/50"
                >
                  <AccordionTrigger className="px-4 text-white hover:text-green-400 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Your Followed Artists</span>
                      <span className="text-zinc-400 text-sm">
                        ({memoizedFollowedArtists.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white p-4">
                    {memoizedFollowedArtists.length === 0 ? (
                      <EmptyState
                        icon={Users}
                        title="No Followed Artists"
                        description="Start following artists to see them here. Discover new music and keep track of your favorite artists."
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
                        {memoizedFollowedArtists.map((artist) => (
                          <PlaylistCard
                            key={artist.id}
                            id={artist.id}
                            image={artist.image || "/default-artist.png"}
                            title={artist.name}
                            description={artist.genres?.join(", ")}
                            onPlay={handlePlayArtist}
                            onClick={(id, name) =>
                              router.push(
                                `/Artists/${id}?name=${encodeURIComponent(
                                  name
                                )}`
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Favorite Artists */}
                <AccordionItem
                  value="item-2"
                  className="bg-zinc-900/30 rounded-lg border border-zinc-800/50"
                >
                  <AccordionTrigger className="px-4 text-white hover:text-green-400 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Music className="h-5 w-5" />
                      <span>Your Favorite Artists</span>
                      <span className="text-zinc-400 text-sm">
                        ({memoizedFavoriteArtists.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white p-4">
                    {memoizedFavoriteArtists.length === 0 ? (
                      <EmptyState
                        icon={Music}
                        title="No Favorite Artists"
                        description="Your top artists will appear here based on your listening habits. Keep listening to build your favorites!"
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
                        {memoizedFavoriteArtists.map((artist) => (
                          <PlaylistCard
                            key={artist.id}
                            id={artist.id}
                            image={artist.image || "/default-artist.png"}
                            title={artist.name}
                            description={artist.genres?.join(", ")}
                            onPlay={handlePlayArtist}
                            onClick={(id, name) =>
                              router.push(
                                `/Artists/${id}?name=${encodeURIComponent(
                                  name
                                )}`
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Recently Played Tracks */}
                <AccordionItem
                  value="item-3"
                  className="bg-zinc-900/30 rounded-lg border border-zinc-800/50"
                >
                  <AccordionTrigger className="px-4 text-white hover:text-green-400 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Your Recently Listening</span>
                      <span className="text-zinc-400 text-sm">
                        ({memoizedRecentTracks.length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white p-4">
                    {memoizedRecentTracks.length === 0 ? (
                      <EmptyState
                        icon={Clock}
                        title="No Recent Tracks"
                        description="Your recently played tracks will appear here. Start listening to music to see your history!"
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6 justify-items-center">
                        {memoizedRecentTracks.map((tracks, index) => (
                          <PlaylistCard
                            key={`${tracks.track.id}-${index}`}
                            id={
                              tracks.track.album.artists[0]?.id ||
                              tracks.track.id
                            }
                            image={
                              tracks.track.album.images[0]?.url ||
                              "/default-artist.png"
                            }
                            title={tracks.track.name}
                            description={`${tracks.track.album.artists
                              .map((a) => a.name)
                              .join(", ")} • ${
                              tracks.track.album.release_date
                            }`}
                            onPlay={() => handlePlayTrack(tracks.track)}
                            onClick={(id) => {
                              if (tracks.track.album.artists.length > 0) {
                                router.push(
                                  `/Artists/${id}?name=${encodeURIComponent(
                                    tracks.track.album.artists[0].name
                                  )}`
                                );
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
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
