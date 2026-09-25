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
import { Search, Music, User, Play, Clock, Disc, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import ThemeSwitcher from "./ThemeSwitcher";
import styles from "./Header.module.css";

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

export const Breadcrumbs = ({ actions, leading }: { actions?: React.ReactNode; leading?: React.ReactNode }) => {
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
    <div className="fixed inset-x-0 top-0 z-40 min-h-14 border-b border-white/10 bg-zinc-950/95 px-3 md:relative md:inset-auto md:min-h-[76px] md:border-0 md:bg-transparent md:p-0">
      <div className="flex min-h-14 min-w-0 items-center gap-2 md:min-h-[76px]">
        {leading}
        <Breadcrumb className="flex-1">
          <BreadcrumbList>
            {breadcrumbSegments.length === 0 || pathname === "/Home" ? (
              <BreadcrumbItem>
                <BreadcrumbPage>Home</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              breadcrumbSegments.map((segment, index) => {
                const isLast = index === breadcrumbSegments.length - 1;
                const href = `/${breadcrumbSegments.slice(0, index + 1).join("/")}`;
                let label = segment;
                try {
                  label = decodeURIComponent(segment);
                } catch {}
                label =
                  isLast && name
                    ? name
                    : label.charAt(0).toUpperCase() + label.slice(1);
                return (
                  <React.Fragment key={href}>
                    {index > 0 && (
                      <BreadcrumbSeparator className="hidden text-zinc-600 md:block" />
                    )}
                    <BreadcrumbItem
                      className={
                        isLast
                          ? "min-w-0 flex-1"
                          : "hidden min-w-0 max-w-32 md:inline-flex"
                      }
                    >
                      {isLast ? (
                        <BreadcrumbPage title={label}>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            href={href}
                            title={label}
                            onClick={(event) => handleNavigation(event, href)}
                          >
                            {label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
          <ThemeSwitcher />
        </div>
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
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800 hover:bg-brand hover:text-brand-foreground">
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
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const traversalRef = useRef(false);
  const isInitialMount = useRef(true);

  // Listen to popstate (back/forward history traversals)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      traversalRef.current = true;
      const stateIdx = e.state?.__sw_idx;
      const maxIdx = parseInt(sessionStorage.getItem("sw_hist_max") || "0", 10) || 0;

      if (typeof stateIdx === "number") {
        sessionStorage.setItem("sw_hist_idx", String(stateIdx));
        setCanGoForward(stateIdx < maxIdx);
        setCanGoBack(stateIdx > 0 || window.history.length > 1);
      } else {
        const prevIdx = parseInt(sessionStorage.getItem("sw_hist_idx") || "0", 10) || 0;
        setCanGoForward(prevIdx < maxIdx);
        setCanGoBack(prevIdx > 0 || window.history.length > 1);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Track route changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    let maxIdx = parseInt(sessionStorage.getItem("sw_hist_max") || "0", 10) || 0;
    let currentIdx: number;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      const stateIdx = window.history.state?.__sw_idx;
      if (typeof stateIdx === "number") {
        currentIdx = stateIdx;
      } else {
        const savedIdx = parseInt(sessionStorage.getItem("sw_hist_idx") || "0", 10) || 0;
        currentIdx = savedIdx;
        try {
          window.history.replaceState({ ...window.history.state, __sw_idx: currentIdx }, "");
        } catch {}
      }
      setCanGoForward(currentIdx < maxIdx);
      setCanGoBack(currentIdx > 0 || window.history.length > 1);
      return;
    }

    if (traversalRef.current) {
      traversalRef.current = false;
      const stateIdx = window.history.state?.__sw_idx;
      currentIdx = typeof stateIdx === "number"
        ? stateIdx
        : (parseInt(sessionStorage.getItem("sw_hist_idx") || "0", 10) || 0);
    } else {
      const prevIdx = parseInt(sessionStorage.getItem("sw_hist_idx") || "0", 10) || 0;
      currentIdx = prevIdx + 1;
      maxIdx = currentIdx;
      sessionStorage.setItem("sw_hist_max", String(maxIdx));
      try {
        window.history.replaceState({ ...window.history.state, __sw_idx: currentIdx }, "");
      } catch {}
    }

    sessionStorage.setItem("sw_hist_idx", String(currentIdx));
    setCanGoForward(currentIdx < maxIdx);
    setCanGoBack(currentIdx > 0 || window.history.length > 1);
  }, [pathname]);

  const handleBack = () => {
    traversalRef.current = true;
    router.back();
    setCanGoForward(true);
  };

  const handleForward = () => {
    if (!canGoForward) return;
    traversalRef.current = true;
    router.forward();
  };

  const searchArtist = async (term: string): Promise<Artist[]> => {
    const token = localStorage.getItem("Token");
    if (!token) return [];
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          term,
        )}&type=artist&limit=3`,
        { headers: { Authorization: `Bearer ${token}` } },
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
          term,
        )}&type=track&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } },
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
        { headers: { Authorization: `Bearer ${token}` } },
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
            (song) => !songIdsInTopTracks.has(song.id),
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
    [searchTerm],
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
    name: string,
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
    <div className="flex items-center gap-2 sm:gap-3 w-full max-w-3xl">
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBack}
          disabled={!canGoBack}
          className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full ${styles.navButton} active:scale-95 flex items-center justify-center cursor-pointer`}
          title="Go back"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleForward}
          disabled={!canGoForward}
          className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full ${styles.navButton} active:scale-95 flex items-center justify-center cursor-pointer`}
          title={canGoForward ? "Go forward" : undefined}
          aria-label="Go forward"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>

      <form
        onSubmit={handleSearch}
        className={`${styles.searchForm} relative flex-1 min-w-0`}
      >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand" />
        <Input
          type="text"
          placeholder="What do you want to play?"
          aria-label="Search songs and artists"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          ref={inputRef}
          onBlur={handleInputBlur}
          onFocus={() => searchTerm.trim() && setDropdownVisible(true)}
          className={`${styles.searchInput} h-12 rounded-xl pl-10 pr-10 text-base sm:text-sm text-white placeholder:text-zinc-400`}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand border-t-transparent" />
          </div>
        )}
      </div>

      {dropdownVisible && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className={`${styles.searchDropdown} search-results-scrollbar absolute mt-2 w-full rounded-xl border overflow-auto overscroll-contain z-50`}
        >
          <div className="p-2 space-y-1">
            {searchResults.map((result, idx) => {
              if (result.type === "artistWithTopTracks") {
                return (
                  <div key={result.artist.id} className="space-y-1">
                    <Card
                      className={`${styles.result} ${styles.artistResult} cursor-pointer group`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResultClick(
                          result.artist.id,
                          "artist",
                          result.artist.name,
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
                              <User className="h-4 w-4 text-brand" />
                              <p className="font-semibold text-white truncate">
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
                        className={`${styles.result} cursor-pointer group`}
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
                              <p className="font-medium text-white text-sm truncate">
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
                    className={`${styles.result} cursor-pointer group`}
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
                          <p className="font-medium text-white text-sm truncate">
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
  </div>
);
};

const Header = () => {
  return (
    <div className="flex flex-col space-y-6 relative z-50">
      <Suspense
        fallback={<div className="h-6 w-32 bg-zinc-800 animate-pulse rounded" />}
      >
        <Breadcrumbs />
      </Suspense>
      <SearchSection />
    </div>
  );
};

export default Header;
