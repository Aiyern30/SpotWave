// Search for Shows (Podcasts) in a specific market
export const fetchShowsByMarket = async (
  token: string,
  query: string = "podcast",
  market: string = "MY"
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=show&market=${market}&limit=50`,
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
    console.error(`Error searching shows (${market}):`, error);
    return [];
  }
};

// Fetch Podcast Categories for a country
export const fetchPodcastCategories = async (
  token: string,
  country: string = "MY"
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/browse/categories?country=${country}&limit=50`,
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
    console.error(`Error fetching podcast categories (${country}):`, error);
    return [];
  }
};

// Discover Podcasts for a market using generalized queries
export const fetchDiscoverPodcasts = async (
  token: string,
  market: string = "MY"
) => {
  // Instead of hardcoded local keywords, we use trending categories/queries
  const queries = ["top podcasts", "trending", "new releases", "daily"];

  // Also add some local context if it's Malaysia to help discover regional content specifically
  if (market === "MY") {
    queries.push("Malaysia", "Melayu", "Sembang");
  } else if (market === "US") {
    queries.push("USA", "NPR", "Joe Rogan"); // Common high-volume markers
  } else if (market === "GB") {
    queries.push("UK", "BBC", "British");
  }

  const randomQuery = queries[Math.floor(Math.random() * queries.length)];
  return fetchShowsByMarket(token, randomQuery, market);
};

// Get Show Episodes
export const fetchShowEpisodes = async (
  token: string,
  showId: string,
  market: string = "MY"
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/shows/${showId}/episodes?market=${market}&limit=50`,
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
export const fetchEpisode = async (
  token: string,
  episodeId: string,
  market: string = "MY"
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/episodes/${episodeId}?market=${market}`,
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
  episodeIds: string[],
  market: string = "MY"
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/episodes?ids=${episodeIds.join(
        ","
      )}&market=${market}`,
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
