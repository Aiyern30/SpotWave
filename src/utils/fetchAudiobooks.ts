// Fetch Audiobooks
export const fetchAudiobooks = async (token: string) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/audiobooks?ids=7iHfbu1YPACw6oZPAFJtqe,1HGw3J3NxZO1TP1BTtVhpZ,7ouMYWpwJ422jRcDASZB7P,4VqPOruhp5EdPBeR92t6lQ,2takcwOaAZWiXQijPHIx7B&market=US",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch audiobooks");
    }

    const data = await response.json();
    return data.audiobooks;
  } catch (error) {
    console.error("Error fetching audiobooks:", error);
    return [];
  }
};

// Get Single Audiobook
export const fetchAudiobook = async (token: string, audiobookId: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/audiobooks/${audiobookId}?market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch audiobook");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching audiobook:", error);
    return null;
  }
};

// Get User's Saved Audiobooks
export const fetchUserSavedAudiobooks = async (token: string) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/audiobooks?limit=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch saved audiobooks");
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error("Error fetching saved audiobooks:", error);
    return [];
  }
};

// Save Audiobooks for Current User
export const saveAudiobooksForUser = async (
  token: string,
  audiobookIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/audiobooks?ids=${audiobookIds.join(",")}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to save audiobooks");
    }

    return true;
  } catch (error) {
    console.error("Error saving audiobooks:", error);
    return false;
  }
};

// Remove User's Saved Audiobooks
export const removeAudiobooksFromUser = async (
  token: string,
  audiobookIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/audiobooks?ids=${audiobookIds.join(",")}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to remove audiobooks");
    }

    return true;
  } catch (error) {
    console.error("Error removing audiobooks:", error);
    return false;
  }
};

// Check User's Saved Audiobooks
export const checkUserSavedAudiobooks = async (
  token: string,
  audiobookIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/audiobooks/contains?ids=${audiobookIds.join(
        ","
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to check saved audiobooks");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking saved audiobooks:", error);
    return [];
  }
};
