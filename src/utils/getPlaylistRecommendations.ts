// getPlaylistRecommendations.ts
import type { Track } from "@/lib/types";

// Cache for recommendations to avoid repeated API calls
const recommendationsCache = new Map<
  string,
  { tracks: Track[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getPlaylistRecommendations(
  analysis: any,
  token: string,
  existingTrackIds: string[] = [],
  offset: number = 0
): Promise<Track[]> {
  try {
    const cacheKey = `${JSON.stringify(analysis)}_${offset}`;

    // Check cache first
    const cached = recommendationsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("✅ Using cached recommendations");
      return cached.tracks.filter(
        (track) => !existingTrackIds.includes(track.id)
      );
    }

    console.log("=== Fetching new recommendations from Spotify ===");

    // Use Spotify's recommendations API with the analyzed data
    const { genres = [], moods = [], searchTerms = [] } = analysis;

    // Get seed genres (max 5 for Spotify API)
    const seedGenres = genres
      .slice(0, 3)
      .map((g: string) => g.toLowerCase().replace(/\s+/g, "-"));

    // Build search queries for variety
    const searchQueries = [
      ...searchTerms.slice(0, 5),
      ...genres.slice(0, 3).map((g: string) => `genre:${g}`),
      ...moods.slice(0, 2).map((m: string) => `${m} music`),
    ];

    const allTracks: Track[] = [];
    const seenIds = new Set<string>();

    // Search for tracks using different strategies
    for (let i = 0; i < Math.min(searchQueries.length, 5); i++) {
      const query = searchQueries[(i + offset) % searchQueries.length];

      try {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Rate limiting delay

        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            query
          )}&type=track&limit=4`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const tracks = data.tracks?.items || [];

          tracks.forEach((track: Track) => {
            if (
              !seenIds.has(track.id) &&
              !existingTrackIds.includes(track.id)
            ) {
              seenIds.add(track.id);
              allTracks.push(track);
            }
          });
        } else if (response.status === 429) {
          console.warn("Rate limited, stopping search");
          break;
        }
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }

      // Stop if we have enough recommendations
      if (allTracks.length >= 15) break;
    }

    // Try Spotify recommendations API as fallback/supplement
    if (allTracks.length < 10 && seedGenres.length > 0) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const params = new URLSearchParams({
          seed_genres: seedGenres.join(","),
          limit: "10",
        });

        const response = await fetch(
          `https://api.spotify.com/v1/recommendations?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const tracks = data.tracks || [];

          tracks.forEach((track: Track) => {
            if (
              !seenIds.has(track.id) &&
              !existingTrackIds.includes(track.id)
            ) {
              seenIds.add(track.id);
              allTracks.push(track);
            }
          });
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    }

    const finalTracks = allTracks.slice(0, 10);

    // Cache the results
    recommendationsCache.set(cacheKey, {
      tracks: finalTracks,
      timestamp: Date.now(),
    });

    console.log(`✅ Got ${finalTracks.length} unique recommendations`);
    return finalTracks;
  } catch (error) {
    console.error("Error in getPlaylistRecommendations:", error);
    return [];
  }
}

// Clear old cache entries periodically
export function clearOldCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  recommendationsCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => recommendationsCache.delete(key));
}
