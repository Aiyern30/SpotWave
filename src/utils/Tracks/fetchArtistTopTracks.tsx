export const fetchArtistTopTracks = async (id: string) => {
  const token = localStorage.getItem("Token");
  if (!token) return [];

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch top tracks:", response.statusText);
      return [];
    }

    const data = await response.json();
    return data.tracks;
  } catch (error) {
    console.error("Error fetching top tracks:", error);
    return [];
  }
};
