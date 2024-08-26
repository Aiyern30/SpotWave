"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage, Skeleton, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';

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

const PlaylistPage = () => {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [playlist, setPlaylist] = useState<PlaylistProps | null>(null);
  const [token, setToken] = useState<string>("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
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
      setPlaylist(data);
    } catch (error) {
      console.error("Error fetching playlist details:", error);
    }
  }, [token]);

  useEffect(() => {
    if (token && id) {
      fetchPlaylistDetails(id);
    }
  }, [token, id, fetchPlaylistDetails]);

  return (
    <div className="flex h-screen">
      {token && (
        <>
          <Sidebar isOpen={sidebarOpen} onClose={() => { setSidebarOpen(prev => !prev); }} />
          <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-0'}`}>
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
                  <div className='text-5xl'>{playlist?.name}</div>
                  <div className='text-lg'>{playlist?.description}</div>
                  <div className='flex space-x-3'>
                    <div className='text-sm'>
                      <Avatar>
                        <AvatarImage src={playlist?.owner.external_urls.spotify} />
                        <AvatarFallback>{playlist?.owner.display_name}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className='text-sm'>{playlist?.owner.display_name}</div>
                  </div>
                </div>
              </div>
              <Table>
                <TableCaption>A list of tracks in the playlist.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Album</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playlist?.tracks?.items?.map((item, index) => (
                    <TableRow
                      key={item.track.id}
                      onMouseEnter={() => handleMouseEnter(index)}
                      onMouseLeave={handleMouseLeave}
                      className="relative group"
                    >
                      <TableCell className="relative text-center">
                        {hoveredIndex === index ? (
                            <button
                              onClick={() => playPreview(item.track.preview_url)}
                              className="bg-blue-500 text-white p-1 rounded-md hover:bg-blue-600"
                            >
                              Preview
                            </button>
                            
                        ) : <div>{index + 1}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {item.track.album.images?.[0]?.url && (
                            <Image
                              src={item.track.album.images[1].url}
                              width={50}
                              height={50}
                              alt={item.track.name || 'Track cover image'}
                              className="rounded"
                            />
                          )}
                          <div>
                            <div className="font-medium">{item.track.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.track.artists.map(artist => artist.name).join(', ')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.track.album.name}</TableCell>
                      <TableCell className="text-right">
                        {new Date(item.track.duration_ms).toISOString().substr(14, 5)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           
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
