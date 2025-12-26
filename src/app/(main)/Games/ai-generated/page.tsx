"use client";
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  Music,
  Lightbulb,
  User,
  ArrowLeft,
  XCircle,
  Play,
  Pause,
  Volume2,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { Converter } from "opencc-js";
import { QuizResultView } from "@/components/Games/QuizResultView";
import Image from "next/image";

interface Suggestion {
  title: string;
  description: string;
}

const convertToSimp = Converter({ from: "hk", to: "cn" });

const normalizeString = (str: string) => {
  const simplified = convertToSimp(str);
  return simplified
    .toLowerCase()
    .replace(/\(.*\)/g, "")
    .replace(/-.*$/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
};

const maskText = (text: string) => {
  return text
    .split(" ")
    .map((word) => {
      if (word.length <= 1) return word;
      return word[0] + "*".repeat(word.length - 1);
    })
    .join(" ");
};

const AiGeneratedPage = () => {
  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    isPlaying: isGlobalPlaying,
    currentTrack: globalTrack,
    position,
    duration,
  } = usePlayer();

  const [prompt, setPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Quiz Mode State
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [gameTracks, setGameTracks] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(
    new Set()
  );
  const [isGameOver, setIsGameOver] = useState(false);
  const [answerRevealTime, setAnswerRevealTime] = useState<number>(0);

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
              { headers: { Authorization: `Bearer ${token}` } }
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

      const data = await response.json();
      const { recommendations, error, _error } = data;
      if (_error) console.warn("🤖 AI Provider Error:", _error);
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

  const handleGenerateQuiz = async () => {
    if (!prompt.trim()) return;
    setIsGeneratingQuiz(true);
    const token = localStorage.getItem("Token");

    try {
      // 1. Get track names from AI
      const aiResponse = await fetch("/api/ai-recommendations", {
        method: "POST",
        body: JSON.stringify({ type: "quiz-tracks", context: prompt }),
      });
      const { recommendations } = await aiResponse.json();

      // 2. Search each on Spotify to get real tracks
      const fetchedTracks: any[] = [];
      for (const item of recommendations) {
        const query = `${item.song} ${item.artist}`;
        const searchRes = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            query
          )}&type=track&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (searchRes.ok) {
          const data = await searchRes.json();
          const track = data.tracks.items[0];
          if (track) fetchedTracks.push(track);
        }
      }

      if (fetchedTracks.length > 0) {
        setGameTracks(fetchedTracks);
        setIsQuizMode(true);
        // Add mode=quiz to URL to trigger global player hiding and exit warning
        const url = new URL(window.location.href);
        url.searchParams.set("mode", "quiz");
        window.history.pushState({}, "", url.toString());
        setCurrentTrackIndex(0);
        setScore(0);
        setIsGameOver(false);
      } else {
        alert(
          "Could not find enough tracks for this theme. Try a different prompt!"
        );
      }
    } catch (err) {
      console.error("Generate Quiz Error:", err);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const currentTrack = gameTracks[currentTrackIndex];

  useEffect(() => {
    if (isQuizMode && currentTrack && !showAnswer && !isGameOver) {
      const timer = setTimeout(() => {
        playTrack({
          ...currentTrack,
          album: {
            ...currentTrack.album,
            images: currentTrack.album.images || [],
          },
          duration_ms: currentTrack.duration_ms || 0,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isQuizMode, currentTrack, showAnswer, isGameOver, playTrack]);

  const checkGuess = () => {
    if (!currentTrack || showAnswer) return;
    const normalizedGuess = normalizeString(guess);
    const normalizedAnswer = normalizeString(currentTrack.name);

    if (normalizedGuess === normalizedAnswer) {
      setFeedback("correct");
      setScore((s) => s + 100);
      setShowAnswer(true);
      setAnswerRevealTime(Date.now());
    } else {
      setFeedback("wrong");
      const newRevealed = new Set(revealedIndices);
      const answerStr = currentTrack.name.toLowerCase();
      const guessStr = guess.toLowerCase();
      for (let i = 0; i < Math.min(answerStr.length, guessStr.length); i++) {
        if (convertToSimp(answerStr[i]) === convertToSimp(guessStr[i]))
          newRevealed.add(i);
      }
      setRevealedIndices(newRevealed);
    }
  };

  const handleNext = () => {
    if (currentTrackIndex >= gameTracks.length - 1) {
      setIsGameOver(true);
      pauseTrack();
      // Remove quiz mode from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("mode");
      window.history.pushState({}, "", url.toString());
    } else {
      setCurrentTrackIndex((prev) => prev + 1);
      setGuess("");
      setFeedback(null);
      setShowAnswer(false);
      setShowHint(false);
      setRevealedIndices(new Set());
      setAnswerRevealTime(0);
    }
  };

  const handleGiveUp = () => {
    setShowAnswer(true);
    setFeedback(null);
    setAnswerRevealTime(Date.now());
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

  const togglePlayback = () => {
    const isCurrentTrackLoaded = globalTrack?.id === currentTrack?.id;
    if (isCurrentTrackLoaded) {
      if (isGlobalPlaying) pauseTrack();
      else resumeTrack();
    } else playTrack(currentTrack);
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

  if (isQuizMode) {
    if (isGameOver) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-green-500">
              Quiz Complete!
            </h1>
            <p className="text-xl text-white">You scored {score} points</p>
          </div>
          <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
            <CardContent className="p-8 space-y-6">
              <div className="text-6xl font-black text-white">
                {Math.round((score / (gameTracks.length * 100)) * 100)}%
              </div>
              <p className="text-zinc-400">
                Accuracy on {gameTracks.length} AI-selected songs
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setIsQuizMode(false)}
                  className="bg-white text-black hover:bg-zinc-200 font-semibold"
                >
                  Generate New
                </Button>
                <Button
                  onClick={() => handleGenerateQuiz()}
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                >
                  Retry This
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    const progressPercentage = (currentTrackIndex / gameTracks.length) * 100;
    const isCurrentSongPlaying =
      isGlobalPlaying && globalTrack?.id === currentTrack?.id;

    return (
      <div className="w-full flex flex-col items-center animate-in fade-in duration-500 pb-12">
        <div className="w-full max-w-3xl flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => {
              pauseTrack();
              setIsQuizMode(false);
              const url = new URL(window.location.href);
              url.searchParams.delete("mode");
              window.history.pushState({}, "", url.toString());
            }}
            className="text-green-500 hover:text-green-400 hover:bg-green-500/10 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Exit Quiz
          </Button>
          <div className="flex flex-col items-center">
            <h2 className="text-white font-bold text-lg">AI Genre Quiz</h2>
            <span className="text-green-500 font-mono text-sm">
              Score: {score}
            </span>
          </div>
          <div className="w-20 text-right text-zinc-500 text-sm">
            {currentTrackIndex + 1} / {gameTracks.length}
          </div>
        </div>

        <motion.div
          key={currentTrack?.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-2xl overflow-hidden relative border-2">
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <CardContent className="p-8 md:p-12 flex flex-col items-center space-y-10">
              <AnimatePresence mode="wait">
                {showAnswer ? (
                  <QuizResultView
                    track={currentTrack}
                    feedback={feedback}
                    onNext={handleNext}
                    revealTime={answerRevealTime}
                    subtitle={currentTrack.artists[0].name}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full flex flex-col items-center space-y-6"
                  >
                    <div className="relative w-64 h-64 flex items-center justify-center">
                      <svg
                        className="absolute inset-0 w-full h-full -rotate-90 transform"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          className="text-zinc-800"
                          strokeWidth="4"
                          stroke="currentColor"
                          fill="transparent"
                          r="46"
                          cx="50"
                          cy="50"
                        />
                        <circle
                          className={`text-green-500 transition-all duration-1000 ease-linear ${
                            isCurrentSongPlaying ? "opacity-100" : "opacity-0"
                          }`}
                          strokeWidth="4"
                          strokeDasharray={289.027}
                          strokeDashoffset={
                            289.027 -
                            (duration > 0 ? position / duration : 0) * 289.027
                          }
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="46"
                          cx="50"
                          cy="50"
                        />
                      </svg>
                      <div className="relative w-48 h-48 rounded-full flex items-center justify-center overflow-hidden border-4 border-zinc-700 shadow-2xl z-10">
                        {currentTrack?.album?.images?.[0]?.url ? (
                          <div className="relative w-full h-full blur-2xl scale-150">
                            <Image
                              src={currentTrack.album.images[0].url}
                              alt="Blurred Art"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <Music className="w-20 h-20 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/10">
                          {isCurrentSongPlaying && (
                            <div className="bg-black/40 p-3 rounded-full backdrop-blur-sm">
                              <Volume2 className="w-8 h-8 text-green-500 animate-pulse" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className={`rounded-full w-16 h-16 p-0 transition-transform hover:scale-105 ${
                        isCurrentSongPlaying
                          ? "bg-zinc-800"
                          : "bg-green-500 text-black"
                      }`}
                      onClick={togglePlayback}
                    >
                      {isCurrentSongPlaying ? (
                        <Pause className="w-8 h-8 text-white" />
                      ) : (
                        <Play className="w-8 h-8 ml-1" />
                      )}
                    </Button>
                    <div className="w-full space-y-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {!showHint ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-500 hover:text-yellow-500 transition-colors"
                            onClick={() => setShowHint(true)}
                          >
                            <Lightbulb className="w-4 h-4 mr-2" /> Need a Hint?
                          </Button>
                        ) : (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center text-center">
                            <Lightbulb className="w-4 h-4 flex-shrink-0 mr-2 fill-yellow-500" />
                            Artist: {maskText(currentTrack.artists[0].name)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 mb-8 min-h-[3rem] px-2">
                        {currentTrack.name
                          .split("")
                          .map((char: string, index: number) => {
                            const isContent = /[\p{L}\p{N}]/u.test(char);
                            const isRevealed =
                              revealedIndices.has(index) || !isContent;
                            return (
                              <div
                                key={index}
                                className={`flex flex-col items-center justify-end w-8 h-10 border-b-2 transition-all duration-300 ${
                                  isRevealed
                                    ? "border-green-500/50"
                                    : "border-zinc-700"
                                }`}
                              >
                                <span
                                  className={`text-xl font-bold select-none ${
                                    isRevealed
                                      ? "text-white animate-in zoom-in"
                                      : "text-transparent"
                                  }`}
                                >
                                  {char}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                      <div className="relative">
                        <Input
                          autoFocus
                          placeholder="Type song name..."
                          value={guess}
                          onChange={(e) => setGuess(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && checkGuess()}
                          className={`h-14 pl-6 text-lg bg-black/50 border-zinc-700 text-white rounded-xl focus:ring-green-500 transition-all ${
                            feedback === "wrong"
                              ? "border-red-500 text-red-500"
                              : ""
                          }`}
                        />
                        {feedback === "wrong" && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
                            <XCircle className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant="destructive"
                          className="h-12"
                          onClick={handleGiveUp}
                        >
                          <HelpCircle className="w-4 h-4 mr-2" /> Give Up
                        </Button>
                        <Button
                          className="h-12 bg-green-500 hover:bg-green-600 text-black font-semibold"
                          onClick={checkGuess}
                        >
                          Submit <CheckCircle2 className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="max-w-4xl mx-auto w-full space-y-12 px-4 sm:px-0">
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
                  <Sparkles className="w-7 h-7 mr-4" /> Generate My Quiz
                </>
              )}
            </Button>
          </div>
        </div>

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
              )}{" "}
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
