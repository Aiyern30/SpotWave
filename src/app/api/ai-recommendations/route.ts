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

    const prompt =
      type === "artist"
        ? `Suggest 5 popular music artists for a song guessing quiz. Return ONLY a JSON array of strings (the artist names). Context: ${
            context || "General popular music"
          }. Example format: ["Artist 1", "Artist 2", "Artist 3", "Artist 4", "Artist 5"]`
        : `Suggest 5 popular music playlist themes or specific famous playlists for a song guessing quiz. Return ONLY a JSON array of strings (the playlist names). Context: ${
            context || "General popular music"
          }. Example format: ["Playlist 1", "Playlist 2", "Playlist 3", "Playlist 4", "Playlist 5"]`;

    // Free tier compatible models - using v1 API (not v1beta)
    const attempts = [
      { version: "v1", model: "gemini-1.5-flash" },
      { version: "v1", model: "gemini-2.5-flash" },
    ];

    let lastError = "";
    let data: any = null;

    for (const attempt of attempts) {
      try {
        console.log(
          `🤖 Attempting Gemini AI: ${attempt.version}/${attempt.model}`
        );

        const response = await fetch(
          `https://generativelanguage.googleapis.com/${attempt.version}/models/${attempt.model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (response.ok) {
          data = await response.json();
          console.log(`✅ Gemini AI Success: ${attempt.model}`);
          break;
        } else {
          const err = await response.text();
          lastError = `${attempt.version}/${attempt.model}: ${err}`;
          console.warn(`⚠️ Gemini AI Failed (${attempt.model}):`, err);
        }
      } catch (e: any) {
        lastError = `${attempt.model}: ${e.message}`;
        console.warn(`⚠️ Exception for ${attempt.model}:`, e.message);
      }
    }

    if (!data) {
      console.error("❌ All Gemini models failed. Last error:", lastError);
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from AI");
    }

    console.log("📝 Raw AI response:", text);

    // Parse the response - handle various formats
    let recommendations;
    try {
      // Try direct JSON parse first
      recommendations = JSON.parse(text);
    } catch (e) {
      // Clean up the text - remove markdown code blocks if present
      let cleanedText = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // Try to extract JSON array from cleaned text
      const match = cleanedText.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          recommendations = JSON.parse(match[0]);
        } catch (parseError) {
          console.error("Failed to parse extracted JSON:", match[0]);
          // Fallback: try to extract quoted strings
          const stringMatches = cleanedText.match(/"([^"]+)"/g);
          if (stringMatches && stringMatches.length >= 5) {
            recommendations = stringMatches
              .slice(0, 5)
              .map((s: string) => s.replace(/"/g, ""));
          } else {
            throw new Error("Could not parse AI response as JSON array");
          }
        }
      } else {
        // Last resort: try to extract any quoted strings
        const stringMatches = text.match(/"([^"]+)"/g);
        if (stringMatches && stringMatches.length >= 5) {
          recommendations = stringMatches
            .slice(0, 5)
            .map((s: string) => s.replace(/"/g, ""));
        } else {
          console.error("No JSON array found in response:", text);
          throw new Error("Could not find JSON array in AI response");
        }
      }
    }

    // Validate the response
    if (!Array.isArray(recommendations)) {
      throw new Error("AI response is not an array");
    }

    if (recommendations.length === 0) {
      throw new Error("AI returned empty recommendations");
    }

    // Ensure we have at least 5 recommendations, take first 5 if more
    recommendations = recommendations.slice(0, 5);

    console.log("✅ Returning recommendations:", recommendations);
    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error("❌ AI Recommendation Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get AI recommendations" },
      { status: 500 }
    );
  }
}
