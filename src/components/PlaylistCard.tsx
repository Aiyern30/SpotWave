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
  isPlaying?: boolean;
  isPaused?: boolean; // Add isPaused prop to differentiate between paused and stopped
  onPlay?: (id?: string) => void;
  onPause?: () => void;
  onResume?: () => void; // Add onResume prop
  onClick?: (id: string, title: string) => void;
  menu?: React.ReactNode;
  fluid?: boolean;
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
  isPaused = false,
  onPlay,
  onPause,
  onResume,
  onClick,
  menu,
  fluid = false,
}: PlaylistCardProps) {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleCardClick = () => {
    if (onClick) {
      onClick(id, title);
    } else {
      router.push(`/Playlists/${id}?name=${encodeURIComponent(title)}`);
    }
  };

  const handlePlayPauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying && onPause) {
      // Currently playing - pause it
      onPause();
    } else if (isPaused && onResume) {
      // Currently paused - resume it
      onResume();
    } else if (onPlay) {
      // Not playing - play it
      onPlay(id);
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (externalUrl) {
      window.open(externalUrl, "_blank");
    }
  };

  // Determine if the card represents the current track (playing or paused)
  const isCurrentTrack = isPlaying || isPaused;

  return (
    <TooltipProvider>
      <Card
        className={`group bg-zinc-900/50 border border-zinc-800/70 hover:border-brand/50 hover:bg-brand/5 transition-colors cursor-pointer relative overflow-hidden w-full min-w-0 ${fluid ? "h-full" : "max-w-[140px] sm:max-w-[200px] mx-auto"}`}
        onClick={handleCardClick}
      >
        <CardHeader className={fluid ? "p-3 pb-0" : "pb-3"}>
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
                unoptimized
              />
            )}

            {/* Play/Pause Button Overlay */}
            {(onPlay || onPause || onResume) && (
              <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand/80 text-brand-foreground rounded-full w-12 h-12 p-0 shadow-xl motion-safe:hover:scale-105 motion-safe:transition-transform"
                  aria-label={`${isPlaying ? "Pause" : "Play"} ${title}`}
                  onClick={handlePlayPauseClick}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
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

            {/* Currently Playing/Paused Indicator */}
            {isPlaying && (
              <Badge className="absolute top-2 right-2 bg-brand text-brand-foreground text-xs font-bold motion-safe:animate-pulse">
                Playing
              </Badge>
            )}
            {isPaused && (
              <Badge className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold">
                Paused
              </Badge>
            )}

            {/* Menu Button Overlay */}
            {menu && (
              <div
                className="absolute bottom-2 right-2 opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                {menu}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className={fluid ? "min-h-[84px] pt-3 space-y-1" : "pt-0 space-y-2"}>
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle
                className={`text-sm sm:text-base leading-5 font-semibold truncate transition-colors ${
                  isCurrentTrack
                    ? "text-brand"
                    : "text-white group-hover:text-brand"
                }`}
              >
                <button type="button" className="block w-full truncate text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" onClick={(event) => { event.stopPropagation(); handleCardClick(); }}>{title}</button>
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>

          {(description || fluid) && (
            <div className="text-xs sm:text-sm text-zinc-400 truncate leading-5">
              {description || "\u00a0"}
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
                  className="h-6 px-2 text-xs hover:text-brand"
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
