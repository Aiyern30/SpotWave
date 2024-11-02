export const removePlaylist = async (
  playlistID: string,
  trackID: string,
  token: string
) => {
  try {
    const requestUrl = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;

    const response = await fetch(requestUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracks: [{ uri: `spotify:track:${trackID}` }],
      }),
    });
    if (response.ok) {
      return { success: true, message: "Track removed successfully" };
    } else {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;
      return { success: false, message: errorMessage };
    }
  } catch (error) {
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error removing track:", errorMessage);
    return { success: false, message: errorMessage };
  }
};
