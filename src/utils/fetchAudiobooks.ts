// Utility to fetch audiobooks from Spotify
export const fetchAudiobooks = async (
  token: string,
  query: string = "popular",
  limit: number = 50
) => {
  try {
    // We search for audiobooks. Market is required as audiobooks are restricted.
    // Defaulting to 'US' to ensure we see content even if the user's market is restricted,
    // though they might need a US-eligible account to play.
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=audiobook&limit=${limit}&market=US`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch audiobooks");
    }

    const data = await response.json();
    return data.audiobooks?.items || [];
  } catch (error) {
    console.error("Error fetching audiobooks:", error);
    return [];
  }
};

// Advanced Discovery: Try multiple queries if one fails
export const fetchDiscoverAudiobooks = async (token: string) => {
  const discoveryQueries = ["featured", "new releases", "top", "trending"];

  // Try to get a mix of results
  try {
    const results = await Promise.all(
      discoveryQueries.map((q) => fetchAudiobooks(token, q, 10))
    );

    // Flatten and remove duplicates by ID
    const allBooks = results.flat();
    const seen = new Set();
    return allBooks.filter((book) => {
      if (!book || seen.has(book.id)) return false;
      seen.add(book.id);
      return true;
    });
  } catch (error) {
    return [];
  }
};

// Fetch specific categories of audiobooks to act as recommendations
export const fetchAudiobookRecommendations = async (token: string) => {
  // We can fetch a few "topics" to give variety
  const topics = [
    "bestseller",
    "trending",
    "classics",
    "thriller",
    "self-help",
    "history",
    "fantasy",
    "mystery",
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  return fetchAudiobooks(token, randomTopic);
};

// Fetch User's Saved Audiobooks
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
export const saveAudiobooksForUser = async (token: string, ids: string[]) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/audiobooks?ids=${ids.join(",")}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error saving audiobooks:", error);
    return false;
  }
};

// Remove User's Saved Audiobooks
export const removeAudiobooksFromUser = async (
  token: string,
  ids: string[]
) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/audiobooks?ids=${ids.join(",")}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error removing audiobooks:", error);
    return false;
  }
};

// Fetch a single audiobook's details
export const fetchAudiobookDetails = async (
  token: string,
  audiobookId: string
) => {
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
      throw new Error("Failed to fetch audiobook details");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching audiobook details:", error);
    return null;
  }
};
