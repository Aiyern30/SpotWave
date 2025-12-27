import type { PlaylistTrack } from "@/lib/types";

// Cache for playlist analysis
const tasteCache = new Map<string, { analysis: any; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function analyzePlaylistGenres(
  tracks: PlaylistTrack[],
  token: string
): Promise<any> {
  try {
    // Create a cache key from the first 20 track IDs to represent the playlist content
    const cacheKey = `playlist_${tracks
      .slice(0, 20)
      .map((t) => t.track.id)
      .join(",")}`;

    // Check cache
    const cached = tasteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.analysis;
    }

    // Identify unique artists in this playlist to get accurate genres from Spotify
    const artistIds = Array.from(
      new Set(tracks.flatMap((t) => t.track.artists.map((a) => a.id)))
    )
      .filter(Boolean)
      .slice(0, 50);

    let genres: string[] = [];
    let artistData: any[] = [];

    if (artistIds.length > 0) {
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists?ids=${artistIds.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (artistResponse.ok) {
        const data = await artistResponse.json();
        artistData = data.artists.filter(Boolean);
        genres = Array.from(new Set(artistData.flatMap((a) => a.genres)));
      }
    }

    // Collect era info from release dates of songs in this playlist
    const years = tracks
      .map((t) => {
        const date = (t.track.album as any).release_date;
        return date ? parseInt(date.split("-")[0]) : null;
      })
      .filter(Boolean) as number[];

    // Prepare metadata context for Gemini AI to generate a natural summary
    const context = {
      playlistGenres: genres.slice(0, 25),
      sampleArtists: artistData.slice(0, 15).map((a) => ({
        name: a.name,
        genres: a.genres,
      })),
      eras: [
        ...new Set(
          years.map((y) => {
            if (y >= 2020) return "2020s";
            if (y >= 2010) return "2010s";
            if (y >= 2000) return "2000s";
            if (y >= 1990) return "90s";
            if (y >= 1980) return "80s";
            return "Classics";
          })
        ),
      ],
    };

    console.log("Calling AI for playlist analysis...");

    const aiResponse = await fetch("/api/ai-recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "user-summary",
        context: JSON.stringify(context),
      }),
    });

    if (aiResponse.ok) {
      const result = await aiResponse.json();
      tasteCache.set(cacheKey, { analysis: result, timestamp: Date.now() });
      return result;
    }

    // Fallback if AI fails: Use direct genre extraction
    const fallback = {
      genres: genres.slice(0, 5),
      moods: ["Varied", "Musical"],
      eras: context.eras.slice(0, 3),
      artistStyles: artistData.slice(0, 5).map((a) => a.name),
      searchTerms: genres.slice(0, 3).map((g) => `${g} hits`),
    };

    return fallback;
  } catch (error) {
    console.error("Error in analyzePlaylistGenres:", error);
    return {
      genres: ["Pop"],
      moods: ["Unknown"],
      eras: ["Modern"],
      artistStyles: [],
      searchTerms: [],
    };
  }
}
