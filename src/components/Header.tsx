"use client";

import React, {
  useState,
  type FormEvent,
  Suspense,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
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
} from "./ui";
import { formatSongDuration } from "@/utils/function";
import { Search, Music, User, Play, Clock, Disc } from "lucide-react";
import Image from "next/image";

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

const HeaderContent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        // Search for songs and artists in parallel
        const [songs, artists] = await Promise.all([
          searchSong(searchTerm),
          searchArtist(searchTerm),
        ]);

        const results: SearchResult[] = [];
        let songIdsInTopTracks = new Set<string>();

        // If we found artists, get top tracks for the first one
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

        // Add additional songs (filtered to avoid duplicates)
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

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      }
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

  const searchArtist = async (term: string): Promise<Artist[]> => {
    const token = localStorage.getItem("Token");
    if (!token) return [];

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          term
        )}&type=artist&limit=3`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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

  const breadcrumbSegments = pathname.split("/").filter(Boolean);

  return (
    <div className="relative flex flex-col space-y-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/Home"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbSegments.map((segment, index) => {
            if (segment.toLowerCase() === "home" && index === 0) return null;

            const isLast = index === breadcrumbSegments.length - 1;
            const href = `/${breadcrumbSegments.slice(0, index + 1).join("/")}`;

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
                      href={href}
                      className="text-zinc-400 hover:text-white transition-colors capitalize"
                    >
                      {segment.charAt(0).toUpperCase() + segment.slice(1)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Search Section */}
      <form onSubmit={handleSearch} className="relative">
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

        {/* Search Results Dropdown */}
        {dropdownVisible && searchResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-[500px] overflow-auto z-50"
          >
            <div className="p-2 space-y-1">
              {searchResults.map((result) => {
                if (result.type === "artistWithTopTracks") {
                  return (
                    <div key={result.artist.id} className="space-y-1">
                      {/* Artist Result */}
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
                                <User className="h-4 w-4 text-green-500" />
                                <p className="font-semibold text-white truncate group-hover:text-green-400 transition-colors">
                                  {result.artist.name}
                                </p>
                              </div>
                              <p className="text-zinc-400 text-sm">Artist</p>
                              {result.artist.followers && (
                                <p className="text-zinc-500 text-xs">
                                  {result.artist.followers.total.toLocaleString()}{" "}
                                  followers
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-green-500 hover:text-green-400"
                            >
                              <Play className="h-4 w-4" fill="currentColor" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Top Tracks */}
                      {result.topTracks.length > 0 && (
                        <div className="ml-4 space-y-1">
                          <div className="px-2 py-1">
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                              Top Tracks
                            </p>
                          </div>
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
                                    <p className="font-medium text-white text-sm truncate group-hover:text-green-400 transition-colors">
                                      {track.name}
                                    </p>
                                    <div className="flex items-center space-x-2 text-xs text-zinc-400">
                                      <span>
                                        {track.artists
                                          .map((artist) => artist.name)
                                          .join(", ")}
                                      </span>
                                      <span>•</span>
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {formatSongDuration(track.duration_ms)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-green-500 hover:text-green-400"
                                  >
                                    <Play
                                      className="h-3 w-3"
                                      fill="currentColor"
                                    />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}

              {/* Additional Songs Section */}
              {searchResults.find((result) => result.type === "song") && (
                <div className="space-y-1">
                  <div className="px-2 py-2 border-t border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <Music className="h-4 w-4 text-zinc-500" />
                      <p className="text-sm text-zinc-400 font-medium">
                        More Songs
                      </p>
                    </div>
                  </div>
                  {searchResults.map((result) => {
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
                          <CardContent className="p-3">
                            <div className="flex items-center space-x-3">
                              <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                <Image
                                  src={
                                    track.album.images[0]?.url ||
                                    "/default-artist.png"
                                  }
                                  width={48}
                                  height={48}
                                  className="object-cover"
                                  alt={track.name}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate group-hover:text-green-400 transition-colors">
                                  {track.name}
                                </p>
                                <div className="flex items-center space-x-2 text-sm text-zinc-400">
                                  <span>
                                    {track.artists
                                      .map((artist) => artist.name)
                                      .join(", ")}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-zinc-500 mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Disc className="h-3 w-3" />
                                    <span>{track.album.name}</span>
                                  </div>
                                  <span>•</span>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {formatSongDuration(track.duration_ms)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-green-500 hover:text-green-400"
                              >
                                <Play className="h-4 w-4" fill="currentColor" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ));
                    }
                    return null;
                  })}
                </div>
              )}
            </div>

            {/* No Results */}
            {searchTerm.trim() &&
              !isSearching &&
              searchResults.length === 0 && (
                <div className="p-6 text-center">
                  <Search className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-medium">No results found</p>
                  <p className="text-zinc-500 text-sm">
                    Try searching for something else
                  </p>
                </div>
              )}
          </div>
        )}
      </form>
    </div>
  );
};

const Header = () => (
  <Suspense
    fallback={<div className="h-16 bg-zinc-900/50 rounded-lg animate-pulse" />}
  >
    <HeaderContent />
  </Suspense>
);

export default Header;
