"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Music, Pause, Play } from "lucide-react";
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/Card";

type HomeMediaCardProps = {
  view?: "Grid" | "List";
  title: string;
  subtitle: string;
  image: string;
  href: string;
  isPlaying?: boolean;
  onPlay?: () => void;
};

export default function HomeMediaCard({ title, subtitle, image, href, isPlaying, onPlay, view = "Grid" }: HomeMediaCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  return (
    <Card className={`group relative min-w-0 ${view === "List" ? "flex items-center gap-3" : ""} p-3`}>
      <Link href={href} className={`${view === "List" ? "flex min-w-0 flex-1 items-center gap-4" : "block"} rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-900`}>
        <div className={`relative overflow-hidden rounded-lg bg-zinc-800 ${view === "List" ? "h-14 w-14 shrink-0" : "aspect-square"}`}>
          {image && failedImage !== image ? (
            <Image src={image} alt="" fill sizes="(max-width: 639px) 45vw, 240px" className="object-cover" onError={() => setFailedImage(image)} />
          ) : (
            <div className="flex h-full items-center justify-center"><Music className="h-10 w-10 text-zinc-500" aria-hidden="true" /></div>
          )}
        </div>
        <CardContent className={`min-w-0 p-0 ${view === "List" ? "flex-1" : "h-[72px] pt-3"}`}>
          <CardTitle className="leading-5 group-hover:text-brand group-focus-within:text-brand sm:text-base" title={title}>
            {title}
          </CardTitle>
          <CardDescription className="mt-1 truncate leading-5 sm:text-sm" title={decodeHtmlEntities(subtitle)}>
            {decodeHtmlEntities(subtitle)}
          </CardDescription>
        </CardContent>
      </Link>
      {onPlay && (
        <button type="button" onClick={onPlay} aria-label={`${isPlaying ? "Pause" : "Play"} ${title}`} aria-pressed={!!isPlaying}
          className={`${view === "List" ? "shrink-0" : "absolute bottom-[96px] right-5"} flex h-11 w-11 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-opacity hover:bg-brand/90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${isPlaying || view === "List" ? "opacity-100" : "touch-action-reveal"}`}>
          {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
        </button>
      )}
    </Card>
  );
}
