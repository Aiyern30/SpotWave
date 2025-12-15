import type { PlaylistTrack } from "@/lib/types";

// Cache for genre analysis
const analysisCache = new Map<string, { analysis: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function analyzePlaylistGenres(
  tracks: PlaylistTrack[],
  token: string
): Promise<any> {
  try {
    // Create cache key based on track IDs
    const trackIds = tracks
      .slice(0, 20)
      .map((t) => t.track.id)
      .join(",");
    const cacheKey = `analysis_${trackIds}`;

    // Check cache first
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("✅ Using cached analysis");
      return cached.analysis;
    }

    // Get unique artist IDs
    const artistIds = Array.from(
      new Set(tracks.flatMap((t) => t.track.artists.map((a) => a.id)))
    )
      .filter(Boolean)
      .slice(0, 50);

    if (artistIds.length === 0) {
      console.log("No artist IDs found");
      return {
        genres: ["pop", "rock"],
        moods: ["energetic"],
        eras: ["modern"],
        artistStyles: [],
        searchTerms: ["popular music", "trending songs"],
      };
    }

    console.log(`Fetching genres for ${artistIds.length} artists`);

    // Fetch artist data from Spotify
    const response = await fetch(
      `https://api.spotify.com/v1/artists?ids=${artistIds.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch artist data:", response.status);
      return {
        genres: ["pop", "rock"],
        moods: ["energetic"],
        eras: ["modern"],
        artistStyles: [],
        searchTerms: ["popular music"],
      };
    }

    const data = await response.json();
    const genreCounts: Record<string, number> = {};

    // Count genre occurrences
    data.artists.forEach((artist: any) => {
      if (artist && artist.genres) {
        artist.genres.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    // Sort genres by frequency
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre)
      .slice(0, 5);

    console.log("Top genres found:", sortedGenres);

    // Build analysis object without AI
    const analysis = {
      genres: sortedGenres.length > 0 ? sortedGenres : ["pop", "rock", "indie"],
      moods: ["energetic", "upbeat"],
      eras: ["modern", "contemporary"],
      artistStyles: tracks.slice(0, 5).map((t) => t.track.artists[0].name),
      searchTerms: sortedGenres.slice(0, 3).map((g) => `${g} music`),
    };

    // Cache the result
    analysisCache.set(cacheKey, {
      analysis,
      timestamp: Date.now(),
    });

    return analysis;
  } catch (error) {
    console.error("Error analyzing playlist genres:", error);
    return {
      genres: ["pop", "rock"],
      moods: ["energetic"],
      eras: ["modern"],
      artistStyles: [],
      searchTerms: ["popular music"],
    };
  }
}
