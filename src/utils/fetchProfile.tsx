import { User } from "@/lib/types";

export const fetchUserProfile = async (token: string, userId?: string) => {
  if (!token) {
    console.error("No token available");
    return;
  }

  try {
    const url = userId
      ? `https://api.spotify.com/v1/users/${userId}`
      : "https://api.spotify.com/v1/me";

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    const data: User = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};
