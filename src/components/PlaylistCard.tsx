"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
} from "@/components/ui/";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/";
import { Play, MoreHorizontal } from "lucide-react";

interface PlaylistCardProps {
  id: string;
  image: string;
  title: string;
  description?: string;
  onPlay?: (id: string) => void;
  onClick?: (id: string, title: string) => void;
}

export default function PlaylistCard({
  id,
  image,
  title,
  description,
  onPlay,
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

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(id);
    }
  };

  return (
    <TooltipProvider>
      <Card
        className="relative w-full max-w-[140px] sm:max-w-[200px] h-[165px] sm:h-[290px] cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/70 transition-all duration-300 hover:scale-105 group border-zinc-800/50 mx-auto"
        onClick={handleCardClick}
      >
        <CardHeader className="p-0 pb-0">
          <div className="relative w-full px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3">
            <div className="w-full aspect-square max-w-[115px] sm:max-w-[170px] mx-auto rounded-lg shadow-xl overflow-hidden">
              {imageError || !image ? (
                <Image
                  src="/default-artist.png"
                  width={170}
                  height={170}
                  className="object-cover rounded-lg w-full h-full"
                  alt={title}
                  priority
                  unoptimized
                />
              ) : (
                <Image
                  src={image}
                  width={170}
                  height={170}
                  className="object-cover rounded-lg w-full h-full"
                  alt={title}
                  onError={() => setImageError(true)}
                  priority
                  unoptimized
                />
              )}
            </div>

            {/* Play button overlay */}
            {onPlay && (
              <div className="absolute bottom-2 right-4 sm:bottom-4 sm:right-7 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <Button
                  size="icon"
                  className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-green-500 hover:bg-green-400 text-black shadow-xl hover:scale-110 transition-all duration-200"
                  onClick={handlePlayClick}
                >
                  <Play
                    className="h-4 w-4 sm:h-6 sm:w-6 ml-0.5"
                    fill="currentColor"
                  />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-1 sm:p-5 sm:pt-2 sm:space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="text-white text-xs sm:text-base font-semibold line-clamp-2 sm:line-clamp-1 hover:text-green-400 transition-colors leading-tight sm:leading-normal">
                {title}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>

          {description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CardDescription className="hidden sm:block text-zinc-400 text-sm line-clamp-2 truncate leading-relaxed mt-1">
                  {description}
                </CardDescription>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="truncate">{description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>

        {/* More options button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          onClick={(e) => {
            e.stopPropagation();
            // Handle more options
          }}
        >
          <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </Card>
    </TooltipProvider>
  );
}
