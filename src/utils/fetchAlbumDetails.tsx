import { Album } from "@/lib/types";

export const fetchAlbumDetails = async (
  id: string,
  token: string
): Promise<Album | null> => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch album details: ${response.status} - ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching album details:", error);
    return null;
  }
};
