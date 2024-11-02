import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton,
} from "@/components/ui";
import { PlaylistProps, User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { fetchUserProfile } from "@/utils/fetchProfile"; // Import the fetchUserProfile function
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist"; // Import the fetchSpotifyPlaylists function

const PublicLibrary = () => {
  const router = useRouter();
  const [publicPlaylists, setPublicPlaylists] = useState<PlaylistProps[]>([]);
  const [token, setToken] = useState<string>("");
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      console.error("No token found. Please authenticate.");
    }
  }, []);

  const fetchMyProfile = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    const profileData = await fetchUserProfile(token);
    if (profileData) {
      setMyProfile(profileData);
      console.log("Profile data fetched:", profileData);
    }
  }, [token]);

  const fetchPublicPlaylists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    try {
      setLoading(true);
      const playlistsData = await fetchSpotifyPlaylists(token);
      if (playlistsData) {
        const myPlaylists = playlistsData.filter(
          (playlist: PlaylistProps) => playlist.owner.id === myProfile?.id
        );
        setPublicPlaylists(myPlaylists);
        console.log("My playlists fetched:", myPlaylists);
      }
    } catch (error) {
      console.error("Error fetching public playlists:", error);
    } finally {
      setLoading(false);
    }
  }, [token, myProfile]);

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  const handleClick = (id: string, name: string) => {
    router.push(`/Home/${id}?name=${encodeURIComponent(name)}`);
  };

  useEffect(() => {
    if (token) {
      fetchMyProfile();
    }
  }, [token, fetchMyProfile]);

  useEffect(() => {
    if (token && myProfile) {
      fetchPublicPlaylists();
    }
  }, [token, myProfile, fetchPublicPlaylists]);

  return (
    <div className="flex flex-wrap gap-8">
      {loading
        ? Array.from({ length: 10 }).map((_, index) => (
            <Card
              key={index}
              className="group w-36 cursor-pointer text-white space-y-2"
            >
              <CardHeader>
                <Avatar className="w-36 h-36 relative p-1">
                  <Skeleton className="w-36 h-36 rounded-xl" />
                </Avatar>
              </CardHeader>
              <CardTitle>
                <Skeleton className="h-5 w-32 mx-auto" />
              </CardTitle>
              <CardFooter className="text-sm">
                <Skeleton className="h-4 w-28 mx-auto" />
              </CardFooter>
            </Card>
          ))
        : publicPlaylists.map((data) => (
            <Card
              key={data.id}
              className="group w-36 cursor-pointer text-white"
              onClick={() => handleClick(data.id, data.name)}
            >
              <CardHeader>
                <Avatar className="w-36 h-36 relative p-1">
                  <AvatarImage
                    src={data.images[0]?.url}
                    className="rounded-xl"
                  />
                  <AvatarFallback>Image Unavailable</AvatarFallback>
                </Avatar>
              </CardHeader>
              <CardTitle>{data.name}</CardTitle>
              <CardFooter className="text-sm">
                {truncateText(data.description || "", 100)}
              </CardFooter>
            </Card>
          ))}
    </div>
  );
};

export default PublicLibrary;
