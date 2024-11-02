export const searchTrackOnSpotify = async (
  trackName: string,
  artistName: string
): Promise<{ id: string; imageUrl: string; artistId: string } | null> => {
  const token = localStorage.getItem("Token");

  if (!token) {
    console.error("Spotify API token not found");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        trackName
      )} ${encodeURIComponent(artistName)}&type=track`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (data.tracks && data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      return {
        id: track.id,
        imageUrl: track.album.images[0]?.url || null,
        artistId: track.artists[0]?.id || null,
      };
    }
  } catch (error) {
    console.error(
      `Error fetching track data from Spotify for ${trackName} by ${artistName}:`,
      error
    );
  }
  return null;
};
