import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui";
import { Artist } from "@/lib/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

const FollowingArtists = () => {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const fetchFollowedArtists = async () => {
      if (token) {
        try {
          const response = await fetch(
            "https://api.spotify.com/v1/me/following?type=artist",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const data = await response.json();

          if (response.ok) {
            const artistData = data.artists.items.map((artist: any) => ({
              id: artist.id,
              image: artist.images[0]?.url || "",
              name: artist.name,
              genres: artist.genres,
            }));
            setFollowedArtists(artistData);
          } else {
            console.error("Error fetching followed artists:", data);
          }
        } catch (error) {
          console.error("Error fetching followed artists:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchFollowedArtists();
  }, [token]);

  const memoizedFollowedArtists = useMemo(
    () => followedArtists,
    [followedArtists]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-8 text-white">
        {loading
          ? Array.from({ length: 10 }).map((_, index) => (
              <Card key={index} className="group w-36 cursor-pointer space-y-2">
                <CardHeader>
                  <Skeleton className="w-36 h-36 rounded-xl" />
                </CardHeader>
                <CardTitle>
                  <Skeleton className="h-5 w-32  mx-auto" />
                </CardTitle>
                <CardContent>
                  <Skeleton className="h-4 w-28  mx-auto" />
                </CardContent>
              </Card>
            ))
          : memoizedFollowedArtists.map((artist) => (
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
                    <AvatarImage src={artist.image} className="rounded-xl" />
                    <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </CardHeader>
                <CardTitle>{artist.name}</CardTitle>
                <CardContent>{artist.genres.join(", ")}</CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
};

export default FollowingArtists;
