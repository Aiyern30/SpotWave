"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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

import { Converter } from "opencc-js";
import { QuizResultView } from "@/components/Games/QuizResultView";

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

const ArtistQuizGame = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const artistId = params.id as string;
  const artistName = searchParams.get("name") || "Unknown Artist";

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
  const [gameTracks, setGameTracks] = useState<any[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);

  // NEW: Track when answer was revealed to prevent immediate Enter advancing
  const [answerRevealTime, setAnswerRevealTime] = useState<number>(0);

  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      const fetchedTracks = await fetchArtistTopTracks(artistId);
      const shuffled = fetchedTracks.sort(() => Math.random() - 0.5);
      setTracks(shuffled);
      setGameTracks(shuffled.slice(0, 10));
      setLoading(false);
    };

    if (artistId) {
      initGame();
    }
  }, [artistId]);

  const currentTrack = gameTracks[currentTrackIndex];

  useEffect(() => {
    if (currentTrack && !showAnswer) {
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
  }, [currentTrack, showAnswer, playTrack]);

  const checkGuess = () => {
    if (!currentTrack || showAnswer) return;

    const normalizedGuess = normalizeString(guess);
    const normalizedAnswer = normalizeString(currentTrack.name);

    if (normalizedGuess === normalizedAnswer) {
      setFeedback("correct");
      setScore((s) => s + 100);
      setShowAnswer(true);
      setAnswerRevealTime(Date.now()); // Record when answer was revealed
    } else {
      setFeedback("wrong");
      const newRevealed = new Set(revealedIndices);
      const answerStr = currentTrack.name.toLowerCase();
      const guessStr = guess.toLowerCase();

      for (let i = 0; i < Math.min(answerStr.length, guessStr.length); i++) {
        if (convertToSimp(answerStr[i]) === convertToSimp(guessStr[i])) {
          newRevealed.add(i);
        }
      }
      setRevealedIndices(newRevealed);
    }
  };

  const handleNext = () => {
    if (currentTrackIndex >= gameTracks.length - 1) {
      setIsGameOver(true);
      pauseTrack();
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

  // UPDATED: Prevent immediate Enter key advancing (require 800ms delay)
  useEffect(() => {
    if (!showAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        // Only allow advancing if at least 800ms have passed since answer reveal
        const timeSinceReveal = Date.now() - answerRevealTime;
        if (timeSinceReveal >= 800) {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, currentTrackIndex, gameTracks.length, answerRevealTime]);

  const handleGiveUp = () => {
    setShowAnswer(true);
    setFeedback(null);
    setAnswerRevealTime(Date.now());
  };

  const progressPercentage = (currentTrackIndex / gameTracks.length) * 100;
  const isCurrentTrackLoaded = globalTrack?.id === currentTrack?.id;
  const isCurrentSongPlaying = isGlobalPlaying && isCurrentTrackLoaded;

  const togglePlayback = () => {
    if (isCurrentTrackLoaded) {
      if (isGlobalPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      playTrack(currentTrack);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 bg-brand animate-spin mx-auto" />
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-8"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-4xl font-bold bg-brand">Quiz Complete!</h1>
          <p className="text-xl text-white">You scored {score} points</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 space-y-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.4,
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                }}
                className="text-6xl font-black text-white"
              >
                {Math.round((score / (gameTracks.length * 100)) * 100)}%
              </motion.div>
              <p className="text-zinc-400">
                Accuracy on {gameTracks.length} songs by {artistName}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-white text-black hover:bg-zinc-200 font-semibold"
                >
                  Play Again
                </Button>
                <Button
                  onClick={() => router.push("/Games")}
                  className="bg-brand hover:bg-brand text-black font-semibold"
                >
                  More Games
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={() => {
            pauseTrack();
            router.back();
          }}
          className="bg-brand hover:bg-brand hover:bg-brand/10 font-medium"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quit
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-white font-bold text-lg">{artistName} Quiz</h2>
          <span className="bg-brand font-mono text-sm">Score: {score}</span>
        </div>
        <div className="w-20 text-right text-zinc-500 text-sm">
          {currentTrackIndex + 1} / {gameTracks.length}
        </div>
      </div>

      <motion.div
        key={currentTrack?.id || "loading"}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
            <div
              className="h-full bg-brand transition-all duration-500"
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
                  subtitle={currentTrack.album.name}
                />
              ) : (
                <motion.div
                  key="quiz"
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
                        className={`bg-brand transition-all duration-1000 ease-linear ${
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

                    <div
                      className={`relative w-48 h-48 rounded-full flex items-center justify-center overflow-hidden border-4 ${
                        !isCurrentSongPlaying
                          ? "border-zinc-700"
                          : "border-transparent"
                      } transition-all duration-500 shadow-2xl z-10`}
                    >
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
                            <Volume2 className="w-8 h-8 bg-brand animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className={`rounded-full w-16 h-16 p-0 transition-transform hover:scale-105 ${
                      isCurrentSongPlaying
                        ? "bg-zinc-800 hover:bg-zinc-700"
                        : "bg-brand hover:bg-brand text-black"
                    }`}
                    onClick={togglePlayback}
                  >
                    {isCurrentSongPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </Button>

                  <div className="w-full space-y-4">
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
                        onChange={(e) => {
                          setGuess(e.target.value);
                          if (feedback === "correct") setFeedback(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") checkGuess();
                        }}
                        className={`h-14 pl-6 text-lg bg-black/50 border-zinc-700 text-white rounded-xl focus:ring-green-500 focus:border-green-500 transition-all ${
                          feedback === "wrong"
                            ? "border-red-500 text-red-500"
                            : ""
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
                        className="h-12"
                        onClick={handleGiveUp}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" /> Give Up
                      </Button>
                      <Button
                        className="h-12 bg-brand hover:bg-brand text-black font-semibold"
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

      <div className="mt-8 text-zinc-500 text-sm">
        <p>
          Listen to the song and guess the title. (Full track playback enabled)
        </p>
      </div>
    </div>
  );
};

export default ArtistQuizGame;
