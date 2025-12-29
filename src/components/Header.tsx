"use client";

import React, {
  useState,
  type FormEvent,
  Suspense,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Input,
  Card,
  CardContent,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui";
import { formatSongDuration } from "@/utils/function";
import { Search, Music, User, Play, Clock, Disc } from "lucide-react";
import Image from "next/image";
import ThemeSwitcher from "./ThemeSwitcher";

interface Artist {
  id: string;
  name: string;
  images: { url: string }[];
  followers?: { total: number };
  genres?: string[];
}

interface Track {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: { images: { url: string }[]; name: string; id: string };
  duration_ms: number;
  popularity?: number;
}

type SearchResult =
  | { type: "artist"; items: Artist[] }
  | { type: "song"; items: Track[] }
  | { type: "artistWithTopTracks"; artist: Artist; topTracks: Track[] };

export const Breadcrumbs = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const breadcrumbSegments = pathname.split("/").filter(Boolean);

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const isQuizPage =
    pathname?.startsWith("/Games/artist-quiz/") ||
    pathname === "/Games/liked-songs" ||
    pathname?.startsWith("/Games/playlist-quiz/") ||
    (pathname === "/Games/ai-generated" && searchParams.get("mode") === "quiz");

  const handleNavigation = (e: React.MouseEvent, href: string) => {
    if (isQuizPage) {
      e.preventDefault();
      setPendingHref(href);
      setShowExitDialog(true);
    }
  };

  const confirmExit = () => {
    if (pendingHref) {
      router.push(pendingHref);
    }
    setShowExitDialog(false);
    setPendingHref(null);
  };

  return (
    <div className="lg:relative fixed top-0 left-0 right-0 z-40 lg:z-auto bg-black/60 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none px-4 lg:px-0 py-4 lg:py-0 border-b border-white/5 lg:border-0 transition-all duration-300 pl-20 lg:pl-0">
      <div className="flex items-center justify-between w-full pr-4 lg:pr-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <Link
                  href="/Home"
                  onClick={(e) => handleNavigation(e, "/Home")}
                >
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbSegments.map((segment, index) => {
              if (segment.toLowerCase() === "home" && index === 0) return null;

              const isLast = index === breadcrumbSegments.length - 1;
              const href = `/${breadcrumbSegments
                .slice(0, index + 1)
                .join("/")}`;

              return (
                <React.Fragment key={href}>
                  <BreadcrumbSeparator className="text-zinc-600" />
                  <BreadcrumbItem>
                    {isLast && name ? (
                      <BreadcrumbPage className="text-white font-medium">
                        {name}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        asChild
                        className="text-zinc-400 hover:text-white transition-colors capitalize"
                      >
                        <Link
                          href={href}
                          onClick={(e) => handleNavigation(e, href)}
                        >
                          {segment.charAt(0).toUpperCase() + segment.slice(1)}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <ThemeSwitcher />
      </div>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Quite Quiz?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Your current progress in this quiz will be lost. Are you sure you
              want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800 hover:bg-brand-500">
              Continue Quiz
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExit}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Exit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const SearchSection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchArtist = async (term: string): Promise<Artist[]> => {
    const token = localStorage.getItem("Token");
    if (!token) return [];
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          term
        )}&type=artist&limit=3`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (
        data.artists?.items.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          images: artist.images,
          followers: artist.followers,
          genres: artist.genres,
        })) || []
      );
    } catch (error) {
      console.error("Error searching for artist:", error);
      return [];
    }
  };

  const searchSong = async (term: string): Promise<Track[]> => {
    const token = localStorage.getItem("Token");
    if (!token) return [];
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          term
        )}&type=track&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (
        data.tracks?.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
        })) || []
      );
    } catch (error) {
      console.error("Error searching for song:", error);
      return [];
    }
  };

  const fetchArtistTopTracks = async (artistId: string): Promise<Track[]> => {
    const token = localStorage.getItem("Token");
    if (!token) return [];
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (
        data.tracks?.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
        })) || []
      );
    } catch (error) {
      console.error("Error fetching top tracks for artist:", error);
      return [];
    }
  };

  const handleSearch = useCallback(
    async (event?: FormEvent) => {
      if (event) event.preventDefault();
      if (searchTerm.trim() === "") {
        setSearchResults([]);
        setDropdownVisible(false);
        return;
      }
      setIsSearching(true);
      try {
        const [songs, artists] = await Promise.all([
          searchSong(searchTerm),
          searchArtist(searchTerm),
        ]);
        const results: SearchResult[] = [];
        let songIdsInTopTracks = new Set<string>();
        if (artists.length > 0) {
          const artistId = artists[0].id;
          const topTracks = await fetchArtistTopTracks(artistId);
          songIdsInTopTracks = new Set(topTracks.map((track) => track.id));
          results.push({
            type: "artistWithTopTracks",
            artist: artists[0],
            topTracks: topTracks.slice(0, 5),
          });
        }
        if (songs.length > 0) {
          const filteredSongs = songs.filter(
            (song) => !songIdsInTopTracks.has(song.id)
          );
          if (filteredSongs.length > 0) {
            results.push({ type: "song", items: filteredSongs.slice(0, 5) });
          }
        }
        setSearchResults(results);
        setDropdownVisible(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [searchTerm]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) handleSearch();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleSearch]);

  const handleInputBlur = () => {
    setTimeout(() => {
      if (
        !inputRef.current?.contains(document.activeElement) &&
        !dropdownRef.current?.contains(document.activeElement)
      ) {
        setDropdownVisible(false);
      }
    }, 150);
  };

  const handleResultClick = (
    id: string,
    type: "song" | "artist",
    name: string
  ) => {
    if (type === "song") {
      router.push(`/Songs/${id}?name=${encodeURIComponent(name)}`);
    } else if (type === "artist") {
      router.push(`/Artists/${id}?name=${encodeURIComponent(name)}`);
    }
    setSearchTerm("");
    setSearchResults([]);
    setDropdownVisible(false);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="What do you want to play?"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          ref={inputRef}
          onBlur={handleInputBlur}
          onFocus={() => searchTerm.trim() && setDropdownVisible(true)}
          className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400 focus:border-green-500 focus:ring-green-500/20 h-12"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent" />
          </div>
        )}
      </div>

      {dropdownVisible && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-[500px] overflow-auto z-50"
        >
          <div className="p-2 space-y-1">
            {searchResults.map((result, idx) => {
              if (result.type === "artistWithTopTracks") {
                return (
                  <div key={result.artist.id} className="space-y-1">
                    <Card
                      className="bg-zinc-800/50 hover:bg-zinc-700/50 border-zinc-700/50 cursor-pointer transition-all duration-200 group"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResultClick(
                          result.artist.id,
                          "artist",
                          result.artist.name
                        );
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={
                                result.artist.images[0]?.url ||
                                "/default-artist.png"
                              }
                              width={48}
                              height={48}
                              className="object-cover"
                              alt={result.artist.name}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 bg-brand-500" />
                              <p className="font-semibold text-white truncate group-hover:bg-brand-400 transition-colors">
                                {result.artist.name}
                              </p>
                            </div>
                            <p className="text-zinc-400 text-sm">Artist</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {result.topTracks.map((track) => (
                      <Card
                        key={track.id}
                        className="bg-zinc-800/30 hover:bg-zinc-700/30 border-zinc-700/30 cursor-pointer transition-all duration-200 group"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResultClick(track.id, "song", track.name);
                        }}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center space-x-3">
                            <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={
                                  track.album.images[0]?.url ||
                                  "/default-artist.png"
                                }
                                width={40}
                                height={40}
                                className="object-cover"
                                alt={track.name}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm truncate group-hover:bg-brand-400 transition-colors">
                                {track.name}
                              </p>
                              <p className="text-xs text-zinc-400 truncate">
                                {track.artists.map((a) => a.name).join(", ")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              }
              if (result.type === "song") {
                return result.items.map((track) => (
                  <Card
                    key={track.id}
                    className="bg-zinc-800/30 hover:bg-zinc-700/30 border-zinc-700/30 cursor-pointer transition-all duration-200 group"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResultClick(track.id, "song", track.name);
                    }}
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={
                              track.album.images[0]?.url ||
                              "/default-artist.png"
                            }
                            width={40}
                            height={40}
                            className="object-cover"
                            alt={track.name}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate group-hover:bg-brand-400 transition-colors">
                            {track.name}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">
                            {track.artists.map((a) => a.name).join(", ")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ));
              }
              return null;
            })}
          </div>
        </div>
      )}
    </form>
  );
};

const Header = () => (
  <div className="flex flex-col space-y-6">
    <Suspense
      fallback={<div className="h-6 w-32 bg-zinc-800 animate-pulse rounded" />}
    >
      <Breadcrumbs />
    </Suspense>
    <SearchSection />
  </div>
);

export default Header;
