"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Music, Pause, Play } from "lucide-react";

type HomeMediaCardProps = {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  isPlaying?: boolean;
  onPlay?: () => void;
};

export default function HomeMediaCard({ title, subtitle, image, href, isPlaying, onPlay }: HomeMediaCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);

  return (
    <article className="group relative min-w-0 rounded-xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition-colors hover:border-brand/50 hover:bg-brand/5 focus-within:border-brand/50">
      <Link href={href} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-900">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-800">
          {image && failedImage !== image ? (
            <Image src={image} alt="" fill sizes="(max-width: 639px) 45vw, 240px" className="object-cover" onError={() => setFailedImage(image)} />
          ) : (
            <div className="flex h-full items-center justify-center"><Music className="h-10 w-10 text-zinc-500" aria-hidden="true" /></div>
          )}
        </div>
        <div className="h-[72px] min-w-0 pt-3">
          <h3 className="truncate text-sm font-semibold leading-5 text-zinc-100 group-hover:text-brand group-focus-within:text-brand sm:text-base" title={title}>{title}</h3>
          <p className="mt-1 truncate text-xs leading-5 text-zinc-400 sm:text-sm" title={subtitle}>{subtitle}</p>
        </div>
      </Link>
      {onPlay && (
        <button type="button" onClick={onPlay} aria-label={`${isPlaying ? "Pause" : "Play"} ${title}`} aria-pressed={!!isPlaying}
          className={`absolute bottom-[96px] right-5 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-opacity hover:bg-brand/90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${isPlaying ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"}`}>
          {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
        </button>
      )}
    </article>
  );
}
