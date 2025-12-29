// Fetch Browse Categories
export const fetchBrowseCategories = async (token: string) => {
  try {
    const response = await fetch(
      "https://api.spotify.com/v1/browse/categories?limit=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();
    return data.categories.items;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

// Fetch Single Category
export const fetchCategory = async (token: string, categoryId: string) => {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/browse/categories/${categoryId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch category");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
};

export const fetchCategorySearch = async (
  token: string,
  categoryName: string
) => {
  const query = encodeURIComponent(categoryName);

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track,album,playlist&market=MY&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Failed to fetch category search");
    }

    const data = await res.json();
    return {
      tracks: data.tracks?.items || [],
      albums: data.albums?.items || [],
      playlists: data.playlists?.items || [],
    };
  } catch (error) {
    console.error("Error in fetchCategorySearch:", error);
    return {
      tracks: [],
      albums: [],
      playlists: [],
    };
  }
};
