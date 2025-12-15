import type { PlaylistTrack } from "@/lib/types";

export async function analyzePlaylistGenres(
  tracks: PlaylistTrack[],
  token: string
) {
  const artistIds = Array.from(
    new Set(tracks.flatMap((t) => t.track.artists.map((a) => a.id)))
  ).slice(0, 50); // Spotify allows up to 50 IDs per request

  const response = await fetch(
    `https://api.spotify.com/v1/artists?ids=${artistIds.join(",")}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  const genreCounts: Record<string, number> = {};

  data.artists.forEach((artist: any) => {
    artist.genres.forEach((genre: string) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  // Sort genres by frequency
  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);

  return sortedGenres.slice(0, 3); // Top 3 genres
}
