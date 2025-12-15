// analyzePlaylistGenres.ts - AI-powered analysis
import type { PlaylistTrack } from "@/lib/types";

interface PlaylistAnalysis {
  genres: string[];
  moods: string[];
  eras: string[];
  artistStyles: string[];
  searchTerms: string[];
  summary: string;
}

export async function analyzePlaylistGenres(
  tracks: PlaylistTrack[],
  token: string
): Promise<PlaylistAnalysis> {
  try {
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
        moods: ["upbeat"],
        eras: ["modern"],
        artistStyles: [],
        searchTerms: ["pop", "rock"],
        summary: "Mixed playlist",
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
        moods: ["upbeat"],
        eras: ["modern"],
        artistStyles: [],
        searchTerms: ["pop", "rock"],
        summary: "Mixed playlist",
      };
    }

    const data = await response.json();
    const genreCounts: Record<string, number> = {};

    // Collect all genres
    data.artists.forEach((artist: any) => {
      if (artist && artist.genres) {
        artist.genres.forEach((genre: string) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre)
      .slice(0, 10);

    // Prepare track info for Gemini
    const trackList = tracks
      .slice(0, 20)
      .map(
        (t) =>
          `"${t.track.name}" by ${t.track.artists
            .map((a) => a.name)
            .join(", ")}`
      )
      .join("\n");

    console.log("Analyzing playlist with Gemini...");

    // Call Gemini API
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("Gemini API key not found");
      return {
        genres: topGenres.slice(0, 5),
        moods: ["upbeat"],
        eras: ["modern"],
        artistStyles: [],
        searchTerms: topGenres.slice(0, 3),
        summary: "Mixed playlist",
      };
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this music playlist and provide recommendations. 

Playlist tracks:
${trackList}

Spotify genres detected: ${topGenres.join(", ")}

Please analyze this playlist and return a JSON object with:
1. "moods": array of 3-5 mood descriptors (e.g., "energetic", "chill", "melancholic")
2. "eras": array of 2-3 time periods (e.g., "2010s", "90s", "modern")
3. "artistStyles": array of 3-5 similar artist names or musical styles
4. "searchTerms": array of 5-7 specific search terms that would find similar songs (e.g., "indie folk", "synth pop", "female vocalist")
5. "summary": a brief 1-sentence description of the playlist's vibe

Return ONLY valid JSON, no other text.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiResponse.status);
      return {
        genres: topGenres.slice(0, 5),
        moods: ["upbeat"],
        eras: ["modern"],
        artistStyles: [],
        searchTerms: topGenres.slice(0, 3),
        summary: "Mixed playlist",
      };
    }

    const geminiData = await geminiResponse.json();
    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Gemini response:", aiText);

    // Parse AI response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiAnalysis = JSON.parse(jsonMatch[0]);
      return {
        genres: topGenres.slice(0, 5),
        moods: aiAnalysis.moods || ["upbeat"],
        eras: aiAnalysis.eras || ["modern"],
        artistStyles: aiAnalysis.artistStyles || [],
        searchTerms: aiAnalysis.searchTerms || topGenres.slice(0, 3),
        summary: aiAnalysis.summary || "Mixed playlist",
      };
    }

    // Fallback if parsing fails
    return {
      genres: topGenres.slice(0, 5),
      moods: ["upbeat"],
      eras: ["modern"],
      artistStyles: [],
      searchTerms: topGenres.slice(0, 3),
      summary: "Mixed playlist",
    };
  } catch (error) {
    console.error("Error analyzing playlist:", error);
    return {
      genres: ["pop", "rock"],
      moods: ["upbeat"],
      eras: ["modern"],
      artistStyles: [],
      searchTerms: ["pop", "rock"],
      summary: "Mixed playlist",
    };
  }
}
