// src/utils/Artist/fetchFollowedArtists.ts
import { Artist } from "@/lib/types";

export const fetchFollowedArtists = async (
  token: string
): Promise<Artist[]> => {
  if (!token) {
    console.error("Error: No token provided");
    return [];
  }
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

    if (!response.ok) {
      console.error("Error fetching followed artists:", data);
      return [];
    }

    return data.artists.items.map((artist: any) => ({
      id: artist.id,
      image: artist.images[0]?.url || "",
      name: artist.name,
      genres: artist.genres,
      external_urls: artist.external_urls,
      href: artist.href,
      type: artist.type,
      uri: artist.uri,
    }));
  } catch (error) {
    console.error("Error fetching followed artists:", error);
    return [];
  }
};
