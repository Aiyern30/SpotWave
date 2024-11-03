export const unfollowArtist = async (artistID: string, token: string) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/following?type=artist&ids=" + artistID,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: [artistID],
        }),
      }
    );
    if (!response.ok) {
      return { success: true, message: "Artist unfollowed successfully" };
    } else {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;
      return { success: false, message: errorMessage };
    }
  } catch (error) {
    return {
      success: false,
      message: "An error occurred while following the artist.",
    };
  }
};
