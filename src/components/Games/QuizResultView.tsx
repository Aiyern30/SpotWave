import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, Music } from "lucide-react";
import { Button, Badge } from "@/components/ui";

interface QuizResultViewProps {
  track: any;
  feedback: "correct" | "wrong" | null;
  onNext: () => void;
  revealTime: number;
  subtitle?: string;
  showEnterHint?: boolean;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  track,
  feedback,
  onNext,
  revealTime,
  subtitle,
  showEnterHint = false,
}) => {
  const isCorrect = feedback === "correct";
  const [canShowHint, setCanShowHint] = React.useState(false);

  React.useEffect(() => {
    if (revealTime > 0) {
      const timer = setTimeout(() => {
        setCanShowHint(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setCanShowHint(false);
    }
  }, [revealTime]);

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.95, rotateY: 90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.95, rotateY: -90 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="w-full flex flex-col items-center space-y-10"
    >
      {/* Result Image */}
      <div
        className={`relative w-48 h-48 rounded-full overflow-hidden border-4 transition-all duration-700 ${
          isCorrect
            ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
            : "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
        }`}
      >
        {track?.album?.images?.[0]?.url ? (
          <Image
            src={track.album.images[0].url}
            alt="Album Art"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Music className="w-20 h-20 text-zinc-600" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        <Badge
          className={`${
            isCorrect
              ? "bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/40 shadow-[0_0_15px_rgba(29,185,84,0.1)]"
              : "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          } px-6 py-1.5 text-sm font-bold rounded-md mb-2 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(29,185,84,0.3)] hover:bg-[#1DB954]/20 hover:border-[#1DB954] cursor-default animate-bounce`}
        >
          {isCorrect ? "🎉 Correct!" : "Missed it!"}
        </Badge>
        <div className="space-y-1 text-center">
          <h3 className="text-3xl font-bold text-white tracking-tight leading-tight">
            {track.name}
          </h3>
          <p className="text-zinc-400 text-lg font-medium">
            {subtitle || track.album?.name || track.artists?.[0]?.name}
          </p>
        </div>
      </div>

      <div className="w-full space-y-4 flex flex-col items-center">
        <Button
          onClick={onNext}
          className="bg-white text-black hover:bg-zinc-100 w-full h-14 rounded-xl font-bold text-lg transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          Next Song <SkipForward className="w-6 h-6 ml-2 fill-current" />
        </Button>

        {/* Hint: Press Enter to continue (only shown after delay) */}
        <div className="h-6">
          <AnimatePresence>
            {canShowHint && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-zinc-500 text-sm font-medium"
              >
                Press Enter to continue
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
