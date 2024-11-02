import { RecentTracksProps } from "@/lib/types";

export const fetchRecentlyPlayed = async (
  token: string
): Promise<RecentTracksProps[]> => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error fetching recently played tracks:", data);
      return [];
    }

    return data.items;
  } catch (error) {
    console.error("Error fetching recently played tracks:", error);
    return [];
  }
};
