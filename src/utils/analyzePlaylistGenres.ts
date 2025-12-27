import type { PlaylistTrack } from "@/lib/types";

// Cache for taste analysis
const tasteCache = new Map<string, { analysis: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for taste

export async function analyzePlaylistGenres(
  tracks: PlaylistTrack[],
  token: string,
  options: { global?: boolean } = {}
): Promise<any> {
  try {
    const cacheKey = options.global
      ? `global_taste`
      : `playlist_${tracks
          .slice(0, 5)
          .map((t) => t.track.id)
          .join(",")}`;

    // Check cache
    const cached = tasteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.analysis;
    }

    let analyzeTracks = tracks;

    if (options.global) {
      console.log("Analyzing global user taste...");
      // Fetch user's top artists and tracks to get a better flavor
      try {
        const [topArtistsRes, playlistsRes] = await Promise.all([
          fetch("https://api.spotify.com/v1/me/top/artists?limit=20", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (topArtistsRes.ok && playlistsRes.ok) {
          const topArtistsData = await topArtistsRes.json();
          const playlistsData = await playlistsRes.json();

          // We can collect even more info from playlists if we wanted,
          // but top artists give us the best genres directly.
          // Let's also get top tracks to get artist/album/release dates
          const topTracksRes = await fetch(
            "https://api.spotify.com/v1/me/top/tracks?limit=20",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const topTracksData = await topTracksRes.json();

          analyzeTracks = topTracksData.items.map((t: any) => ({ track: t }));
        }
      } catch (e) {
        console.warn(
          "Failed to fetch global taste data, falling back to provided tracks",
          e
        );
      }
    }

    // Identify unique artists to get more genres
    const artistIds = Array.from(
      new Set(analyzeTracks.flatMap((t) => t.track.artists.map((a) => a.id)))
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

    // Collect era info from release dates
    const years = analyzeTracks
      .map((t) => {
        const date = (t.track.album as any).release_date;
        return date ? parseInt(date.split("-")[0]) : null;
      })
      .filter(Boolean) as number[];

    // Prepare context for AI
    const context = {
      topGenres: genres.slice(0, 20),
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
            return "Early Classics";
          })
        ),
      ],
    };

    console.log("Calling AI for taste analysis...");

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

    // Fallback if AI fails
    const fallback = {
      genres: genres.slice(0, 5),
      moods: ["Diverse", "Personal"],
      eras: ["Mixed Eras"],
      artistStyles: artistData.slice(0, 5).map((a) => a.name),
      searchTerms: genres.slice(0, 3).map((g) => `${g} music`),
    };

    return fallback;
  } catch (error) {
    console.error("Error in analyzePlaylistGenres:", error);
    return {
      genres: ["Unknown"],
      moods: ["Unknown"],
      eras: ["Unknown"],
      artistStyles: [],
      searchTerms: [],
    };
  }
}
