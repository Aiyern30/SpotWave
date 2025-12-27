import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { type, context } = await req.json();
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.error("❌ Gemini API Key Missing!");
      return NextResponse.json(
        {
          error:
            "Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local",
        },
        { status: 500 }
      );
    }

    const systemInstruction =
      "You are a specialized music quiz assistant. You MUST return ONLY a raw JSON array. Do not include any text before or after the JSON. If you cannot provide a specific recommendation, provide a creative generic music alternative.";

    let prompt = "";
    if (type === "artist") {
      prompt = `${systemInstruction} Suggest 5 popular music artists for a song guessing quiz. Context: ${
        context || "General popular music"
      }. Format: ["Artist 1", "Artist 2", "Artist 3", "Artist 4", "Artist 5"]`;
    } else if (type === "playlist") {
      prompt = `${systemInstruction} Suggest 5 popular music playlist themes for a song guessing quiz. Context: ${
        context || "General popular music"
      }. Format: ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"]`;
    } else if (type === "ideas") {
      prompt = `${systemInstruction} Suggest 4 creative music playlist ideas for a song guessing quiz with a 'title' and a brief 'description' (mentioning example artists). Context: ${
        context || "General popular music"
      }. Example: [{"title": "Classic Hits", "description": "Hits from Queen and ABBA"}]`;
    } else if (type === "quiz-tracks") {
      prompt = `${systemInstruction} Suggest 10 specific and diverse songs for a song guessing quiz based on this theme: ${
        context || "General popular music"
      }. Return ONLY a JSON array of objects with 'song' and 'artist' keys. Example: [{"song": "Bohemian Rhapsody", "artist": "Queen"}]`;
    } else if (type === "ai-search") {
      prompt = `${systemInstruction} Suggest 10 specific songs for a playlist based on this prompt or genre: ${context}. 
      Return ONLY a JSON array of objects with 'song' and 'artist' keys. 
      Example: [{"song": "Blinding Lights", "artist": "The Weeknd"}]`;
    } else if (type === "user-summary") {
      prompt = `${systemInstruction} Analyze this user's music library based on the following genres and artists. 
      Context: ${context}.
      Return ONLY a JSON object with:
      "genres": [5 most representative genres],
      "moods": [5 descriptive moods for this music type],
      "eras": [3-4 music eras represented, e.g. "80s Classics", "Modern Pop"],
      "artistStyles": [4-5 descriptive styles of the artists they like],
      "searchTerms": [5 specific search queries they would use to find similar new music]
      Example: {"genres": ["Pop", "R&B"], "moods": ["Chilly", "Energetic"], "eras": ["Modern"], "artistStyles": ["Polished"], "searchTerms": ["Pop hits"]}`;
    } else {
      prompt = `${systemInstruction} Suggest 5 ideas for a music quiz. Context: ${
        context || "General popular music"
      }`;
    }

    // List of models to try based on latest 2025/2026 quotas.
    // Prioritizing Flash-Lite for its massive 1,000 RPD quota.
    const attempts = [
      { version: "v1", model: "gemini-2.5-flash-lite" }, // High quota (1,000 RPD)
      { version: "v1", model: "gemini-3-flash" }, // Newest tech
      { version: "v1", model: "gemini-2.5-flash" }, // (250 RPD)
      { version: "v1", model: "gemini-2.5-pro" }, // (100 RPD)
      { version: "v1", model: "gemini-1.5-flash" }, // Legacy stable
      { version: "v1", model: "gemini-1.5-pro" }, // Legacy pro
    ];

    let lastError = "";
    let data: any = null;

    for (const attempt of attempts) {
      try {
        console.log(
          `🤖 Attempting Gemini AI: ${attempt.version}/${attempt.model}`
        );

        const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        });

        if (response.ok) {
          data = await response.json();
          console.log(`✅ Gemini AI Success: ${attempt.model}`);
          break;
        } else {
          const err = await response.text();
          lastError = err;
          console.warn(`⚠️ Gemini AI Failed (${attempt.model}):`, err);
        }
      } catch (e: any) {
        lastError = e.message;
        console.warn(`⚠️ Exception for ${attempt.model}:`, e.message);
      }
    }

    // Default Fallback Suggestions if AI fails completely
    const fallbackSuggestions = [
      {
        title: "Mando-Pop Classics",
        description: "Timeless hits from Jay Chou, Jolin Tsai, and David Tao.",
      },
      {
        title: "TikTok Trending 2025",
        description: "The latest viral hits moving the world right now.",
      },
      {
        title: "Golden Era Indie",
        description:
          "Atmospheric tracks from No Party For Cao Dong and Deca Joins.",
      },
      {
        title: "80s City Pop Vibes",
        description:
          "Japanese and Mandopop city pop classics for a retro feel.",
      },
    ];

    const fallbackTracks = [
      { song: "Bohemian Rhapsody", artist: "Queen" },
      { song: "Shape of You", artist: "Ed Sheeran" },
      { song: "Blinding Lights", artist: "The Weeknd" },
      { song: "七里香", artist: "周杰倫" },
      { song: "Bad Guy", artist: "Billie Eilish" },
      { song: "Someone Like You", artist: "Adele" },
      { song: "Stay", artist: "The Kid LAROI & Justin Bieber" },
      { song: "Dancing Queen", artist: "ABBA" },
      { song: "Hotel California", artist: "Eagles" },
      { song: "Sunflower", artist: "Post Malone" },
    ];

    if (!data) {
      console.error(
        "❌ All AI models failed. Last error from provider:",
        lastError
      );
      return NextResponse.json({
        recommendations:
          type === "ideas" ? fallbackSuggestions : fallbackTracks,
        _error: lastError, // Adding hint for debugging
      });
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn("⚠️ AI returned empty candidate, using fallbacks.");
      return NextResponse.json({
        recommendations:
          type === "ideas" ? fallbackSuggestions : ["Jay Chou", "Taylor Swift"],
      });
    }

    console.log("📝 Raw AI response:", text);

    let recommendations;
    try {
      const cleanedText = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      recommendations = JSON.parse(cleanedText);
    } catch (e) {
      const firstBracket = text.indexOf("[");
      const lastBracket = text.lastIndexOf("]");

      if (
        firstBracket !== -1 &&
        lastBracket !== -1 &&
        lastBracket > firstBracket
      ) {
        const jsonBody = text.substring(firstBracket, lastBracket + 1);
        try {
          recommendations = JSON.parse(jsonBody);
        } catch (parseError) {
          console.error(
            "Failed to parse extracted JSON block, using fallbacks."
          );
          recommendations =
            type === "ideas"
              ? fallbackSuggestions
              : [
                  "Jay Chou",
                  "Taylor Swift",
                  "Queen",
                  "The Beatles",
                  "Linkin Park",
                ];
        }
      } else {
        console.warn("No JSON found in response, using fallbacks.");
        recommendations =
          type === "ideas"
            ? fallbackSuggestions
            : [
                "Jay Chou",
                "Taylor Swift",
                "Queen",
                "The Beatles",
                "Linkin Park",
              ];
      }
    }

    // Final clean up and validation
    if (type === "user-summary") {
      return NextResponse.json(recommendations);
    }

    if (!Array.isArray(recommendations)) {
      recommendations =
        type === "ideas" ? fallbackSuggestions : [recommendations];
    }

    if (recommendations.length === 0) {
      recommendations =
        type === "ideas" ? fallbackSuggestions : ["Jay Chou", "Taylor Swift"];
    }

    // Take specific count based on type
    const limit = type === "ideas" ? 4 : 5;
    recommendations = recommendations.slice(0, limit);

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error("❌ Critical AI Route Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
