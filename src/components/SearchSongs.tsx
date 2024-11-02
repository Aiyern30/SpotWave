import { IoMdAdd } from "react-icons/io";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui";
import { useEffect, useState } from "react";
import { Artist, Track } from "@/lib/types";

interface SearchSongsProps {
  playlistID: string;
  refetch: (playlistID: string) => void;
}

export default function SearchSongs({ playlistID, refetch }: SearchSongsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      console.error("Search query is empty");
      return;
    }

    setIsLoading(true);
    try {
      if (!token) {
        console.error("Spotify access token is missing");
        return;
      }

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          searchQuery
        )}&type=track&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Error: ${response.status} - ${response.statusText}`);
        return;
      }

      const data = await response.json();
      setSearchResults(data.tracks.items);
    } catch (error) {
      console.error("Error searching for tracks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTrackToPlaylist = async (trackUri: string) => {
    if (!token) {
      console.error("Spotify access token is missing");
      return;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [trackUri],
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `Error adding track to playlist: ${response.status} - ${response.statusText}`
        );
        return;
      }

      refetch(playlistID);
    } catch (error) {
      console.error("Error adding track to playlist:", error);
    }
  };

  return (
    <div>
      <Sheet>
        <SheetTrigger>
          <IoMdAdd size={45} />
        </SheetTrigger>
        <SheetContent className="">
          <SheetHeader>
            <SheetTitle>Search for Songs</SheetTitle>
            <SheetDescription>
              Use the input below to search for songs and add them to your
              playlist.
            </SheetDescription>
          </SheetHeader>

          <div className="my-4 flex items justify-center">
            <Input
              type="text"
              placeholder="Search for a song"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <Button
              onClick={handleSearch}
              variant={"default"}
              className=" text-white py-2 px-4 rounded-md"
              disabled={isLoading}
            >
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>

          <div className="mt-4 max-h-[75vh] overflow-y-auto">
            {searchResults.length > 0 ? (
              <ul>
                {searchResults.map((track) => (
                  <li key={track.id} className="my-4">
                    <div className="flex items-center justify-between">
                      <Avatar className="mr-4">
                        <AvatarImage src={track.album.images[2]?.url || ""} />
                        <AvatarFallback>Album</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="font-bold">{track.name}</div>
                        <div>
                          {track.artists
                            .map((artist: Artist) => artist.name)
                            .join(", ")}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {track.album.name}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <IoMdAdd size={30} className="mr-2.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Add to playlist</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleAddTrackToPlaylist(track.uri)}
                          >
                            Add {track.name}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {track.preview_url && (
                      <audio controls className="w-full mt-2">
                        <source src={track.preview_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No results found</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
