// Get Show Episodes
export const fetchShowEpisodes = async (token: string, showId: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/shows/${showId}/episodes?market=US&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch episodes");
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return [];
  }
};

// Get Single Episode
export const fetchEpisode = async (token: string, episodeId: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/episodes/${episodeId}?market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch episode");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching episode:", error);
    return null;
  }
};

// Get Several Episodes
export const fetchSeveralEpisodes = async (
  token: string,
  episodeIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/episodes?ids=${episodeIds.join(
        ","
      )}&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch episodes");
    }

    const data = await response.json();
    return data.episodes;
  } catch (error) {
    console.error("Error fetching episodes:", error);
    return [];
  }
};

// Get User's Saved Episodes
export const fetchUserSavedEpisodes = async (token: string) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/me/episodes?limit=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch saved episodes");
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error("Error fetching saved episodes:", error);
    return [];
  }
};

// Save Episodes for Current User
export const saveEpisodesForUser = async (
  token: string,
  episodeIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/episodes?ids=${episodeIds.join(",")}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to save episodes");
    }

    return true;
  } catch (error) {
    console.error("Error saving episodes:", error);
    return false;
  }
};

// Remove User's Saved Episodes
export const removeEpisodesFromUser = async (
  token: string,
  episodeIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/episodes?ids=${episodeIds.join(",")}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to remove episodes");
    }

    return true;
  } catch (error) {
    console.error("Error removing episodes:", error);
    return false;
  }
};

// Check User's Saved Episodes
export const checkUserSavedEpisodes = async (
  token: string,
  episodeIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/episodes/contains?ids=${episodeIds.join(
        ","
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to check saved episodes");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking saved episodes:", error);
    return [];
  }
};
