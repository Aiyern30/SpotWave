"use client";

import Image from "next/image";
import { Button, Badge } from "@/components/ui";
import { Heart, Disc3, Calendar, Music } from "lucide-react";

interface AlbumHeaderProps {
  album: any;
  isSaved: boolean;
  toggleSaveAlbum: () => void;
  artistImage: string | null;
  handleArtistClick: (artistId: string, artistName: string) => void;
  menu?: React.ReactNode;
}

export default function AlbumHeader({
  album,
  isSaved,
  toggleSaveAlbum,
  artistImage,
  handleArtistClick,
  menu,
}: AlbumHeaderProps) {
  if (!album) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand/30 via-zinc-800/50 to-zinc-900/90 backdrop-blur-sm border border-zinc-800/50 w-full">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--brand-primary)/0.15),transparent_70%)]" />

      <div className="relative flex flex-col md:flex-row items-center md:items-start p-6 md:p-8 gap-6 md:gap-8">
        <div className="relative group flex-shrink-0 w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64">
          <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
            <Image
              src={album.images[0]?.url || "/default-artist.png"}
              fill
              alt={album.name}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center text-center md:text-left space-y-4 md:space-y-6 w-full">
          <div className="space-y-3">
            <Badge
              variant="secondary"
              className="bg-brand/20 text-brand border-brand/30 capitalize inline-flex items-center"
            >
              <Disc3 className="w-3 h-3 mr-1" />
              {album.album_type}
            </Badge>
            
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight break-words max-w-full">
                {album.name}
              </h1>
              {menu ? (
                menu
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSaveAlbum}
                  className={`flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full backdrop-blur-sm border transition-all duration-200 hover:scale-110 ${
                    isSaved
                      ? "text-brand bg-brand/10 border-brand/20"
                      : "text-white bg-black/20 border-white/10 hover:bg-black/40"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${
                      isSaved ? "fill-current" : "text-white"
                    }`}
                  />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 sm:gap-6 text-zinc-300 text-sm sm:text-base">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-brand" />
              <span className="font-medium">
                {new Date(album.release_date).getFullYear()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4 text-blue-500" />
              <span className="font-medium">
                {album.total_tracks} tracks
              </span>
            </div>
          </div>

          {album.artists && (
            <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-center md:justify-start pt-2">
              {album.artists.map((artist: any, index: number) => (
                <div key={artist.id} className="flex items-center gap-2 sm:gap-3">
                  {index === 0 && artistImage && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-white/10 flex-shrink-0">
                      <Image
                        src={artistImage}
                        width={40}
                        height={40}
                        alt={artist.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <Button
                    variant="link"
                    className="text-white hover:text-brand p-0 h-auto font-semibold text-base sm:text-lg hover:underline transition-colors break-words max-w-[150px] sm:max-w-xs"
                    onClick={() => handleArtistClick(artist.id, artist.name)}
                  >
                    <span className="truncate">{artist.name}</span>
                  </Button>
                  {index < album.artists.length - 1 && (
                    <span className="text-zinc-600 text-lg sm:text-xl">•</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
