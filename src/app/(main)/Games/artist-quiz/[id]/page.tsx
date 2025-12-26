"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  XCircle,
  Volume2,
  HelpCircle,
  Loader2,
  Music,
  Lightbulb,
} from "lucide-react";
import { Button, Input, Card, CardContent, Badge } from "@/components/ui";
import { fetchArtistTopTracks } from "@/utils/Tracks/fetchArtistTopTracks";
import { usePlayer } from "@/contexts/PlayerContext";

// Helper to normalize strings for comparison
const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .replace(/\(.*\)/g, "") // Remove content in parentheses e.g. (feat. X)
    .replace(/-.*$/g, "") // Remove content after hyphen e.g. - Remastered
    .replace(/[^\p{L}\p{N}]/gu, "") // Remove non-alphanumeric but keep all letters/numbers
    .trim();
};

const maskText = (text: string) => {
  return text
    .split(" ")
    .map((word) => {
      // Keep first letter, replace rest with *
      // If word is short (1-2 chars), keep it fully or just mask 2nd char?
      // Let's simple: first char + * for rest
      if (word.length <= 1) return word;
      return word[0] + "*".repeat(word.length - 1);
    })
    .join(" ");
};

const ArtistQuizGame = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const artistId = params.id as string;
  const artistName = searchParams.get("name") || "Unknown Artist";

  // Player Context
  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    isPlaying: isGlobalPlaying,
    currentTrack: globalTrack,
    position,
    duration,
  } = usePlayer();

  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(
    new Set()
  );

  // Game state
  const [gameTracks, setGameTracks] = useState<any[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);

  // Initialize Game
  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      const fetchedTracks = await fetchArtistTopTracks(artistId);

      // Shuffle tracks - Use ALL tracks since we don't need preview_url anymore
      const shuffled = fetchedTracks.sort(() => Math.random() - 0.5);

      setTracks(shuffled);
      setGameTracks(shuffled.slice(0, 10)); // Top 10 rounds
      setLoading(false);
    };

    if (artistId) {
      initGame();
    }
  }, [artistId]);

  const currentTrack = gameTracks[currentTrackIndex];

  // Auto-play current track when round starts
  useEffect(() => {
    if (currentTrack && !showAnswer) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        playTrack({
          ...currentTrack,
          album: {
            ...currentTrack.album,
            images: currentTrack.album.images || [], // Ensure images exist
          },
          duration_ms: currentTrack.duration_ms || 0,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentTrack, showAnswer, playTrack]);

  // Handle guess submission
  const checkGuess = () => {
    if (!currentTrack || showAnswer) return;

    const normalizedGuess = normalizeString(guess);
    const normalizedAnswer = normalizeString(currentTrack.name);

    if (normalizedGuess === normalizedAnswer) {
      setFeedback("correct");
      setScore((s) => s + 100);
      setShowAnswer(true);
    } else {
      setFeedback("wrong");

      // Reveal matched characters character-by-character
      const newRevealed = new Set(revealedIndices);
      const answerStr = currentTrack.name.toLowerCase();
      const guessStr = guess.toLowerCase();

      // Check for character matches (index based)
      for (let i = 0; i < Math.min(answerStr.length, guessStr.length); i++) {
        if (answerStr[i] === guessStr[i]) {
          newRevealed.add(i);
        }
      }
      setRevealedIndices(newRevealed);
    }
  };

  const handleNext = () => {
    if (currentTrackIndex >= gameTracks.length - 1) {
      setIsGameOver(true);
      pauseTrack(); // Stop music when game ends
    } else {
      setCurrentTrackIndex((prev) => prev + 1);
      setGuess("");
      setFeedback(null);
      setShowAnswer(false);
      setShowHint(false);
      setRevealedIndices(new Set());
    }
  };

  const handleGiveUp = () => {
    setShowAnswer(true);
    setFeedback(null);
  };

  const progressPercentage = (currentTrackIndex / gameTracks.length) * 100;

  // Determine if the current song is currently playing in the global player
  const isCurrentTrackLoaded = globalTrack?.id === currentTrack?.id;
  const isCurrentSongPlaying = isGlobalPlaying && isCurrentTrackLoaded;

  const togglePlayback = () => {
    if (isCurrentTrackLoaded) {
      // If loaded, toggle play/pause
      if (isGlobalPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      // If not loaded or different track, play from start
      playTrack(currentTrack);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto" />
          <p className="text-zinc-400">Loading tracks for {artistName}...</p>
        </div>
      </div>
    );
  }

  if (gameTracks.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Music className="w-20 h-20 text-zinc-600" />
        <h2 className="text-2xl font-bold text-white">No Tracks Found</h2>
        <p className="text-zinc-400 max-w-md">
          Sorry, we couldn't find enough tracks for {artistName} to create a
          quiz.
        </p>
        <Button
          onClick={() => router.back()}
          className="bg-white text-black hover:bg-zinc-200"
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-green-500">Quiz Complete!</h1>
          <p className="text-xl text-white">You scored {score} points</p>
        </div>

        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 space-y-6">
            <div className="text-6xl font-black text-white">
              {Math.round((score / (gameTracks.length * 100)) * 100)}%
            </div>
            <p className="text-zinc-400">
              Accuracy on {gameTracks.length} songs by {artistName}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800"
              >
                Play Again
              </Button>
              <Button
                onClick={() => router.push("/Games")}
                className="bg-green-500 hover:bg-green-600 text-black"
              >
                More Games
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-black to-black flex flex-col items-center p-4 md:p-8 pb-32">
      {/* Header */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={() => {
            pauseTrack();
            router.back();
          }}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quit
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-white font-bold text-lg">{artistName} Quiz</h2>
          <span className="text-green-500 font-mono text-sm">
            Score: {score}
          </span>
        </div>
        <div className="w-20 text-right text-zinc-500 text-sm">
          {currentTrackIndex + 1} / {gameTracks.length}
        </div>
      </div>

      {/* Game Card */}
      <Card className="w-full max-w-2xl bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <CardContent className="p-8 md:p-12 flex flex-col items-center space-y-10">
          {/* Visualizer / Icon */}
          {/* Visualizer / Album Art */}
          {/* Visualizer / Album Art with Circular Progress */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Circular Progress SVG */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 transform"
              viewBox="0 0 100 100"
            >
              {/* Background Circle */}
              <circle
                className="text-zinc-800"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="46"
                cx="50"
                cy="50"
              />
              {/* Progress Circle */}
              <circle
                className={`text-green-500 transition-all duration-1000 ease-linear ${
                  isCurrentSongPlaying ? "opacity-100" : "opacity-0"
                }`}
                strokeWidth="4"
                strokeDasharray={289.027} // 2 * PI * 46
                strokeDashoffset={
                  289.027 - (duration > 0 ? position / duration : 0) * 289.027
                }
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="46"
                cx="50"
                cy="50"
              />
            </svg>

            <div
              className={`relative w-48 h-48 rounded-full flex items-center justify-center overflow-hidden border-4 ${
                !isCurrentSongPlaying ? "border-zinc-700" : "border-transparent"
              } transition-all duration-500 shadow-2xl z-10`}
            >
              {/* Album Art */}
              {currentTrack?.album?.images?.[0]?.url ? (
                <div
                  className={`relative w-full h-full ${
                    !showAnswer ? "blur-xl scale-125" : ""
                  } transition-all duration-700`}
                >
                  <Image
                    src={currentTrack.album.images[0].url}
                    alt="Album Art"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <Music className="w-20 h-20 text-zinc-600" />
                </div>
              )}

              {/* Play/Pause Overlay Icon for better UX */}
              <div
                className={`absolute inset-0 flex items-center justify-center z-10 ${
                  showAnswer ? "bg-black/20" : "bg-black/10"
                }`}
              >
                {!showAnswer &&
                  (isCurrentSongPlaying ? (
                    <div className="bg-black/40 p-3 rounded-full backdrop-blur-sm">
                      <Volume2 className="w-8 h-8 text-green-500 animate-pulse" />
                    </div>
                  ) : null)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center space-y-6 w-full max-w-md">
            {!showAnswer && (
              <Button
                size="lg"
                className={`rounded-full w-16 h-16 p-0 transition-transform hover:scale-105 ${
                  isCurrentSongPlaying
                    ? "bg-zinc-800 hover:bg-zinc-700"
                    : "bg-green-500 hover:bg-green-400 text-black"
                }`}
                onClick={togglePlayback}
              >
                {isCurrentSongPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
            )}

            {showAnswer ? (
              <div className="text-center space-y-4 animate-in zoom-in duration-300 w-full">
                <div className="flex flex-col items-center gap-2">
                  <Badge
                    className={`${
                      feedback === "correct"
                        ? "bg-green-500 text-black"
                        : "bg-red-500 text-white"
                    } px-4 py-1 text-lg mb-2`}
                  >
                    {feedback === "correct" ? "Correct!" : "Missed it!"}
                  </Badge>
                  <h3 className="text-2xl font-bold text-white mt-2">
                    {currentTrack.name}
                  </h3>
                  <p className="text-zinc-400">{currentTrack.album.name}</p>
                </div>
                <Button
                  onClick={handleNext}
                  className="mt-8 bg-white text-black hover:bg-zinc-200 w-full"
                  size="lg"
                >
                  Next Song <SkipForward className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="w-full space-y-4">
                {/* Hint Button & Display */}
                <div className="flex flex-col items-center gap-2">
                  {!showHint ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-yellow-400 transition-colors"
                      onClick={() => setShowHint(true)}
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Need a Hint?
                    </Button>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2 fill-yellow-500" />
                      {currentTrack.album.name === currentTrack.name
                        ? `Released in ${
                            currentTrack.album.release_date.split("-")[0]
                          }`
                        : `Album: ${maskText(currentTrack.album.name)}`}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-1.5 mb-8 min-h-[3rem] px-2">
                  {currentTrack.name
                    .split("")
                    .map((char: string, index: number) => {
                      const isContent = /[\p{L}\p{N}]/u.test(char);
                      const isRevealed =
                        revealedIndices.has(index) || !isContent || showAnswer;

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
                    onChange={(e) => {
                      setGuess(e.target.value);
                      // Don't clear feedback immediately to allow user to see "Wrong" from last submit
                      if (feedback === "correct") setFeedback(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") checkGuess();
                    }}
                    className={`h-14 pl-6 text-lg bg-black/50 border-zinc-700 text-white rounded-xl focus:ring-green-500 focus:border-green-500 transition-all ${
                      feedback === "wrong" ? "border-red-500 text-red-500" : ""
                    }`}
                  />
                  {feedback === "wrong" && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-in fade-in slide-in-from-left-2">
                      <XCircle className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="destructive"
                    className="h-12 "
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions / Footer */}
      <div className="mt-8 text-zinc-500 text-sm">
        <p>
          Listen to the song and guess the title. (Full track playback enabled)
        </p>
      </div>
    </div>
  );
};

export default ArtistQuizGame;
