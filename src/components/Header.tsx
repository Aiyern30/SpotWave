import React, { useState, FormEvent, Suspense } from "react";
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui";
import { formatSongDuration } from "@/utils/function";

interface Artist {
  id: string;
  name: string;
  images: { url: string }[];
}

interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  duration_ms: number;
}

type SearchResult =
  | { type: "artist"; items: Artist[] }
  | { type: "song"; items: Track[] }
  | { type: "artistWithTopTracks"; artist: Artist; topTracks: Track[] };

const HeaderContent = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    if (searchTerm.trim() === "") {
      setSearchResults([]);
      setDropdownVisible(false);
      return;
    }

    // Search for songs
    const songs = await searchSong(searchTerm);

    // Search for artists
    const artists = await searchArtist(searchTerm);

    // Prepare the results
    let results: SearchResult[] = [];
    let songIdsInTopTracks = new Set<string>();

    if (artists.length > 0) {
      const artistId = artists[0].id;
      const topTracks = await fetchArtistTopTracks(artistId);
      songIdsInTopTracks = new Set(topTracks.map((track) => track.id));
      results.push({
        type: "artistWithTopTracks",
        artist: artists[0],
        topTracks,
      });
    }

    if (songs.length > 0) {
      // Filter out songs that are already in topTracks
      const filteredSongs = songs.filter(
        (song) => !songIdsInTopTracks.has(song.id)
      );
      if (filteredSongs.length > 0) {
        results.push({ type: "song", items: filteredSongs.slice(0, 5) }); // Limit to top 5 songs
      }
    }

    setSearchResults(results);
    setDropdownVisible(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (
        !inputRef.current?.contains(document.activeElement) &&
        !dropdownRef.current?.contains(document.activeElement)
      ) {
        setDropdownVisible(false);
      }
    }, 100);
  };

  const searchArtist = async (term: string): Promise<Artist[]> => {
    const token = localStorage.getItem("Token");

    if (!token) return [];

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          term
        )}&type=artist`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        console.error("API response not OK:", response.statusText);
        return [];
      }

      const data = await response.json();

      return (
        data.artists?.items.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          images: artist.images,
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
        )}&type=track`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      return (
        data.tracks?.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
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

      const data = await response.json();
      return (
        data.tracks.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
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
    <div className="relative flex flex-col space-y-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/Home">Home</BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbSegments.map((segment, index) => {
            if (segment.toLowerCase() === "home" && index === 0) return null;

            const isLast = index === breadcrumbSegments.length - 1;
            const href = `/${breadcrumbSegments.slice(0, index + 1).join("/")}`;

            return (
              <React.Fragment key={href}>
                <BreadcrumbSeparator className="text-white" />
                <BreadcrumbItem className="text-white">
                  {isLast && name ? (
                    <BreadcrumbPage className="text-white">
                      {name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>
                      {segment.charAt(0).toUpperCase() + segment.slice(1)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <form onSubmit={handleSearch}>
        <div className="relative">
          <Input
            type="text"
            placeholder="What do you want to play?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={inputRef}
            onBlur={handleInputBlur}
          />
          {dropdownVisible && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-[400px] overflow-auto"
              style={{ zIndex: 9999 }}
            >
              <ul>
                {searchResults.map((result) => {
                  if (result.type === "artistWithTopTracks") {
                    return (
                      <React.Fragment key={result.artist.id}>
                        <li
                          className="p-2 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                          onClick={() =>
                            handleResultClick(
                              result.artist.id,
                              "artist",
                              result.artist.name
                            )
                          }
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-36 h-36 relative p-1">
                              <AvatarImage
                                src={
                                  result.artist.images[0]?.url ||
                                  "/default-artist.png"
                                }
                                alt={result.artist.name}
                              />
                              <AvatarFallback className="text-black">
                                {result.artist.name}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-xl text-black">
                                {result.artist.name}
                              </p>
                              <p className="text-gray-600">Artist</p>
                            </div>
                          </div>
                        </li>
                        {result.topTracks.slice(0, 5).map((track) => (
                          <li
                            key={track.id}
                            className="p-2 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                            onClick={() =>
                              handleResultClick(track.id, "song", track.name)
                            }
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-20 h-20 relative p-1">
                                <AvatarImage
                                  src={
                                    track.album.images[0]?.url ||
                                    "/default-artist.png"
                                  }
                                  alt={track.name}
                                />
                                <AvatarFallback className="text-black">
                                  {track.name}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <p className="font-semibold text-black">
                                  {track.name}
                                </p>
                                <p className="text-gray-600">
                                  {track.artists
                                    .map((artist) => artist.name)
                                    .join(", ")}
                                </p>
                                <p className="text-gray-400">
                                  {formatSongDuration(track.duration_ms)}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </React.Fragment>
                    );
                  }
                  return null;
                })}
                {searchResults.find((result) => result.type === "song") && (
                  <React.Fragment>
                    <li className="p-2 border-b border-gray-200 bg-gray-100 text-gray-700 font-bold">
                      Songs
                    </li>
                    {searchResults.map((result) => {
                      if (result.type === "song") {
                        return result.items.slice(0, 5).map((track) => (
                          <li
                            key={track.id}
                            className="p-2 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                            onClick={() =>
                              handleResultClick(track.id, "song", track.name)
                            }
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-20 h-20 relative p-1">
                                <AvatarImage
                                  src={
                                    track.album.images[0]?.url ||
                                    "/default-artist.png"
                                  }
                                  alt={track.name}
                                />
                                <AvatarFallback className="text-black">
                                  {track.name}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <p className="font-semibold text-black">
                                  {track.name}
                                </p>
                                <p className="text-gray-600">
                                  {track.artists
                                    .map((artist) => artist.name)
                                    .join(", ")}
                                </p>
                                <p className="text-gray-400">
                                  {formatSongDuration(track.duration_ms)}
                                </p>
                              </div>
                            </div>
                          </li>
                        ));
                      }
                      return null;
                    })}
                  </React.Fragment>
                )}
              </ul>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

const Header = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <HeaderContent />
  </Suspense>
);

export default Header;
