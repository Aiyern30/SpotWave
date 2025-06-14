"use client";

import { useEffect, useMemo, useState } from "react";
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
  Button,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { useRouter } from "next/navigation";
import { Play, Music, Users, Clock, MoreHorizontal } from "lucide-react";
import type { Artist, RecentTracksProps } from "@/lib/types";
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
                        {memoizedFollowedArtists.map((artist) => (
                          <TooltipProvider key={artist.id}>
                            <Card
                              className="relative w-[200px] h-[280px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
                              onClick={() =>
                                router.push(
                                  `/Artists/${
                                    artist.id
                                  }?name=${encodeURIComponent(artist.name)}`
                                )
                              }
                            >
                              <CardHeader className="p-0 pb-0">
                                <div className="relative w-full px-4 pt-4 pb-2">
                                  <Avatar className="w-[170px] h-[170px] rounded-full shadow-lg">
                                    <AvatarImage
                                      src={artist.image || "/placeholder.svg"}
                                      alt="artist"
                                      className="rounded-full object-cover"
                                    />
                                    <AvatarFallback className="bg-zinc-700 text-white text-2xl rounded-full">
                                      {artist.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  {/* Play button overlay */}
                                  <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                    <Button
                                      size="icon"
                                      className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle play artist's top tracks
                                      }}
                                    >
                                      <Play
                                        className="h-6 w-6 ml-0.5"
                                        fill="currentColor"
                                      />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="p-4 pt-2 space-y-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                                      {artist.name}
                                    </CardTitle>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs"
                                  >
                                    <p>{artist.name}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {artist.genres && artist.genres.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">
                                        {artist.genres.join(", ")}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      className="max-w-xs"
                                    >
                                      <p>{artist.genres.join(", ")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </CardContent>

                              {/* More options button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 text-zinc-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle more options
                                }}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </Card>
                          </TooltipProvider>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
                        {memoizedFavoriteArtists.map((artist) => (
                          <TooltipProvider key={artist.id}>
                            <Card
                              className="relative w-[200px] h-[280px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
                              onClick={() =>
                                router.push(
                                  `/Artists/${
                                    artist.id
                                  }?name=${encodeURIComponent(artist.name)}`
                                )
                              }
                            >
                              <CardHeader className="p-0 pb-0">
                                <div className="relative w-full px-4 pt-4 pb-2">
                                  <Avatar className="w-[170px] h-[170px] rounded-full shadow-lg">
                                    <AvatarImage
                                      src={artist.image || "/placeholder.svg"}
                                      className="rounded-full object-cover"
                                      alt="artist"
                                    />
                                    <AvatarFallback className="bg-zinc-700 text-white text-2xl rounded-full">
                                      {artist.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  {/* Play button overlay */}
                                  <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                    <Button
                                      size="icon"
                                      className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle play artist's top tracks
                                      }}
                                    >
                                      <Play
                                        className="h-6 w-6 ml-0.5"
                                        fill="currentColor"
                                      />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="p-4 pt-2 space-y-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                                      {artist.name}
                                    </CardTitle>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs"
                                  >
                                    <p>{artist.name}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {artist.genres && artist.genres.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">
                                        {artist.genres.join(", ")}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      className="max-w-xs"
                                    >
                                      <p>{artist.genres.join(", ")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </CardContent>

                              {/* More options button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 text-zinc-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle more options
                                }}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </Card>
                          </TooltipProvider>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
                        {memoizedRecentTracks.map((tracks, index) => (
                          <TooltipProvider key={`${index}`}>
                            <Card
                              className="relative w-[200px] h-[320px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
                              onClick={() => {
                                // Navigate to track or artist since album doesn't have id in your type
                                if (tracks.track.album.artists.length > 0) {
                                  router.push(
                                    `/Artists/${
                                      tracks.track.album.artists[0].id
                                    }?name=${encodeURIComponent(
                                      tracks.track.album.artists[0].name
                                    )}`
                                  );
                                }
                              }}
                            >
                              <CardHeader className="p-0 pb-0">
                                <div className="relative w-full px-4 pt-4 pb-2">
                                  <Avatar className="w-[170px] h-[170px] rounded-lg shadow-lg">
                                    <AvatarImage
                                      src={
                                        tracks.track.album.images[0]?.url ||
                                        "/placeholder.svg"
                                      }
                                      className="rounded-lg object-cover"
                                      alt="track"
                                    />
                                    <AvatarFallback className="bg-zinc-700 text-white text-2xl rounded-lg">
                                      {tracks.track.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  {/* Play button overlay */}
                                  <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                    <Button
                                      size="icon"
                                      className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle play track
                                      }}
                                    >
                                      <Play
                                        className="h-6 w-6 ml-0.5"
                                        fill="currentColor"
                                      />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="p-4 pt-2 space-y-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                                      {tracks.track.name}
                                    </CardTitle>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs"
                                  >
                                    <p>{tracks.track.name}</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-zinc-400 text-sm line-clamp-1 hover:text-zinc-300 transition-colors">
                                      {tracks.track.album.artists
                                        .map((artist) => artist.name)
                                        .join(", ")}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    className="max-w-xs"
                                  >
                                    <p>
                                      {tracks.track.album.artists
                                        .map((artist) => artist.name)
                                        .join(", ")}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-zinc-500 text-xs line-clamp-1 hover:text-zinc-400 transition-colors">
                                      Album • {tracks.track.album.release_date}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    className="max-w-xs"
                                  >
                                    <p>
                                      Released:{" "}
                                      {tracks.track.album.release_date}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </CardContent>

                              <CardFooter className="p-4 pt-0">
                                <p className="text-zinc-500 text-xs">
                                  {new Date(
                                    tracks.played_at
                                  ).toLocaleDateString()}
                                </p>
                              </CardFooter>

                              {/* More options button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 text-zinc-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle more options
                                }}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </Card>
                          </TooltipProvider>
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
