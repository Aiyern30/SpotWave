import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { type, context } = await req.json();
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    // Conditional logging helpers: only active during development
    const isProd = process.env.NODE_ENV === "production";
    const shouldLog = !isProd && process.env.SHOW_AI_ROUTE_LOGS !== "false";
    const log = (...args: any[]) => {
      if (shouldLog) console.log(...args);
    };
    const warn = (...args: any[]) => {
      if (shouldLog) console.warn(...args);
    };
    const error = (...args: any[]) => {
      if (shouldLog) console.error(...args);
    };

    if (!openRouterKey && !apiKey) {
      console.error("AI provider key missing");
      return NextResponse.json(
        {
          error:
            "AI not configured. Add OPENROUTER_API_KEY to your server environment.",
        },
        { status: 500 }
      );
    }

    const systemInstruction =
      "You are a specialized music assistant. You MUST return ONLY a raw JSON response (either an array or an object as requested). Do not include any text before or after the JSON. If you cannot provide a specific recommendation, provide a creative generic music alternative.";

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
      const searchContext = typeof context === "string" ? context : "";
      const countMatch = searchContext.match(/count:(\d+)/);
      const count = countMatch ? countMatch[1] : "10";
      const cleanContext = searchContext.replace(/count:\d+/, "").trim();

      prompt = `${systemInstruction} Suggest exactly ${count} specific and high-quality songs for a music playlist.
      User Prompt/Context: "${cleanContext}".
      
      CRITICAL INSTRUCTIONS:
      1. DO NOT suggest any songs that are mentioned as 'EXCLUDE' or 'existing' in the context.
      2. Prioritize variety and fresh discovery. 
      3. Avoid well-known chart-toppers if the user is looking for a specific vibe, unless they fit perfectly.
      4. Ensure all songs are available on major streaming platforms.

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
    } else if (type === "playlist-naming") {
      const lengthInstruction =
        context?.length === "short"
          ? "Keep the description very short and punchy (max 10 words)."
          : "Make the description detailed and expressive (2-3 sentences).";

      const userContext = context?.userPrompt
        ? `User specific vibe request: "${context?.userPrompt}".`
        : "";

      prompt = `${systemInstruction} Based on this playlist information: ${context?.playlistInfo}. ${userContext} ${lengthInstruction} Generate a creative and catchy playlist name and a description. Return ONLY a JSON object with 'name' and 'description' keys. Example: {"name": "Sunset Vibes", "description": "Chill beats and mellow tracks perfect for watching the sunset."}`;
    } else {
      prompt = `${systemInstruction} Suggest 5 ideas for a music quiz. Context: ${
        context || "General popular music"
      }`;
    }

    // List of models to try based on latest 2026 quotas.
    // Prioritizing Gemini 3 and Gemma 3 which often have fresh or larger quotas.
    const attempts = [
      { version: "v1beta", model: "gemini-3-flash" }, // Newest tech, usually separate quota
      { version: "v1", model: "gemini-3-flash" },
      { version: "v1beta", model: "gemma-3-27b" }, // High quota (14.4K RPD)
      { version: "v1", model: "gemma-3-27b" },
      { version: "v1beta", model: "gemma-3-12b" }, // High quota fallback
      { version: "v1", model: "gemma-3-12b" },
      { version: "v1", model: "gemini-2.5-flash-lite" },
      { version: "v1", model: "gemini-2.5-flash" },
      { version: "v1", model: "gemini-1.5-flash" },
      { version: "v1", model: "gemini-1.5-pro" },
    ];

    let lastError = "";
    let data: any = null;

    // Every AI feature uses this route. OpenRouter always gets the first attempt.
    if (openRouterKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "X-Title": "SpotWave",
          },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || "openrouter/auto",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 4096,
          }),
        });
        if (!response.ok) {
          lastError = `OpenRouter returned HTTP ${response.status}`;
        } else {
          const completion = await response.json();
          const content = completion.choices?.[0]?.message?.content;
          if (typeof content !== "string" || !content.trim()) {
            throw new Error("Empty response");
          }
          const cleaned = content.replace(/```(?:json)?\s*/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON result");
          // Keep the existing response normalization shared by both providers.
          data = { candidates: [{ content: { parts: [{ text: JSON.stringify(parsed) }] } }] };
          log("AI success: OpenRouter");
        }
      } catch {
        lastError = "OpenRouter response unavailable or invalid";
      }
      if (!data) warn(lastError, "Trying configured Gemini fallback.");
    }

    for (const attempt of data || !apiKey ? [] : attempts) {
      try {
          log(`🤖 Attempting AI Model: ${attempt.version}/${attempt.model}`);

        const url = `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          signal: AbortSignal.timeout(10000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (response.ok) {
          data = await response.json();
          log(`✅ AI Success: ${attempt.model} (${attempt.version})`);
          break;
        } else {
          const status = response.status;
          const errText = "Provider request failed";
          lastError = `Status ${status}: ${errText}`;

          if (status === 429) {
            warn(`⚠️ Rate Limit (429) for ${attempt.model}. Trying next...`);
          } else {
            warn(`⚠️ AI Failed (${attempt.model}) [${status}]:`, errText);
          }

          // If auth error, no point in trying other models with same key
          if (status === 401 || status === 403) {
            error("❌ Auth/API Key error. Stopping attempts.");
            break;
          }
        }
      } catch (e: any) {
        lastError = "Gemini request failed";
        warn(`AI fallback failed: ${attempt.model}`);
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
      error("❌ All AI models failed. Last error from provider:", lastError);

      if (type === "playlist-naming") {
        return NextResponse.json({
          recommendations: {
            name: "AI Generated Playlist",
            description: "A specially curated playlist just for you.",
          },
          _error: lastError,
        });
      }

      return NextResponse.json({
        recommendations:
          type === "ideas" ? fallbackSuggestions : fallbackTracks,
        _error: lastError, // Adding hint for debugging
      });
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      warn("⚠️ AI returned empty candidate, using fallbacks.");
      return NextResponse.json({
        recommendations:
          type === "ideas" ? fallbackSuggestions : ["Jay Chou", "Taylor Swift"],
      });
    }



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
          error("Failed to parse extracted JSON block, using fallbacks.");
          if (type === "playlist-naming") {
            recommendations = {
              name: "AI Generated Playlist",
              description: "A specially curated playlist just for you.",
            };
          } else {
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
      } else {
        warn("No JSON found in response, using fallbacks.");
        if (type === "playlist-naming") {
          recommendations = {
            name: "AI Generated Playlist",
            description: "A specially curated playlist just for you.",
          };
        } else {
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
    }

    // Final clean up and validation
    if (type === "user-summary") {
      return NextResponse.json(recommendations);
    }

    if (type === "playlist-naming") {
      // Normalize: if it's an array of 1, take the first item
      const finalResult = Array.isArray(recommendations)
        ? recommendations[0]
        : recommendations;
      return NextResponse.json({ recommendations: finalResult });
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
    // For ai-search and quiz-tracks, don't limit the results
    if (type === "ideas") {
      recommendations = recommendations.slice(0, 4);
    } else if (type !== "ai-search" && type !== "quiz-tracks") {
      recommendations = recommendations.slice(0, 5);
    }
    // ai-search and quiz-tracks return all recommendations

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error("AI request failed");
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
