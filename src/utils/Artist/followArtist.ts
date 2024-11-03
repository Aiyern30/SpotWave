export const followArtist = async (artistID: string, token: string) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/following?type=artist&ids=" + artistID,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      return { success: true, message: "Artist followed successfully" };
    } else {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || response.statusText;
      return { success: false, message: errorMessage };
    }
  } catch (error) {
    console.error("Error following artist:", error);
    // Ensure a consistent return object even on error
    return {
      success: false,
      message: "An error occurred while following the artist.",
    };
  }
};
