import { PlaylistProps } from "@/lib/types";

export const CreatePlaylist = async (userId: string, token: string) => {
  console.log("trigger");
  console.log("userId", userId);
  const playlistName = "My New Playlist";
  if (!playlistName || !userId) return null; // Return null if no userId or playlistName

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: playlistName,
          description: "New playlist created with the app.",
          public: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create playlist");
    }

    const data: PlaylistProps = await response.json();

    const finalData = {
      id: data.id,
      name: data.name,
    };

    return await finalData;
  } catch (error) {
    console.error("Error creating playlist:", error);
    return null; // Return null on error
  }
};
