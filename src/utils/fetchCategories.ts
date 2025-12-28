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
