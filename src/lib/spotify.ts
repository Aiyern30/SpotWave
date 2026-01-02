// Spotify API functions for saving/checking tracks

/**
 * Check if tracks are saved in user's library
 * @param trackIds - Array of Spotify track IDs
 * @returns Array of booleans indicating if each track is saved
 */
export const checkUserSavedTracks = async (
  trackIds: string[]
): Promise<boolean[]> => {
  try {
    const accessToken = await getAccessToken(); // Your function to get token

    // Convert array to comma-separated string
    const idsParam = trackIds.join(",");

    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks/contains?ids=${idsParam}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Failed to check saved tracks: ${response.status} ${response.statusText} - ${errText}`
      );
    }

    return await response.json();
  } catch (error: any) {
    console.warn("⚠️ Spotify API Error (Check Saved Tracks):", error.message);
    // Return empty array instead of throwing to prevent component crashes
    return trackIds.map(() => false);
  }
};

/**
 * Save tracks to user's library
 * @param trackIds - Array of Spotify track IDs to save
 */
export const saveTracksForUser = async (trackIds: string[]): Promise<void> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch("https://api.spotify.com/v1/me/tracks", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: trackIds }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to save tracks: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error saving tracks:", error);
    throw new Error("Failed to save tracks");
  }
};

/**
 * Remove tracks from user's library
 * @param trackIds - Array of Spotify track IDs to remove
 */
export const removeTracksFromUser = async (
  trackIds: string[]
): Promise<void> => {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch("https://api.spotify.com/v1/me/tracks", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: trackIds }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to remove tracks: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error removing tracks:", error);
    throw new Error("Failed to remove tracks");
  }
};

// Placeholder - replace with your actual token retrieval function
async function getAccessToken(): Promise<string> {
  const token = localStorage.getItem("Token");

  if (!token) {
    console.error("No access token found.");
    throw new Error("No access token found");
  }

  return token;
}
