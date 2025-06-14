"use client";

import Sidebar from "@/components/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import Header from "@/components/Header";
import { formatSongDuration, transform } from "@/utils/function";
import { useToast } from "@/hooks/use-toast";
import { followArtist } from "@/utils/Artist/followArtist";
import { unfollowArtist } from "@/utils/Artist/unfollowArtist";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import type { Artist } from "@/lib/types";
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import { Play, MoreHorizontal, Music, Users } from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";

interface ArtistProfilePageProps {
  id: string;
  name: string;
  followers: {
    total: number;
  };
  genres: string[];
  images: {
    url: string;
  }[];
}

interface TopTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  album: {
    id: string;
    name: string;
    images: {
      url: string;
    }[];
    artists: {
      id: string;
      name: string;
    }[];
  };
}

interface Albums {
  id: string;
  name: string;
  images: {
    url: string;
  }[];
  release_date: string;
  album_type: string;
  total_tracks: number;
  type: string;
  artists: {
    id: string;
    name: string;
  }[];
}

interface AboutProps {
  bio: {
    content: string;
    summary: string;
  };
  similar: {
    artist: {
      name: string;
      image: string;
      id: string;
    }[];
  };
}

const ArtistProfilePage = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [artistProfile, setArtistProfile] =
    useState<ArtistProfilePageProps | null>(null);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [albums, setAlbums] = useState<Albums[]>([]);
  const [artistDetails, setArtistDetails] = useState<AboutProps | null>(null);
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [tracksDisplayUI, setTracksDisplayUI] = useState<string>("Grid");
  const [albumsDisplayUI, setAlbumsDisplayUI] = useState<string>("Grid");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const segments = pathname.split("/");
  const id = segments[segments.length - 1];
  const name = searchParams.get("name");
  const [token, setToken] = useState<string>("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentlyPlayingUrl, setCurrentlyPlayingUrl] = useState<string | null>(
    null
  );
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (artistProfile?.id && followedArtists.length > 0) {
      setIsFollowing(
        followedArtists.some((artist) => artist.id === artistProfile.id)
      );
    }
  }, [artistProfile, followedArtists]);

  const sanitizedBio = DOMPurify.sanitize(artistDetails?.bio?.content || "");

  const handleFollowArtist = async (artistID: string) => {
    const result = await followArtist(artistID, token);
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      });
      setIsFollowing(true);
    } else {
      toast({
        title: "Unsuccess!",
        description: result.message,
      });
    }
  };

  const handleUnfollowArtist = async (artistID: string) => {
    const result = await unfollowArtist(artistID, token);
    if (result.success) {
      toast({
        title: "Success!",
        description: result.message,
      });
      setIsFollowing(false);
    } else {
      toast({
        title: "Unsuccess!",
        description: result.message,
      });
    }
  };

  const fetchArtistDetails = useCallback(async (artistName: string) => {
    const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY;

    try {
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${artistName}&api_key=${apiKey}&format=json`
      );

      if (!response.ok) {
        console.error("Failed to fetch artist details:", response.statusText);
        return null;
      }

      const data = await response.json();
      const artist = data.artist;

      const similarArtistsNames = artist.similar.artist.map((a: any) => a.name);

      const imagesAndIds = await searchArtistsByNames(similarArtistsNames);

      const similarArtistsWithImagesAndIds = artist.similar.artist.map(
        (a: any) => {
          const foundArtist = imagesAndIds.find((img) => img.name === a.name);
          return {
            name: a.name,
            id: foundArtist?.id || null,
            image: foundArtist?.image || null,
          };
        }
      );

      return {
        bio: {
          content: artist.bio.content,
          summary: artist.bio.summary,
        },
        similar: {
          artist: similarArtistsWithImagesAndIds,
        },
      };
    } catch (error) {
      console.error("Error fetching artist details:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (id && name && token) {
      const fetchData = async () => {
        const profile = await fetchArtistProfile(id);
        const tracks = await fetchArtistTopTracks(id);
        const artistAlbums = await fetchArtistAlbums(id);
        const details = await fetchArtistDetails(name);
        const followedArtists = await fetchFollowedArtists(token);

        setArtistProfile(profile);
        setTopTracks(tracks);
        setAlbums(artistAlbums);
        setArtistDetails(details);
        setFollowedArtists(followedArtists);
      };

      fetchData();
    }
  }, [id, name, token, fetchArtistDetails]);

  const fetchArtistProfile = async (id: string) => {
    const token = localStorage.getItem("Token");
    if (!token) return null;

    try {
      const response = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error("Failed to fetch artist profile:", response.statusText);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching artist profile:", error);
      return null;
    }
  };

  const fetchArtistTopTracks = async (id: string) => {
    const token = localStorage.getItem("Token");
    if (!token) return [];

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch top tracks:", response.statusText);
        return [];
      }

      const data = await response.json();
      return data.tracks;
    } catch (error) {
      console.error("Error fetching top tracks:", error);
      return [];
    }
  };

  const fetchArtistAlbums = async (id: string) => {
    const token = localStorage.getItem("Token");
    if (!token) return [];

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&market=US&limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch albums:", response.statusText);
        return [];
      }

      const data = await response.json();
      return data.items;
    } catch (error) {
      console.error("Error fetching albums:", error);
      return [];
    }
  };

  const searchArtistsByNames = async (names: string[]) => {
    const token = localStorage.getItem("Token");
    if (!token) return [];

    try {
      const imagePromises = names.map(async (name) => {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(
              name
            )}&type=artist&limit=1`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!response.ok) {
            console.error(
              `Failed to search artist '${name}':`,
              response.statusText
            );
            return { name, id: null, image: null };
          }

          const data = await response.json();
          const artist = data.artists.items[0];
          return {
            name,
            id: artist?.id || null,
            image: artist?.images[0]?.url || null,
          };
        } catch (error) {
          console.error(`Error searching for artist '${name}':`, error);
          return { name, id: null, image: null };
        }
      });

      return await Promise.all(imagePromises);
    } catch (error) {
      console.error("Error searching for artists:", error);
      return [];
    }
  };

  const handlePlay = (url: string | null) => {
    if (audio) {
      audio.pause();
      setCurrentlyPlayingUrl(null);
    }
    if (url) {
      const newAudio = new Audio(url);
      setAudio(newAudio);
      setCurrentlyPlayingUrl(url);
      newAudio.play();
      newAudio.onended = () => setCurrentlyPlayingUrl(null);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // Track Card Component
  const TrackCard = ({ track, index }: { track: TopTrack; index: number }) => (
    <TooltipProvider>
      <Card
        className="relative w-[200px] h-[320px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
        onClick={() => router.push(`/Songs/${track.id}?name=${track.name}`)}
      >
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-4 pt-4 pb-2">
            <div className="w-[170px] h-[170px] rounded-lg shadow-lg overflow-hidden">
              <Image
                src={track.album.images[0]?.url || "/default-artist.png"}
                width={170}
                height={170}
                className="object-cover rounded-lg"
                alt={track.name}
              />
            </div>

            {/* Play button overlay */}
            <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(track.preview_url);
                }}
              >
                <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                {track.name}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{track.name}</p>
            </TooltipContent>
          </Tooltip>

          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="text-zinc-500 text-xs line-clamp-1 hover:text-zinc-400 transition-colors cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/Albums/${track.album.id}?name=${track.album.name}`
                    );
                  }}
                >
                  {track.album.name}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{track.album.name}</p>
              </TooltipContent>
            </Tooltip>

            <div className="text-zinc-500 text-xs">
              {formatSongDuration(track.duration_ms)}
            </div>
          </div>
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
  );

  // Album Card Component
  const AlbumCard = ({ album, index }: { album: Albums; index: number }) => (
    <TooltipProvider>
      <Card
        className="relative w-[200px] h-[300px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group"
        onClick={() => router.push(`/Albums/${album.id}?name=${album.name}`)}
      >
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-4 pt-4 pb-2">
            <div className="w-[170px] h-[170px] rounded-lg shadow-lg overflow-hidden">
              <Image
                src={album.images[0]?.url || "/default-artist.png"}
                width={170}
                height={170}
                className="object-cover rounded-lg"
                alt={album.name}
              />
            </div>

            {/* Play button overlay */}
            <div className="absolute bottom-3 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-110 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle play album
                }}
              >
                <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-base font-semibold line-clamp-1 hover:text-green-400 transition-colors">
                {album.name}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{album.name}</p>
            </TooltipContent>
          </Tooltip>

          <div className="space-y-1">
            <div className="text-zinc-400 text-sm capitalize">
              {album.album_type}
            </div>
            <div className="text-zinc-500 text-xs">{album.release_date}</div>
          </div>
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
  );

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 text-white ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-6 overflow-auto">
          <Header />

          {artistProfile ? (
            <div className="space-y-8">
              {/* Artist Header */}
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
                <Avatar className="flex-shrink-0">
                  <AvatarImage
                    src={artistProfile.images[0]?.url || "/default-artist.png"}
                    className="w-48 h-48 rounded-full object-cover shadow-2xl"
                  />
                  <AvatarFallback className="w-48 h-48 rounded-full bg-zinc-700 text-white text-4xl flex items-center justify-center">
                    {artistProfile.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left space-y-4">
                  <h1 className="text-4xl md:text-6xl font-bold">
                    {artistProfile.name}
                  </h1>

                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-300">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {artistProfile.followers.total.toLocaleString()}{" "}
                        followers
                      </span>
                    </div>
                    {artistProfile.genres.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Music className="h-4 w-4" />
                        <span>
                          {artistProfile.genres.slice(0, 3).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center md:justify-start">
                    {isFollowing ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="bg-transparent border-white text-white hover:bg-white hover:text-black"
                          >
                            Following
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              This action cannot be undone. This will
                              permanently unfollow this artist.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                handleUnfollowArtist(artistProfile.id);
                                setIsFollowing(false);
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Unfollow
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        onClick={() => {
                          handleFollowArtist(artistProfile.id);
                          setIsFollowing(true);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                      >
                        Follow
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Tracks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">Top Tracks</h2>
                  <div className="flex items-center space-x-3">
                    <PiTable
                      size={35}
                      onClick={() => setTracksDisplayUI("Table")}
                      className={`cursor-pointer transition-colors ${
                        tracksDisplayUI === "Table"
                          ? "text-white"
                          : "text-[#707070] hover:text-white"
                      }`}
                    />
                    <LuLayoutGrid
                      size={30}
                      onClick={() => setTracksDisplayUI("Grid")}
                      className={`cursor-pointer transition-colors ${
                        tracksDisplayUI === "Grid"
                          ? "text-white"
                          : "text-[#707070] hover:text-white"
                      }`}
                    />
                  </div>
                </div>

                {tracksDisplayUI === "Table" ? (
                  <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                          <TableHead className="w-[60px] text-center text-zinc-400 font-medium">
                            #
                          </TableHead>
                          <TableHead className="text-zinc-400 font-medium">
                            Title
                          </TableHead>
                          <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                            Album
                          </TableHead>
                          <TableHead className="hidden md:table-cell text-right text-zinc-400 font-medium">
                            Duration
                          </TableHead>
                          <TableHead className="w-[100px] text-center text-zinc-400 font-medium">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topTracks.map((track, index) => (
                          <TableRow
                            key={track.id}
                            className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors group cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/Songs/${track.id}?name=${track.name}`
                              )
                            }
                          >
                            <TableCell className="text-center">
                              <span className="text-zinc-400 text-sm">
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                  <Image
                                    src={
                                      track.album.images[0]?.url ||
                                      "/default-artist.png"
                                    }
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                    alt={track.name}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-white font-medium truncate hover:text-green-400 transition-colors">
                                    {track.name}
                                  </div>
                                  <div className="text-zinc-400 text-sm truncate">
                                    {artistProfile.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div
                                className="text-zinc-400 hover:text-white hover:underline cursor-pointer truncate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/Albums/${track.album.id}?name=${track.album.name}`
                                  );
                                }}
                              >
                                {track.album.name}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-right">
                              <span className="text-zinc-400 text-sm">
                                {formatSongDuration(track.duration_ms)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlay(track.preview_url);
                                }}
                              >
                                <Play className="h-4 w-4" fill="currentColor" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
                    {topTracks.map((track, index) => (
                      <TrackCard key={track.id} track={track} index={index} />
                    ))}
                  </div>
                )}
              </div>

              {/* Albums Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">Albums</h2>
                  <div className="flex items-center space-x-3">
                    <PiTable
                      size={35}
                      onClick={() => setAlbumsDisplayUI("Table")}
                      className={`cursor-pointer transition-colors ${
                        albumsDisplayUI === "Table"
                          ? "text-white"
                          : "text-[#707070] hover:text-white"
                      }`}
                    />
                    <LuLayoutGrid
                      size={30}
                      onClick={() => setAlbumsDisplayUI("Grid")}
                      className={`cursor-pointer transition-colors ${
                        albumsDisplayUI === "Grid"
                          ? "text-white"
                          : "text-[#707070] hover:text-white"
                      }`}
                    />
                  </div>
                </div>

                {albumsDisplayUI === "Table" ? (
                  <div className="bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800/50 hover:bg-zinc-800/30">
                          <TableHead className="text-zinc-400 font-medium">
                            Album
                          </TableHead>
                          <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                            Type
                          </TableHead>
                          <TableHead className="hidden md:table-cell text-zinc-400 font-medium">
                            Release Date
                          </TableHead>
                          <TableHead className="hidden lg:table-cell text-right text-zinc-400 font-medium">
                            Tracks
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {albums.map((album) => (
                          <TableRow
                            key={album.id}
                            className="border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/Albums/${album.id}?name=${album.name}`
                              )
                            }
                          >
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                  <Image
                                    src={
                                      album.images[0]?.url ||
                                      "/default-artist.png"
                                    }
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                    alt={album.name}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-white font-medium truncate hover:text-green-400 transition-colors">
                                    {album.name}
                                  </div>
                                  <div className="text-zinc-400 text-sm truncate">
                                    {artistProfile.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-zinc-400 capitalize">
                                {album.album_type}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-zinc-400">
                                {album.release_date}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right">
                              <span className="text-zinc-400 text-sm">
                                {album.total_tracks} tracks
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 px-1">
                    {albums.map((album, index) => (
                      <AlbumCard key={album.id} album={album} index={index} />
                    ))}
                  </div>
                )}
              </div>

              {/* About Section */}
              {artistDetails?.bio.content && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold">About</h2>
                  <div className="bg-zinc-900/30 rounded-lg p-6 border border-zinc-800/50">
                    <div className="text-zinc-300 leading-relaxed max-w-none prose prose-invert">
                      {parse(sanitizedBio, { replace: transform })}
                    </div>
                  </div>
                </div>
              )}

              {/* Similar Artists Section */}
              {artistDetails?.similar.artist.length !== 0 && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold">Similar Artists</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {artistDetails?.similar.artist.map((similarArtist) => (
                      <TooltipProvider key={similarArtist.id}>
                        <div
                          className="flex flex-col items-center p-4 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer group"
                          onClick={() =>
                            router.push(
                              `/Artists/${similarArtist.id}?name=${similarArtist.name}`
                            )
                          }
                        >
                          <Avatar className="w-20 h-20 mb-3">
                            <AvatarImage
                              src={similarArtist.image || "/default-artist.png"}
                              className="rounded-full object-cover"
                            />
                            <AvatarFallback className="bg-zinc-700 text-white rounded-full">
                              {similarArtist.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-center text-sm font-medium text-white group-hover:text-green-400 transition-colors line-clamp-2">
                                {similarArtist.name}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{similarArtist.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Loading Skeleton */}
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
                <Skeleton className="w-48 h-48 rounded-full" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-12 w-64" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>

              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                  {Array(6)
                    .fill(0)
                    .map((_, index) => (
                      <div key={index} className="space-y-3">
                        <Skeleton className="w-[200px] h-[170px] rounded-lg" />
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistProfilePage;
