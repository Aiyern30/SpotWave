import { PlaylistProps } from "@/lib/types";

export const fetchSpotifyPlaylists = async (
  token: string,
  userId?: string
): Promise<PlaylistProps[] | undefined> => {
  try {
    const url = userId
      ? `https://api.spotify.com/v1/users/${userId}/playlists`
      : "https://api.spotify.com/v1/me/playlists";

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch playlists");
    }

    const data = await response.json();

    return data.items as PlaylistProps[];
  } catch (error) {
    console.error("Error fetching playlists:", error);
  }
};
