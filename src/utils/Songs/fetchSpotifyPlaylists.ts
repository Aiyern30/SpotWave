import { PlaylistProps } from "@/lib/types";

export const fetchSpotifyPlaylists = async (
  token: string
): Promise<PlaylistProps[] | undefined> => {
  if (!token) {
    console.error("No token available");
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/playlists", {
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
