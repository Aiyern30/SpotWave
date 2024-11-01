export const AddSongsToTrack = async (
  playlistId: string,
  songId: string,
  token: string
): Promise<boolean> => {
  const requestUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [`spotify:track:${songId}`],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Track added to playlist:", data);
      return true; // Indicate success
    } else {
      console.error("Error adding track:", response.statusText);
      return false; // Indicate failure
    }
  } catch (error) {
    console.error("Error adding track:", error);
    return false; // Indicate failure in case of error
  }
};
