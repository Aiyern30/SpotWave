import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui";
import { PlaylistProps, User } from "@/lib/types";
import { useRouter } from "next/navigation";

const PublicLibrary = () => {
  const router = useRouter();
  const [publicPlaylists, setPublicPlaylists] = useState<PlaylistProps[]>([]);
  const [token, setToken] = useState<string>("");
  const [myProfile, setMyProfile] = useState<User | null>(null);
  console.log(myProfile);

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

    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch profile:", response.statusText);
        return;
      }

      const data = await response.json();
      setMyProfile(data);
      console.log("Profile data fetched:", data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [token]);

  useEffect(() => {
    const fetchPublicPlaylists = async () => {
      if (!token) {
        console.error("Token not available");
        return;
      }

      try {
        const response = await fetch(
          "https://api.spotify.com/v1/me/playlists",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.error("Failed to fetch playlists:", response.statusText);
          return;
        }

        const data = await response.json();

        const myPlaylists = data.items.filter(
          (playlist: PlaylistProps) => playlist.owner.id === myProfile?.id
        );

        setPublicPlaylists(myPlaylists);
        console.log("My playlists fetched:", myPlaylists);
      } catch (error) {
        console.error("Error fetching public playlists:", error);
      }
    };

    fetchPublicPlaylists();
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

  return (
    <div className="flex flex-wrap gap-8">
      {publicPlaylists.map((data) => (
        <Card
          key={data.id}
          className="group w-36 cursor-pointer text-white"
          onClick={() => handleClick(data.id, data.name)}
        >
          <CardHeader>
            <Avatar className="w-36 h-36 relative p-1">
              <AvatarImage src={data.images[0]?.url} className="rounded-xl" />
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
