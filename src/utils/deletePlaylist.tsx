export const deletePlaylist = async (playlistID: string, token: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistID}/followers`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok && response.status === 200) {
      return true;
    } else {
      console.error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error deleting playlist:", error);
  }
};
