"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import {
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
  Skeleton,
  Badge,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { formatSongDuration, transform } from "@/utils/function";
import { useToast } from "@/hooks/use-toast";
import { followArtist } from "@/utils/Artist/followArtist";
import { unfollowArtist } from "@/utils/Artist/unfollowArtist";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import type { Artist } from "@/lib/types";
import parse from "html-react-parser";
import DOMPurify from "dompurify";
import {
  Play,
  MoreHorizontal,
  Music,
  Users,
  Clock,
  ExternalLink,
  Pause,
} from "lucide-react";
import { PiTable } from "react-icons/pi";
import { LuLayoutGrid } from "react-icons/lu";
import { usePlayer } from "@/contexts/PlayerContext";
import { fetchArtistTopTracks } from "@/utils/Tracks/fetchArtistTopTracks";

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
  const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } =
    usePlayer();

  const segments = pathname.split("/");
  const id = segments[segments.length - 1];
  const name = searchParams.get("name");
  const [token, setToken] = useState<string>("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

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

  const handlePlayPauseTrack = (track: TopTrack) => {
    // Check if this track is currently playing
    if (currentTrackId === track.id) {
      // Same track - toggle play/pause
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      // Different track - play it
      try {
        playTrack({
          id: track.id,
          name: track.name,
          artists: track.album.artists,
          album: {
            name: track.album.name,
            images: track.album.images,
            id: track.album.id,
            artists: track.album.artists,
            release_date: "",
            total_tracks: 0,
          },
          duration_ms: track.duration_ms,
          explicit: false,
          external_urls: {
            spotify: `https://open.spotify.com/track/${track.id}`,
          },
          popularity: 0,
          preview_url: track.preview_url || null,
          track_number: 0,
          disc_number: 1,
          uri: `spotify:track:${track.id}`,
        });
        setCurrentTrackId(track.id);
      } catch (error) {
        console.error("Error playing track:", error);
      }
    }
  };

  // Helper function to check if track is currently playing
  const isTrackPlaying = (trackId: string) => {
    return currentTrackId === trackId && isPlaying;
  };

  const handlePlayAlbum = async (albumId: string) => {
    try {
      // Fetch album tracks
      const token = localStorage.getItem("Token");
      if (!token) return;

      const response = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch album tracks");
        return;
      }

      const data = await response.json();
      const firstTrack = data.items[0];

      if (firstTrack) {
        // Fetch full track details
        const trackResponse = await fetch(
          `https://api.spotify.com/v1/tracks/${firstTrack.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (trackResponse.ok) {
          const trackData = await trackResponse.json();
          playTrack({
            id: trackData.id,
            name: trackData.name,
            artists: trackData.artists,
            album: {
              name: trackData.album.name,
              images: trackData.album.images,
              id: trackData.album.id,
              artists: trackData.album.artists,
              release_date: trackData.album.release_date || "",
              total_tracks: trackData.album.total_tracks || 0,
            },
            duration_ms: trackData.duration_ms,
            explicit: trackData.explicit || false,
            external_urls: {
              spotify: `https://open.spotify.com/track/${trackData.id}`,
            },
            popularity: trackData.popularity || 0,
            preview_url: trackData.preview_url || null,
            track_number: trackData.track_number || 0,
            disc_number: trackData.disc_number || 1,
            uri: trackData.uri,
          });
          console.log("Playing album:", albumId);
        }
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  // Update current track ID when track changes
  useEffect(() => {
    if (currentTrack?.id) {
      setCurrentTrackId(currentTrack.id);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const handleArtistClick = (artistId: string, artistName: string) => {
    router.push(`/Artists/${artistId}?name=${encodeURIComponent(artistName)}`);
  };

  const handleAlbumClick = (albumId: string, albumName: string) => {
    router.push(`/Albums/${albumId}?name=${encodeURIComponent(albumName)}`);
  };

  const handleSongClick = (trackId: string, trackName: string) => {
    router.push(`/Songs/${trackId}?name=${encodeURIComponent(trackName)}`);
  };

  return (
    <div className="space-y-4 sm:space-y-8 overflow-auto">
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
              <h1 className="text-4xl md:text-6xl font-bold text-white">
                {artistProfile.name}
              </h1>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-300">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {artistProfile.followers.total.toLocaleString()} followers
                  </span>
                </div>
                {artistProfile.genres.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Music className="h-4 w-4" />
                    <span>{artistProfile.genres.slice(0, 3).join(", ")}</span>
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
                          This action cannot be undone. This will permanently
                          unfollow this artist.
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
              <h2 className="text-3xl font-bold text-white">Top Tracks</h2>
              <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTracksDisplayUI("Table")}
                  className={`h-9 px-3 transition-all ${
                    tracksDisplayUI === "Table"
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <PiTable className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTracksDisplayUI("Grid")}
                  className={`h-9 px-3 transition-all ${
                    tracksDisplayUI === "Grid"
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Grid</span>
                </Button>
              </div>
            </div>

            {tracksDisplayUI === "Table" ? (
              <div className="overflow-x-auto bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <Table className="table-layout-fixed">
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-12 text-center text-zinc-400">
                        #
                      </TableHead>
                      <TableHead className="text-zinc-400">Title</TableHead>
                      <TableHead className="hidden md:table-cell text-zinc-400">
                        Album
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-center text-zinc-400">
                        Action
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-right text-zinc-400">
                        <Clock className="w-4 h-4 ml-auto" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topTracks.map((track, index) => (
                      <TableRow
                        key={track.id}
                        className="border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        onClick={() => handleSongClick(track.id, track.name)}
                        onMouseEnter={() => setHoveredTrackId(track.id)}
                        onMouseLeave={() => setHoveredTrackId(null)}
                      >
                        <TableCell className="text-center">
                          {hoveredTrackId === track.id ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 rounded-full hover:bg-green-500 hover:text-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayPauseTrack(track);
                              }}
                            >
                              {isTrackPlaying(track.id) ? (
                                <Pause
                                  className="w-3 h-3"
                                  fill="currentColor"
                                />
                              ) : (
                                <Play className="w-3 h-3" fill="currentColor" />
                              )}
                            </Button>
                          ) : (
                            <span
                              className={`text-sm ${
                                isTrackPlaying(track.id)
                                  ? "text-green-400"
                                  : "text-zinc-400"
                              }`}
                            >
                              {index + 1}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-0">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
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
                              <div
                                className={`font-medium truncate transition-colors ${
                                  isTrackPlaying(track.id)
                                    ? "text-green-400"
                                    : "text-white group-hover:text-green-400"
                                }`}
                              >
                                {track.name}
                              </div>
                              <div className="text-zinc-400 text-sm truncate">
                                <span
                                  className="hover:underline hover:text-green-400 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArtistClick(
                                      artistProfile.id,
                                      artistProfile.name
                                    );
                                  }}
                                >
                                  {artistProfile.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div
                            className="text-zinc-400 hover:text-white hover:underline cursor-pointer truncate"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAlbumClick(
                                track.album.id,
                                track.album.name
                              );
                            }}
                          >
                            {track.album.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-green-500 hover:bg-green-500/10 hover:border-green-500 hover:text-green-400 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://open.spotify.com/track/${track.id}`,
                                "_blank"
                              );
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Spotify
                          </Button>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right text-zinc-400 text-sm">
                          {formatSongDuration(track.duration_ms)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6">
                {topTracks.map((track, index) => {
                  const isThisTrack = currentTrackId === track.id;
                  return (
                    <Card
                      key={track.id}
                      className="group bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                      onClick={() => handleSongClick(track.id, track.name)}
                    >
                      <CardHeader className="pb-3">
                        <div className="relative">
                          <Image
                            src={
                              track.album.images[0]?.url ||
                              "/default-artist.png"
                            }
                            width={200}
                            height={200}
                            alt={track.name}
                            className="w-full aspect-square object-cover rounded-lg"
                          />

                          {/* Play/Pause Button Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-400 text-black rounded-full w-12 h-12 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayPauseTrack(track);
                              }}
                            >
                              {isThisTrack && isPlaying ? (
                                <Pause
                                  className="w-5 h-5"
                                  fill="currentColor"
                                />
                              ) : (
                                <Play className="w-5 h-5" fill="currentColor" />
                              )}
                            </Button>
                          </div>

                          {/* Track Number Badge */}
                          <Badge className="absolute top-2 left-2 bg-black/70 text-white">
                            #{index + 1}
                          </Badge>

                          {/* Currently Playing Indicator */}
                          {isThisTrack && isPlaying && (
                            <Badge className="absolute top-2 right-2 bg-green-500 text-black text-xs font-bold animate-pulse">
                              Playing
                            </Badge>
                          )}
                          {isThisTrack && !isPlaying && (
                            <Badge className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold">
                              Paused
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <CardTitle
                          className={`text-base font-semibold truncate mb-2 transition-colors ${
                            isThisTrack
                              ? "text-green-400"
                              : "text-white group-hover:text-green-400"
                          }`}
                        >
                          {track.name}
                        </CardTitle>

                        <div className="space-y-2">
                          <div
                            className="text-sm text-zinc-400 truncate hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArtistClick(
                                artistProfile.id,
                                artistProfile.name
                              );
                            }}
                          >
                            {artistProfile.name}
                          </div>

                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{formatSongDuration(track.duration_ms)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs hover:text-green-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                  `https://open.spotify.com/track/${track.id}`,
                                  "_blank"
                                );
                              }}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Albums Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-white">Albums</h2>
              <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlbumsDisplayUI("Table")}
                  className={`h-9 px-3 transition-all ${
                    albumsDisplayUI === "Table"
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <PiTable className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAlbumsDisplayUI("Grid")}
                  className={`h-9 px-3 transition-all ${
                    albumsDisplayUI === "Grid"
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <LuLayoutGrid className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Grid</span>
                </Button>
              </div>
            </div>

            {albumsDisplayUI === "Table" ? (
              <div className="overflow-x-auto bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <Table className="table-layout-fixed">
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">Album</TableHead>
                      <TableHead className="hidden md:table-cell text-zinc-400">
                        Type
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-zinc-400">
                        Release Date
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-center text-zinc-400">
                        Action
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-right text-zinc-400">
                        Tracks
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {albums.map((album) => (
                      <TableRow
                        key={album.id}
                        className="border-zinc-800 hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        onClick={() => handleAlbumClick(album.id, album.name)}
                      >
                        <TableCell className="max-w-0">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={
                                  album.images[0]?.url || "/default-artist.png"
                                }
                                width={48}
                                height={48}
                                className="object-cover"
                                alt={album.name}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium truncate group-hover:text-green-400 transition-colors">
                                {album.name}
                              </div>
                              <div className="text-zinc-400 text-sm truncate">
                                <span
                                  className="hover:underline hover:text-green-400 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArtistClick(
                                      artistProfile.id,
                                      artistProfile.name
                                    );
                                  }}
                                >
                                  {artistProfile.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="capitalize">
                            {album.album_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-zinc-400">
                            {new Date(album.release_date).getFullYear()}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-green-500 hover:bg-green-500/10 hover:border-green-500 hover:text-green-400 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://open.spotify.com/album/${album.id}`,
                                "_blank"
                              );
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Spotify
                          </Button>
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
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-6">
                {albums.map((album) => (
                  <Card
                    key={album.id}
                    className="group bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                    onClick={() => handleAlbumClick(album.id, album.name)}
                  >
                    <CardHeader className="pb-3">
                      <div className="relative">
                        <Image
                          src={album.images[0]?.url || "/default-artist.png"}
                          width={200}
                          height={200}
                          alt={album.name}
                          className="w-full aspect-square object-cover rounded-lg"
                        />

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-400 text-black rounded-full w-12 h-12 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAlbum(album.id);
                            }}
                          >
                            <Play className="w-5 h-5" fill="currentColor" />
                          </Button>
                        </div>

                        {/* Album Type Badge */}
                        <Badge className="absolute top-2 left-2 bg-black/70 text-white capitalize">
                          {album.album_type}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <CardTitle className="text-base font-semibold text-white truncate mb-2 group-hover:text-green-400 transition-colors">
                        {album.name}
                      </CardTitle>

                      <div className="space-y-2">
                        <div className="text-sm text-zinc-400 truncate">
                          {new Date(album.release_date).getFullYear()}
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span>{album.total_tracks} tracks</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs hover:text-green-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://open.spotify.com/album/${album.id}`,
                                "_blank"
                              );
                            }}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* About Section */}
          {artistDetails?.bio.content && (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white">About</h2>
              <div className="bg-zinc-900/30 rounded-lg p-6 border border-zinc-800/50 relative overflow-hidden group">
                <div
                  className={`text-zinc-300 leading-relaxed max-w-none prose prose-invert transition-all duration-500 ease-in-out ${
                    !isBioExpanded
                      ? "max-h-[300px] sm:max-h-none overflow-hidden"
                      : ""
                  }`}
                >
                  {parse(sanitizedBio, { replace: transform })}
                </div>

                {!isBioExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-900 to-transparent sm:hidden" />
                )}

                <div className="mt-4 sm:hidden">
                  <Button
                    variant="ghost"
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="w-full text-green-500 hover:text-green-400 font-semibold flex items-center justify-center gap-2 group-hover:bg-white/5"
                  >
                    {isBioExpanded ? "Read Less" : "Read More"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Similar Artists Section */}
          {artistDetails?.similar.artist.length !== 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-white">
                Similar Artists
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {artistDetails?.similar.artist.map((similarArtist) => (
                  <TooltipProvider key={similarArtist.id}>
                    <div
                      className="flex flex-col items-center p-4 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer group"
                      onClick={() =>
                        handleArtistClick(similarArtist.id, similarArtist.name)
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
  );
};

export default ArtistProfilePage;
