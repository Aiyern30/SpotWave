// getPlaylistRecommendations.ts - AI-powered recommendations
import type { Track } from "@/lib/types";

interface PlaylistAnalysis {
  genres: string[];
  moods: string[];
  eras: string[];
  artistStyles: string[];
  searchTerms: string[];
  summary: string;
}

export async function getPlaylistRecommendations(
  analysis: PlaylistAnalysis,
  token: string,
  existingTrackIds: string[] = []
): Promise<Track[]> {
  try {
    console.log("=== AI-Powered Recommendations ===");
    console.log("Analysis:", analysis);

    const allTracks: Track[] = [];
    const seenIds = new Set(existingTrackIds);

    // Strategy 1: Use Gemini to generate smart search queries
    const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("Gemini API key not found, using fallback search");
      return await fallbackSearch(analysis, token, seenIds);
    }

    console.log("Asking Gemini for search strategies...");

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
                  text: `Based on this playlist analysis, generate 5 specific Spotify search queries that would find similar songs:

Genres: ${analysis.genres.join(", ")}
Moods: ${analysis.moods.join(", ")}
Eras: ${analysis.eras.join(", ")}
Similar Artists: ${analysis.artistStyles.join(", ")}
Summary: ${analysis.summary}

Return ONLY a JSON array of 5 search query strings. Each query should be specific and combine artist names, genres, or moods. Examples:
["indie folk female vocalist", "Mac DeMarco similar artists", "chill synth pop 2010s"]

Return ONLY the JSON array, no other text.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiResponse.status);
      return await fallbackSearch(analysis, token, seenIds);
    }

    const geminiData = await geminiResponse.json();
    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Gemini search queries:", aiText);

    // Parse search queries
    const jsonMatch = aiText.match(/\[[\s\S]*?\]/);
    let searchQueries: string[] = [];

    if (jsonMatch) {
      try {
        searchQueries = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse Gemini response:", e);
        searchQueries = analysis.searchTerms.slice(0, 5);
      }
    } else {
      searchQueries = analysis.searchTerms.slice(0, 5);
    }

    console.log("Using search queries:", searchQueries);

    // Execute searches
    for (const query of searchQueries) {
      try {
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            query
          )}&type=track&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const tracks: Track[] = data.tracks.items || [];

          for (const track of tracks) {
            if (!seenIds.has(track.id) && allTracks.length < 20) {
              allTracks.push(track);
              seenIds.add(track.id);
            }
          }
        }
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }

      if (allTracks.length >= 20) break;
    }

    // If we still don't have enough tracks, use artist styles
    if (allTracks.length < 10) {
      for (const artist of analysis.artistStyles.slice(0, 3)) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(
              artist
            )}&type=track&limit=10`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const tracks: Track[] = data.tracks.items || [];

            for (const track of tracks) {
              if (!seenIds.has(track.id) && allTracks.length < 20) {
                allTracks.push(track);
                seenIds.add(track.id);
              }
            }
          }
        } catch (error) {
          console.error(`Error searching for artist "${artist}":`, error);
        }

        if (allTracks.length >= 20) break;
      }
    }

    console.log(`✅ Found ${allTracks.length} AI-recommended tracks`);
    return allTracks.slice(0, 10);
  } catch (error) {
    console.error("Error in AI recommendations:", error);
    return [];
  }
}

// Fallback search without AI
async function fallbackSearch(
  analysis: PlaylistAnalysis,
  token: string,
  seenIds: Set<string>
): Promise<Track[]> {
  const allTracks: Track[] = [];

  // Use the pre-generated search terms
  for (const term of analysis.searchTerms.slice(0, 5)) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          term
        )}&type=track&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const tracks: Track[] = data.tracks.items || [];

        for (const track of tracks) {
          if (!seenIds.has(track.id) && allTracks.length < 20) {
            allTracks.push(track);
            seenIds.add(track.id);
          }
        }
      }
    } catch (error) {
      console.error(`Error searching for "${term}":`, error);
    }

    if (allTracks.length >= 20) break;
  }

  return allTracks.slice(0, 10);
}
