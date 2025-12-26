export const fetchLikedSongs = async (token: string, limit: number = 50) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch liked songs");

    const data = await response.json();
    return data.items.map((item: any) => item.track);
  } catch (error) {
    console.error("Error fetching liked songs:", error);
    return [];
  }
};
