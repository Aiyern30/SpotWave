// getPlaylistRecommendations.ts
import type { Track } from "@/lib/types";

const SPOTIFY_SEED_GENRES = [
  "acoustic",
  "afrobeat",
  "alt-rock",
  "alternative",
  "ambient",
  "anime",
  "black-metal",
  "bluegrass",
  "blues",
  "bossanova",
  "brazil",
  "breakbeat",
  "british",
  "cantopop",
  "chicago-house",
  "children",
  "chill",
  "classical",
  "club",
  "comedy",
  "country",
  "dance",
  "dancehall",
  "death-metal",
  "deep-house",
  "detroit-techno",
  "disco",
  "disney",
  "drum-and-bass",
  "dub",
  "dubstep",
  "edm",
  "electro",
  "electronic",
  "emo",
  "folk",
  "forro",
  "french",
  "funk",
  "garage",
  "german",
  "gospel",
  "goth",
  "grindcore",
  "groove",
  "grunge",
  "guitar",
  "happy",
  "hard-rock",
  "hardcore",
  "hardstyle",
  "heavy-metal",
  "hip-hop",
  "holidays",
  "honky-tonk",
  "house",
  "idm",
  "indian",
  "indie",
  "indie-pop",
  "industrial",
  "iranian",
  "j-dance",
  "j-idol",
  "j-pop",
  "j-rock",
  "jazz",
  "k-pop",
  "kids",
  "latin",
  "latino",
  "malay",
  "mandopop",
  "metal",
  "metal-misc",
  "metalcore",
  "minimal-techno",
  "movies",
  "mpb",
  "new-age",
  "new-release",
  "opera",
  "pagode",
  "party",
  "philippines-opm",
  "piano",
  "pop",
  "pop-film",
  "post-dubstep",
  "power-pop",
  "progressive-house",
  "psych-rock",
  "punk",
  "punk-rock",
  "r-n-b",
  "rainy-day",
  "reggae",
  "reggaeton",
  "road-trip",
  "rock",
  "rock-n-roll",
  "rockabilly",
  "romance",
  "sad",
  "salsa",
  "samba",
  "sertanejo",
  "show-tunes",
  "singer-songwriter",
  "ska",
  "sleep",
  "songwriter",
  "soul",
  "soundtracks",
  "spanish",
  "study",
  "summer",
  "swedish",
  "synth-pop",
  "tango",
  "techno",
  "trance",
  "trip-hop",
  "turkish",
  "work-out",
  "world-music",
];

// Helper function to normalize genre names
function normalizeGenre(genre: string): string {
  return genre.toLowerCase().trim().replace(/\s+/g, "-");
}

// Helper function to find closest matching Spotify genre
function findClosestGenre(genre: string): string | null {
  const normalized = normalizeGenre(genre);

  // Exact match
  if (SPOTIFY_SEED_GENRES.includes(normalized)) {
    return normalized;
  }

  // Partial match (e.g., "indie rock" -> "indie")
  const partial = SPOTIFY_SEED_GENRES.find(
    (sg) => normalized.includes(sg) || sg.includes(normalized)
  );

  return partial || null;
}

export async function getPlaylistRecommendations(
  genres: string[],
  token: string,
  existingTrackIds: string[] = []
): Promise<Track[]> {
  try {
    // Map genres to valid Spotify seed genres
    const validGenres = genres
      .map(findClosestGenre)
      .filter((g): g is string => g !== null)
      .slice(0, 5); // Spotify allows up to 5 seed values total

    if (validGenres.length === 0) {
      // Fallback to popular genres if no matches found
      const fallbackGenres = ["pop", "rock", "indie"];
      validGenres.push(...fallbackGenres.slice(0, 2));
    }

    const params = new URLSearchParams({
      seed_genres: validGenres.slice(0, 5).join(","),
      limit: "20", // Get more to filter out duplicates
      market: "US", // Optional: specify market for better results
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

    if (!response.ok) {
      console.error("Recommendations API error:", response.status);
      return [];
    }

    const data = await response.json();
    const tracks: Track[] = data.tracks || [];

    // Filter out tracks that are already in the playlist
    const filteredTracks = tracks.filter(
      (track) => !existingTrackIds.includes(track.id)
    );

    return filteredTracks.slice(0, 10); // Return top 10 unique recommendations
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
}
