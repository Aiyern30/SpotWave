// Search for Shows (Podcasts) in Malaysia
export const fetchMalaysianShows = async (
  token: string,
  query: string = "malaysia"
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=show&market=MY&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to search shows");
    }

    const data = await response.json();
    return data.shows?.items || [];
  } catch (error) {
    console.error("Error searching shows:", error);
    return [];
  }
};

// Fetch Malaysian Podcast Categories
export const fetchPodcastCategories = async (token: string) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/browse/categories?country=MY&limit=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch podcast categories");
    }

    const data = await response.json();
    return data.categories?.items || [];
  } catch (error) {
    console.error("Error fetching podcast categories:", error);
    return [];
  }
};

// Discover Local Content using Keywords
export const fetchDiscoverPodcasts = async (token: string) => {
  const keywords = [
    "Malaysia",
    "Melayu",
    "Kuala Lumpur",
    "Sembang",
    "Sembang Kencang",
  ];
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  return fetchMalaysianShows(token, randomKeyword);
};

// Get Show Episodes (Updated for MY market)
export const fetchShowEpisodes = async (token: string, showId: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/shows/${showId}/episodes?market=MY&limit=50`,
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

// Get Single Episode (Updated for MY market)
export const fetchEpisode = async (token: string, episodeId: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/episodes/${episodeId}?market=MY`,
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

// Get Several Episodes (Updated for MY market)
export const fetchSeveralEpisodes = async (
  token: string,
  episodeIds: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/episodes?ids=${episodeIds.join(
        ","
      )}&market=MY`,
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
