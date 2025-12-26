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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [contexts, setContexts] = useState<{
    topArtists: string;
    topTracks: string;
    recentTracks: string;
    playlists: string;
  }>({ topArtists: "", topTracks: "", recentTracks: "", playlists: "" });

  const [activeContextType, setActiveContextType] = useState<
    "none" | "favorites" | "recent" | "mostPlayed" | "playlists"
  >("none");

  useEffect(() => {
    const fetchAllContextsAndSeed = async () => {
      const token = localStorage.getItem("Token");
      if (!token) {
        setIsInitialLoad(false);
        return;
      }

      try {
        setIsAiLoading(true);

        // Parallel fetching for performance
        const [artistRes, topTrackRes, recentRes, playlistRes] =
          await Promise.all([
            fetch("https://api.spotify.com/v1/me/top/artists?limit=8", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("https://api.spotify.com/v1/me/top/tracks?limit=10", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(
              "https://api.spotify.com/v1/me/player/recently-played?limit=10",
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
            fetch("https://api.spotify.com/v1/me/playlists?limit=5", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

        let combinedContextStrings: string[] = [];

        if (artistRes.ok) {
          const data = await artistRes.json();
          const artists = data.items.map((a: any) => a.name).join(", ");
          setContexts((prev) => ({ ...prev, topArtists: artists }));
          combinedContextStrings.push(`Top Artists: ${artists}`);
        }

        if (topTrackRes.ok) {
          const data = await topTrackRes.json();
          const tracks = data.items
            .map((t: any) => `${t.name} by ${t.artists[0].name}`)
            .join(", ");
          setContexts((prev) => ({ ...prev, topTracks: tracks }));
          combinedContextStrings.push(`Most Played: ${tracks}`);
        }

        if (recentRes.ok) {
          const data = await recentRes.json();
          const tracks = data.items
            .map((t: any) => `${t.track.name} by ${t.track.artists[0].name}`)
            .join(", ");
          setContexts((prev) => ({ ...prev, recentTracks: tracks }));
          combinedContextStrings.push(`Recently Played: ${tracks}`);
        }

        if (playlistRes.ok) {
          const data = await playlistRes.json();
          const playlists = data.items.map((p: any) => p.name).join(", ");
          setContexts((prev) => ({ ...prev, playlists }));
        }

        // Auto-generate initial recommendations based on combined context
        const initialContext = combinedContextStrings.join(". ");
        handleGetAiSuggestions(
          initialContext || "General popular music and hits"
        );
      } catch (error) {
        console.error("Error fetching context:", error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    fetchAllContextsAndSeed();
  }, []);

  const handleGetAiSuggestions = async (overrideContext?: string) => {
    setIsAiLoading(true);
    try {
      let finalContext = prompt;
      if (!finalContext && !overrideContext) {
        if (activeContextType === "favorites")
          finalContext = `I love these artists: ${contexts.topArtists}`;
        else if (activeContextType === "recent")
          finalContext = `I've been listening to: ${contexts.recentTracks}`;
        else if (activeContextType === "mostPlayed")
          finalContext = `My all-time top songs are: ${contexts.topTracks}`;
        else if (activeContextType === "playlists")
          finalContext = `I have these playlist themes: ${contexts.playlists}`;
        else
          finalContext =
            contexts.topArtists || contexts.topTracks || "General hits";
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

  const handleQuickContext = (
    type: "favorites" | "recent" | "mostPlayed" | "playlists"
  ) => {
    setActiveContextType(type);
    let ctx = "";
    if (type === "favorites")
      ctx = `Generate 4 quiz ideas based on these top artists I love: ${contexts.topArtists}`;
    else if (type === "recent")
      ctx = `Generate 4 quiz ideas based on my most recently played music (current mood): ${contexts.recentTracks}`;
    else if (type === "mostPlayed")
      ctx = `Generate 4 quiz ideas based on my all-time most played songs: ${contexts.topTracks}`;
    else if (type === "playlists")
      ctx = `Generate 4 quiz ideas based on the themes of my playlists: ${contexts.playlists}`;
    handleGetAiSuggestions(ctx);
  };

  const SkeletonCard = () => (
    <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-2xl overflow-hidden border-2 animate-pulse h-[140px]">
      <div className="p-6 space-y-4">
        <div className="h-6 bg-zinc-800 rounded-md w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded-md w-full" />
          <div className="h-4 bg-zinc-800 rounded-md w-5/6" />
        </div>
      </div>
    </Card>
  );

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
                  onClick={() => handleQuickContext("favorites")}
                  className={`rounded-full border border-zinc-800 gap-2 h-9 px-4 transition-all ${
                    activeContextType === "favorites"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Favorites
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickContext("recent")}
                  className={`rounded-full border border-zinc-800 gap-2 h-9 px-4 transition-all ${
                    activeContextType === "recent"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Music className="w-3.5 h-3.5" /> Recent
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickContext("mostPlayed")}
                  className={`rounded-full border border-zinc-800 gap-2 h-9 px-4 transition-all ${
                    activeContextType === "mostPlayed"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Most Played
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickContext("playlists")}
                  className={`rounded-full border border-zinc-800 gap-2 h-9 px-4 transition-all ${
                    activeContextType === "playlists"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" /> Playlists
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
            {isAiLoading && suggestions.length === 0 ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              suggestions.map((item, i) => (
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiGeneratedPage;
