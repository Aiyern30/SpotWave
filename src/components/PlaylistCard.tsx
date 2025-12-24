"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@/components/ui/";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { Play, Pause, Music, Clock, ExternalLink } from "lucide-react";

interface PlaylistCardProps {
  id: string;
  image: string;
  title: string;
  description?: string;
  badge?: string;
  duration?: string;
  externalUrl?: string;
  isPlaying?: boolean; // Add isPlaying prop
  onPlay?: (id: string) => void;
  onPause?: () => void; // Add onPause prop
  onClick?: (id: string, title: string) => void;
}

export default function PlaylistCard({
  id,
  image,
  title,
  description,
  badge,
  duration,
  externalUrl,
  isPlaying = false,
  onPlay,
  onPause,
  onClick,
}: PlaylistCardProps) {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleCardClick = () => {
    if (onClick) {
      onClick(id, title);
    } else {
      router.push(`/Home/${id}?name=${encodeURIComponent(title)}`);
    }
  };

  const handlePlayPauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying && onPause) {
      onPause();
    } else if (onPlay) {
      onPlay(id);
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (externalUrl) {
      window.open(externalUrl, "_blank");
    }
  };

  return (
    <TooltipProvider>
      <Card
        className="group bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50 transition-all duration-300 cursor-pointer relative overflow-hidden w-full max-w-[140px] sm:max-w-[200px] mx-auto"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="relative">
            {imageError || !image ? (
              <div className="w-full aspect-square bg-zinc-800 rounded-lg flex items-center justify-center">
                <Music className="w-12 h-12 text-zinc-600" />
              </div>
            ) : (
              <Image
                src={image}
                width={200}
                height={200}
                alt={title}
                className="w-full aspect-square object-cover rounded-lg"
                onError={() => setImageError(true)}
                priority
                unoptimized
              />
            )}

            {/* Play/Pause Button Overlay */}
            {(onPlay || onPause) && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-400 text-black rounded-full w-12 h-12 p-0 shadow-xl"
                  onClick={handlePlayPauseClick}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5" fill="currentColor" />
                  )}
                </Button>
              </div>
            )}

            {/* Badge (e.g., track number, album type) */}
            {badge && (
              <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs">
                {badge}
              </Badge>
            )}

            {/* Currently Playing Indicator */}
            {isPlaying && (
              <Badge className="absolute top-2 right-2 bg-green-500 text-black text-xs font-bold animate-pulse">
                Playing
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle
                className={`text-base font-semibold truncate transition-colors ${
                  isPlaying
                    ? "text-green-400"
                    : "text-white group-hover:text-green-400"
                }`}
              >
                {title}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>

          {description && (
            <div className="text-sm text-zinc-400 truncate leading-relaxed">
              {description}
            </div>
          )}

          {/* Footer with duration and external link */}
          {(duration || externalUrl) && (
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              {duration && (
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {duration}
                </span>
              )}
              {externalUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs hover:text-green-400"
                  onClick={handleExternalClick}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
