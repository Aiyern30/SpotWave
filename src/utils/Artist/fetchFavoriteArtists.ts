// src/utils/Artist/fetchFavoriteArtists.ts
import { Artist } from "@/lib/types";

export const fetchFavoriteArtists = async (
  token: string
): Promise<Artist[]> => {
  try {
    const response = await fetch("https://api.spotify.com/v1/me/top/artists", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error fetching favorite artists:", data);
      return [];
    }

    return data.items.map((artist: any) => ({
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
    console.error("Error fetching favorite artists:", error);
    return [];
  }
};
