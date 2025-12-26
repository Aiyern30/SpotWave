"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Music, Lightbulb, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface Suggestion {
  title: string;
  description: string;
}

const AiGeneratedPage = () => {
  const [prompt, setPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      title: "Melodies of Love",
      description:
        "Romantic ballads from J.Sheon, Leehom Wang, and Khalil Fong",
    },
    {
      title: "Taipei Nights",
      description:
        "Chill tracks featuring 高爾宣 OSN and Ryan.B, perfect for a cozy evening",
    },
    {
      title: "2000s Pop Rock Vibes",
      description:
        "A nostalgic collection of hits from Imagine Dragons and similar artists",
    },
    {
      title: "Mandopop Classics",
      description:
        "Timeless songs from Jay Chou, David Tao, and more from the early 2000s",
    },
  ]);

  const [contexts, setContexts] = useState<{
    artists: string;
    tracks: string;
    playlists: string;
  }>({ artists: "", tracks: "", playlists: "" });

  const [activeContextType, setActiveContextType] = useState<
    "none" | "artists" | "tracks" | "playlists"
  >("none");

  useEffect(() => {
    const fetchAllContexts = async () => {
      const token = localStorage.getItem("Token");
      if (!token) return;

      try {
        // Fetch Top Artists
        const artistRes = await fetch(
          "https://api.spotify.com/v1/me/top/artists?limit=10",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (artistRes.ok) {
          const data = await artistRes.json();
          setContexts((prev) => ({
            ...prev,
            artists: data.items.map((a: any) => a.name).join(", "),
          }));
        }

        // Fetch Top Tracks
        const trackRes = await fetch(
          "https://api.spotify.com/v1/me/top/tracks?limit=10",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (trackRes.ok) {
          const data = await trackRes.json();
          setContexts((prev) => ({
            ...prev,
            tracks: data.items.map((t: any) => t.name).join(", "),
          }));
        }

        // Fetch Playlists
        const playlistRes = await fetch(
          "https://api.spotify.com/v1/me/playlists?limit=10",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (playlistRes.ok) {
          const data = await playlistRes.json();
          setContexts((prev) => ({
            ...prev,
            playlists: data.items.map((p: any) => p.name).join(", "),
          }));
        }
      } catch (error) {
        console.error("Error fetching context:", error);
      }
    };

    fetchAllContexts();
  }, []);

  const handleGetAiSuggestions = async (overrideContext?: string) => {
    setIsAiLoading(true);
    try {
      let finalContext = prompt;
      if (!finalContext) {
        if (activeContextType === "artists")
          finalContext = `I love these artists: ${contexts.artists}`;
        else if (activeContextType === "tracks")
          finalContext = `I love these songs: ${contexts.tracks}`;
        else if (activeContextType === "playlists")
          finalContext = `I listen to these playlists: ${contexts.playlists}`;
        else
          finalContext =
            contexts.artists || contexts.tracks || "General popular music";
      }

      const response = await fetch("/api/ai-recommendations", {
        method: "POST",
        body: JSON.stringify({
          type: "ideas",
          context: overrideContext || finalContext,
        }),
      });

      const { recommendations, error } = await response.json();
      if (error) throw new Error(error);

      if (recommendations && recommendations.length > 0) {
        setSuggestions(recommendations.slice(0, 4));
      }
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateQuiz = () => {
    if (!prompt.trim()) return;
    setIsGeneratingQuiz(true);
    setTimeout(() => {
      setIsGeneratingQuiz(false);
    }, 2000);
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    setPrompt(suggestion.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickContext = (type: "artists" | "tracks" | "playlists") => {
    setActiveContextType(type);
    let ctx = "";
    if (type === "artists")
      ctx = `Based on my favorite artists: ${contexts.artists}`;
    else if (type === "tracks")
      ctx = `Based on my top tracks: ${contexts.tracks}`;
    else if (type === "playlists")
      ctx = `Based on my playlists: ${contexts.playlists}`;
    handleGetAiSuggestions(ctx);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="max-w-4xl mx-auto w-full space-y-12 px-4 sm:px-0">
        {/* Main Input Section */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-10 space-y-8 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-32 h-32 text-green-500 rotate-12" />
          </div>

          <div className="space-y-4 text-center relative z-10">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
              AI Quiz Generator
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Tell me what kind of music you love, or let AI analyze your
              library to build the perfect quiz.
            </p>
          </div>

          <div className="space-y-8 relative z-10">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickContext("artists")}
                  className={`rounded-full border border-zinc-800 gap-2 ${
                    activeContextType === "artists"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "text-zinc-500"
                  }`}
                >
                  <User className="w-3 h-3" /> My Favorites
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickContext("tracks")}
                  className={`rounded-full border border-zinc-800 gap-2 ${
                    activeContextType === "tracks"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "text-zinc-500"
                  }`}
                >
                  <Music className="w-3 h-3" /> Recent Listening
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickContext("playlists")}
                  className={`rounded-full border border-zinc-800 gap-2 ${
                    activeContextType === "playlists"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "text-zinc-500"
                  }`}
                >
                  <Lightbulb className="w-3 h-3" /> My Playlists
                </Button>
              </div>

              <div className="relative group/input">
                <Textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (activeContextType !== "none")
                      setActiveContextType("none");
                  }}
                  placeholder="Ask for anything, e.g., 'Modern Mandopop hits', '90s Boy Bands', 'Lo-fi study beats'..."
                  className="min-h-[180px] bg-black/60 border-zinc-800 text-white placeholder:text-zinc-700 resize-none focus-visible:ring-green-500/40 rounded-3xl p-8 text-xl transition-all border-2"
                />
                <div className="absolute bottom-6 right-8 text-zinc-700 font-mono text-xs uppercase tracking-widest pointer-events-none">
                  Magic Input Enabled
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerateQuiz}
              disabled={!prompt.trim() || isGeneratingQuiz}
              className="w-full h-20 bg-green-600 hover:bg-green-500 text-white font-black text-2xl transition-all rounded-3xl shadow-2xl shadow-green-900/30 active:scale-[0.97]"
            >
              {isGeneratingQuiz ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-7 h-7 mr-4" />
                  Generate My Quiz
                </>
              )}
            </Button>
          </div>
        </div>

        {/* AI Suggestions Grid */}
        <div className="space-y-8 items-center flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 w-full px-2">
            <div className="flex items-center gap-3 text-2xl font-bold text-white">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-green-500" />
              </div>
              <h2>AI Playlist Ideas</h2>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => handleGetAiSuggestions()}
              disabled={isAiLoading}
              className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 gap-2 rounded-xl px-6 transition-all w-fit"
            >
              {isAiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-green-500" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Get New Suggestions
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {suggestions.map((item, i) => (
              <Card
                key={i}
                onClick={() => handleApplySuggestion(item)}
                className="bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/40 hover:border-green-500/30 transition-all cursor-pointer group/card rounded-2xl overflow-hidden relative border-2"
              >
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-xl font-bold text-white group-hover/card:text-green-400 transition-colors">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                  <p className="text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-4 flex items-center text-xs font-semibold text-green-500/0 group-hover/card:text-green-500 transition-all transform translate-y-2 group-hover/card:translate-y-0">
                    Use this idea <Music className="w-3 h-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiGeneratedPage;
