export const fetchPlaylistDetails = async (
  playlistID: string,
  token: string
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Failed to fetch playlist details:",
        response.statusText,
        errorText
      );
      return null;
    }

    const data = await response.json();
    console.log("Fetched playlist details:", data);
  } catch (error) {
    console.error("Error occurred while fetching playlist details:", error);
  }
};
