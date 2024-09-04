"use client";

import Sidebar from "@/app/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Skeleton,
} from "@/components/ui";
import Header from "@/components/Header";

interface Image {
  url: string;
}

interface ArtistProfilePageProps {
  id: string;
  name: string;
  followers: {
    total: number;
  };
  genres: string[];
  images: Image[];
}

interface TopTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  album: {
    id: string;
    name: string;
    images: Image[];
    artists: {
      id: string;
      name: string;
    }[];
  };
}

interface Albums {
  id: string;
  name: string;
  images: Image[];
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
  console.log("topTracks", topTracks);
  const [albums, setAlbums] = useState<Albums[]>([]);
  const [artistDetails, setArtistDetails] = useState<AboutProps | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const segments = pathname.split("/");
  const id = segments[segments.length - 1];
  const name = searchParams.get("name");
  const [token, setToken] = useState<string>("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

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
    if (id && name) {
      const fetchData = async () => {
        const profile = await fetchArtistProfile(id);
        const tracks = await fetchArtistTopTracks(id);
        const artistAlbums = await fetchArtistAlbums(id);
        const details = await fetchArtistDetails(name);

        setArtistProfile(profile);
        setTopTracks(tracks);
        setAlbums(artistAlbums);
        setArtistDetails(details);
      };

      fetchData();
    }
  }, [id, name, fetchArtistDetails]);

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

  const formatDuration = (durationMs: number | undefined) => {
    if (durationMs === undefined) return "00:00";

    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const playPreview = (url: string | null) => {
    if (audio) {
      audio.pause();
    }
    if (url) {
      const newAudio = new Audio(url);
      setAudio(newAudio);
      newAudio.play();
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

  return (
    <div className="flex h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 text-white ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        }`}
      >
        <div className="p-4 space-y-4  overflow-auto">
          <Header />

          {artistProfile ? (
            <div className="flex flex-col items-center space-y-4">
              <h1 className="text-4xl font-bold">{artistProfile.name}</h1>

              <Avatar>
                <AvatarImage
                  src={artistProfile.images[0]?.url || "/default-artist.png"}
                  className="w-48 h-48 rounded-full object-cover"
                />
                <AvatarFallback>{artistProfile.name}</AvatarFallback>
              </Avatar>
              <p className="text-lg">
                Followers: {artistProfile.followers.total}
              </p>
              <p className="text-lg">
                Genres: {artistProfile.genres.join(", ")}
              </p>

              <h2 className="text-3xl font-bold mt-8">Top Tracks</h2>
              <div className="flex flex-wrap gap-8">
                {topTracks.map((track) => (
                  <Card
                    key={track.id}
                    className="group w-36 cursor-pointer text-white relative"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent click from propagating to children
                      router.push(`/Songs/${track.id}?name=${track.name}`);
                    }}
                  >
                    <CardHeader>
                      <Avatar className="w-36 h-36 relative p-1">
                        <AvatarImage
                          src={
                            track.album.images[0]?.url || "/default-artist.png"
                          }
                          className="rounded-xl object-cover"
                        />
                        <AvatarFallback>{track.name}</AvatarFallback>

                        {track.preview_url && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent click from propagating to parent Card
                              playPreview(track.preview_url);
                            }}
                            className="absolute bottom-2 right-2 flex items-center justify-center border rounded-full w-8 h-8 bg-play opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <Image
                              src="/play-button.png"
                              width={16}
                              height={16}
                              alt="Play"
                            />
                          </div>
                        )}
                      </Avatar>
                    </CardHeader>
                    <CardTitle>{track.name}</CardTitle>
                    <CardContent className="text-sm flex flex-wrap space-x-3">
                      {track.album.artists.map((artist) => (
                        <div
                          key={artist.id}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent click from propagating to parent Card
                            router.push(
                              `/Artists/${artist.id}?name=${artist.name}`
                            );
                          }}
                          className="cursor-pointer hover:underline"
                        >
                          {artist.name}
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter className="text-sm flex justify-between items-center">
                      <div
                        className="hover:underline"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent click from propagating to parent Card
                          router.push(
                            `/Albums/${track.album.id}?name=${track.album.name}`
                          );
                        }}
                      >
                        {track.album.name}
                      </div>
                      <div>{formatDuration(track.duration_ms)}</div>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <h2 className="text-3xl font-bold mt-8">Albums</h2>
              <div className="flex flex-wrap gap-8">
                {albums.map((album) => (
                  <Card
                    key={album.id}
                    className="group w-36 cursor-pointer text-white relative"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent click from propagating to children
                      router.push(`/Albums/${album.id}?name=${album.name}`);
                    }}
                  >
                    <CardHeader>
                      <Avatar className="w-36 h-36 relative p-1">
                        <AvatarImage
                          src={album.images[0]?.url || "/default-artist.png"}
                          className="rounded-xl object-cover"
                        />
                        <AvatarFallback>{album.name}</AvatarFallback>
                      </Avatar>
                    </CardHeader>
                    <CardTitle>{album.name}</CardTitle>
                    <CardContent
                      className="text-sm flex flex-wrap space-x-3"
                      onClick={(e) => e.stopPropagation()} // Prevent click from propagating to parent Card
                    >
                      {album.artists.map((artist) => (
                        <div
                          key={artist.id}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent click from propagating to parent Card
                            router.push(
                              `/Artists/${artist.id}?name=${artist.name}`
                            );
                          }}
                          className="cursor-pointer hover:underline"
                        >
                          {artist.name}
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter
                      className="text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {album.release_date}
                    </CardFooter>
                  </Card>
                ))}
              </div>
              {artistDetails?.bio.content && (
                <>
                  <h2 className="text-3xl font-bold mt-8 ">About</h2>
                  <p className="text-justify px-4 md:px-0 text-sm md:max-w-5xl max-w-xs">
                    {artistDetails?.bio.content}
                  </p>
                </>
              )}
              {artistDetails?.similar.artist.length !== 0 && (
                <>
                  <h3 className="text-2xl font-semibold mt-6">
                    Similar Artists
                  </h3>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    {artistDetails?.similar.artist.map((similarArtist) => (
                      <div
                        key={similarArtist.id}
                        className="flex flex-col items-center w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6 p-2 hover:underline cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/Artists/${similarArtist.id}?name=${similarArtist.name}`
                          )
                        }
                      >
                        <Avatar className="w-full max-w-[6rem] md:max-w-[8rem]">
                          <AvatarImage
                            src={similarArtist.image || "/default-artist.png"}
                            className="rounded-full object-cover w-32 h-32"
                          />
                          <AvatarFallback>{similarArtist.name}</AvatarFallback>
                        </Avatar>
                        <div className="text-center mt-2">
                          {similarArtist.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-8  overflow-auto">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="w-48 h-48 rounded-full" />

                <Skeleton className="h-8 w-48" />

                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-56" />
                </div>

                <h2 className="text-3xl font-bold mt-8">Top Tracks</h2>
                <div className="flex flex-wrap gap-8">
                  {Array(4)
                    .fill(0)
                    .map((_, index) => (
                      <div key={index} className="group w-36 relative">
                        <Skeleton className="w-36 h-36 rounded-xl" />
                        <div className="mt-2 space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-16 mt-1" />
                      </div>
                    ))}
                </div>

                <h2 className="text-3xl font-bold mt-8">Albums</h2>
                <div className="flex flex-wrap gap-8">
                  {Array(4)
                    .fill(0)
                    .map((_, index) => (
                      <div key={index} className="group w-36 relative">
                        <Skeleton className="w-36 h-36 rounded-xl" />
                        <div className="mt-2 space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-4 w-16 mt-1" />
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
