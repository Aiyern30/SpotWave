import { User } from "@/lib/types";

export const fetchUserProfile = async (token: string) => {
  if (!token) {
    console.error("No token available");
    return;
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const data: User = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};
