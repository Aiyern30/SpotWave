"use client"
import { LuLayoutGrid } from "react-icons/lu";
import { FaTable} from "react-icons/fa6";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage, Skeleton, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow ,Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationEllipsis, PaginationNext, Card, CardFooter, CardHeader, CardTitle, CardContent} from '@/components/ui';
import { GiDuration } from "react-icons/gi";

interface Image {
  url: string;
  height: number;
  width: number;
}

interface Artist {
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

interface Album {
  album_type: string;
  total_tracks: number;
  available_markets: string[];
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: string;
  restrictions: {
    reason: string;
  };
  type: string;
  uri: string;
  artists: Artist[];
}

interface Track {
  album: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: {
    isrc: string;
    ean: string;
    upc: string;
  };
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  is_playable: boolean;
  linked_from: {};
  restrictions: {
    reason: string;
  };
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
  is_local: boolean;
}

interface PlaylistProps {
  collaborative: boolean;
  description: string;
  external_urls: {
    spotify: string;
  };
  followers: {
    href: string;
    total: number;
  };
  href: string;
  id: string;
  images: Image[];
  name: string;
  owner: {
    external_urls: {
      spotify: string;
    };
    followers: {
      href: string;
      total: number;
    };
    href: string;
    id: string;
    type: string;
    uri: string;
    display_name: string;
  };
  public: boolean;
  snapshot_id: string;
  tracks: {
    href: string;
    limit: number;
    next: string;
    offset: number;
    previous: string;
    total: number;
    items: {
      added_at: string;
      added_by: {
        external_urls: {
          spotify: string;
        };
        followers: {
          href: string;
          total: number;
        };
        href: string;
        id: string;
        type: string;
        uri: string;
      };
      is_local: boolean;
      track: Track;
    }[];
  };
  type: string;
  uri: string;
}

interface UserProfile{
  images: Image[];
}

interface displayUIProps{
  displayUI: "Table" | "Grid";
}


const itemsPerPage = 10; 


const PlaylistPage = () => {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [playlist, setPlaylist] = useState<PlaylistProps | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  console.log("playlists",playlist)
  const [token, setToken] = useState<string>("");
  const [player, setPlayer] = useState<any>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const [hoveredArtist, setHoveredArtist] = useState<string | null>(null);
  const router = useRouter();

  const [displayUI, setDisplayUI] = useState<displayUIProps | string>("Table");

  const handleArtistClick = (artistId: string) => {
    router.push(`/artists/${artistId}`);
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedItems = useMemo(() => {
      return playlist?.tracks?.items?.slice(startIndex, endIndex) || [];
  }, [playlist?.tracks?.items, startIndex, endIndex]);

  const totalPages = Math.ceil((playlist?.tracks?.items?.length || 0) / itemsPerPage);

  const handlePageChange = (page: number) => {
      setCurrentPage(page);
  };

  const handlePagePrevious = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      e.preventDefault();
      if (currentPage > 1) {
          handlePageChange(currentPage - 1);
      }
  };

  const handlePageNext = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      e.preventDefault();
      if (currentPage < totalPages) {
          handlePageChange(currentPage + 1);
      }
  };

  const initializePlayer = useCallback(() => {
    const newPlayer = new window.Spotify.Player({
      name: 'Web Playback SDK',
      getOAuthToken: (cb: (token: string) => void) => {
        cb(token);
      },
      volume: 0.5,
    });

    newPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Player is ready with device ID:', device_id);
      setPlayer(newPlayer);
    });

    newPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.error(`The Spotify player is not ready. Device ID: ${device_id}`);
    });

    newPlayer.connect().then(success => {
      if (success) {
        console.log('The Spotify player has connected.');
      } else {
        console.error('Failed to connect the Spotify player.');
      }
    });
  }, [token]);

  const playPreview = (url: string) => {
    if (audio) {
      audio.pause();
    }
    const newAudio = new Audio(url);
    setAudio(newAudio);
    newAudio.play();
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
      initializePlayer();
    }
  }, [initializePlayer]);

  const fetchPlaylistDetails = useCallback(async (playlistId: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data && data.tracks && Array.isArray(data.tracks.items)) {
        const validTracks = data.tracks.items.filter((track: { track: { name: any; duration_ms: any; }; }) => track.track && track.track.name && track.track.duration_ms);

        setPlaylist({
          ...data,
          tracks: {
            ...data.tracks,
            items: validTracks,
          },
        });

        if (data.owner?.id) {
          fetchUserProfile(data.owner.id);
        }
      } else {
        console.warn("Invalid playlist data:", data);
      }

    } catch (error) {
      console.error("Error fetching playlist details:", error);
    }
  }, [token]);


  useEffect(() => {
    if (token && id) {
      fetchPlaylistDetails(id);
    }
  }, [token, id, fetchPlaylistDetails]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  }, [token]);
  const formatDuration = (durationMs: number | undefined) => {
    if (durationMs === undefined) return "00:00";
  
    const minutes = Math.floor(durationMs / 60000); 
    const seconds = Math.floor((durationMs % 60000) / 1000); 
  
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  
  return (
    <div className="flex h-screen">
      {token && (
        <>
          <Sidebar 
                isOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(prev => !prev)} 
            />
            <div 
                className={`flex-1 text-white transition-all ml-16 duration-300 ${sidebarOpen ? 'lg:ml-64 ml-16' : 'lg:ml-16'}`}
            >
            <div className='p-4 space-y-4'>
              <Header />
              {playlist ? 
              <>
              <div className='cover flex items-center p-4 space-x-4'>
                {playlist?.images?.[0]?.url && (
                  <Image
                    src={playlist.images[0].url}
                    width={150}
                    height={150}
                    alt={playlist?.name || 'Playlist cover image'}
                    priority
                  />
                )}
                <div className='flex flex-col space-y-3'>
                <div className='text-5xl' >{playlist?.name}</div>
                <div className='text-lg'>{playlist?.description}</div>
                  
                  <div className='flex space-x-3 items-center'>
                    <div className='text-sm'>
                      <Avatar>
                        <AvatarImage src={user?.images[0].url} />
                        <AvatarFallback>{playlist?.owner?.display_name}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className='text-sm hover:underline cursor-pointer' onClick={()=> router.push(`/artists/${playlist.owner.id}`) }>{playlist?.owner?.display_name}</div>
                  </div>
                </div>
              </div>
              


              <div className="flex justify-end space-x-3 items-center">
                <FaTable size={30} onClick={() => setDisplayUI("Table")} className={`${displayUI === "Table" ? 'text-white' : 'text-[#707070]'}`}/>
                <LuLayoutGrid size={30} onClick={() => setDisplayUI("Grid")} className={`${displayUI === "Grid" ? 'text-white' : 'text-[#707070]'}`}/>

              </div>
              {displayUI === 'Table' && (
  <div className="overflow-x-auto">
    <Table>
      <TableCaption>A list of tracks in the playlist.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-center">#</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell">Album</TableHead>
          <TableHead className="hidden md:table-cell text-right">
            <GiDuration className="float-right" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedItems.map((item, index) => (
          <TableRow
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="relative group"
          >
            <TableCell className="relative text-center">
              {hoveredIndex === index ? (
                <div
                  onClick={() => playPreview(item.track.preview_url)}
                  className="flex items-center justify-center border rounded-full w-8 h-8 bg-play mx-auto"
                >
                  <Image
                    src={"/play-button.png"}
                    width={16}
                    height={16}
                    alt="Play"
                    className="hover:opacity-"
                  />
                </div>
              ) : (
                <div>{startIndex + index + 1}</div>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-3">
                {item?.track?.album.images?.[0]?.url && (
                  <Image
                    src={item?.track.album.images?.[0]?.url}
                    width={50}
                    height={50}
                    alt={item.track.name || 'Track cover image'}
                    className="rounded"
                  />
                )}
                <div>
                  <div className="font-medium">{item?.track?.name}</div>
                  <div className="text-sm text-secondary-background">
                    {item.track?.artists.map((artist: any) => (
                      <span
                        key={artist.id}
                        onClick={() => handleArtistClick(artist.id)}
                        onMouseEnter={() => setHoveredArtist(artist.id)}
                        onMouseLeave={() => setHoveredArtist(null)}
                        className={`cursor-pointer ${
                          hoveredArtist === artist.id ? 'underline' : ''
                        } ${artist.id ? 'hover:underline' : ''}`}
                      >
                        {artist.name}
                        {item.track?.artists.length > 1 &&
                        artist !== item.track.artists[item.track.artists.length - 1]
                          ? ', '
                          : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">{item.track?.album?.name}</TableCell>
            <TableCell className="hidden md:table-cell text-right">
              {formatDuration(item.track?.duration_ms)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)}

              
            {displayUI === 'Grid' && (
  <>
    <div className="flex flex-wrap gap-8">
      {paginatedItems.map((data, index) => (
        <Card key={index} className="group w-36 cursor-pointer text-white relative">
          <CardHeader>
            <Avatar className="w-36 h-36 relative p-1">
              <AvatarImage
                src={data.track.album.images[0].url}
                className="rounded-xl"
              />
              <AvatarFallback>{data.track.name}</AvatarFallback>

              {/* Play Button Overlay */}
              <div
                onClick={() => playPreview(data.track.preview_url)}
                className="absolute bottom-2 right-2 flex items-center justify-center border rounded-full w-8 h-8 bg-play opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Image
                  src="/play-button.png"
                  width={16}
                  height={16}
                  alt="Play"
                />
              </div>
            </Avatar>
          </CardHeader>
          <CardTitle>{data.track.name}</CardTitle>
          <CardContent className="text-sm flex space-x-3">
            {data.track.album.artists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => router.push(`/artists/${artist.id}`)}
                className="cursor-pointer hover:underline"
              >
                {artist.name}
              </div>
            ))}
          </CardContent>
          <CardFooter className="text-sm space-x-3">
            <div
              className="hover:underline"
              onClick={() => router.push(`/artists/${data.track.album.id}`)}
            >
              {data.track.album.name}
            </div>
          </CardFooter>
          <CardFooter className="text-sm flex space-x-3">
            {formatDuration(data.track?.duration_ms)}
          </CardFooter>
        </Card>
      ))}
    </div>
  </>
)}


<Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={handlePagePrevious}
                            className={currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : ''}
                        />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, pageIndex) => (
                        <PaginationItem key={pageIndex}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handlePageChange(pageIndex + 1);
                                }}
                                className={currentPage === pageIndex + 1 ? 'bg-blue-500 text-white' : ''}
                            >
                                {pageIndex + 1}
                            </PaginationLink>
                        </PaginationItem>
                    ))}
                    {totalPages > 1 && (
                        <PaginationItem>
                            <PaginationEllipsis />
                        </PaginationItem>
                    )}
                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={handlePageNext}
                            className={currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : ''}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>

              </>
              : 
              <div className="flex flex-col space-y-3">
    <Skeleton className="h-[125px] w-[250px] rounded-xl" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
    <Skeleton className="h-[125px] w-full rounded-xl" />

    <Skeleton className="h-[125px] w-full rounded-xl" />

    <Skeleton className="h-[125px] w-full rounded-xl" />

  </div>
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PlaylistPage;
