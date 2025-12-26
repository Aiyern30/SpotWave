import { PlaylistProps } from "@/lib/types";

export interface SearchPlaylistsResponse {
  playlists: {
    items: PlaylistProps[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
}

export const searchPlaylists = async (
  query: string,
  token: string,
  limit: number = 20
): Promise<PlaylistProps[]> => {
  if (!query || !token) return [];

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=playlist&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to search playlists");
    }

    const data: SearchPlaylistsResponse = await response.json();
    return data.playlists.items;
  } catch (error) {
    console.error("Error searching playlists:", error);
    return [];
  }
};
