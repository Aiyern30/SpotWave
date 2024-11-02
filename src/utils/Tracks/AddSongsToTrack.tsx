export const AddSongsToTrack = async (
  playlistId: string,
  songId: string,
  token: string
): Promise<{ success: boolean; message: string }> => {
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
      return { success: true, message: "Track added successfully" };
    } else {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;
      console.error("Error adding track:", errorMessage);
      return { success: false, message: errorMessage };
    }
  } catch (error) {
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error adding track:", errorMessage);
    return { success: false, message: errorMessage };
  }
};
