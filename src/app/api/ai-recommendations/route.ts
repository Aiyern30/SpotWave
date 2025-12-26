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
          }`
        : `Suggest 5 popular music playlist themes or specific famous playlists for a song guessing quiz. Return ONLY a JSON array of strings (the playlist names). Context: ${
            context || "General popular music"
          }`;

    const attempts = [
      { version: "v1beta", model: "gemini-1.5-flash" },
      { version: "v1beta", model: "gemini-1.5-pro" },
      { version: "v1beta", model: "gemini-1.0-pro" },
      { version: "v1", model: "gemini-1.5-flash" },
      { version: "v1", model: "gemini-pro" },
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
              generationConfig: attempt.model.includes("1.5")
                ? {
                    response_mime_type: "application/json",
                  }
                : undefined,
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
        lastError = e.message;
      }
    }

    if (!data) {
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from AI");
    }

    // If it was gemini-pro (no JSON mode), try to extract array from text
    let recommendations;
    try {
      recommendations = JSON.parse(text);
    } catch (e) {
      // Regex to find JSON array if model returned text + JSON
      // Use [\s\S] instead of . with /s flag for ES version compatibility
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        recommendations = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse AI response as JSON array");
      }
    }

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error("AI Recommendation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
