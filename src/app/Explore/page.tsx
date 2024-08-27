"use client";

import React, { useEffect, useMemo, useState } from 'react';
import ErrorPage from '@/app/Error';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
import { useRouter } from 'next/navigation';

type ArtistProps = {
    id: string;
    image: string;
    name: string;
    genres: string[];
};

interface Image {
    url: string;
    height: number;
    width: number;
  }
  
  interface RecentTracksProps{
    played_at: string;
    track:{
      album:{
        album_type: string;
        artists:{
          name: string;
          id: string;
          type: string;
        }
        name: string;
        release_date: string;
        images: Image[];
      }
      duration_ms: string;
  
    }
  }

const Page = () => {
    const [token, setToken] = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [followedArtists, setFollowedArtists] = useState<ArtistProps[]>([]);
    const [favoriteArtists, setFavoriteArtists] = useState<ArtistProps[]>([]);
    const [recentTracks, setRecentTracks] = useState<RecentTracksProps[]>([]);
    console.log("recentTracks",recentTracks)

    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem("Token");
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    useEffect(() => {
        const fetchFollowedArtists = async () => {
            if (token) {
                try {
                    const response = await fetch("https://api.spotify.com/v1/me/following?type=artist", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const data = await response.json();

                    if (response.ok) {
                        const artistData = data.artists.items.map((artist: any) => ({
                            id: artist.id,
                            image: artist.images[0]?.url || "",
                            name: artist.name,
                            genres: artist.genres,
                        }));
                        setFollowedArtists(artistData);
                    } else {
                        console.error("Error fetching followed artists:", data);
                    }
                } catch (error) {
                    console.error("Error fetching followed artists:", error);
                }
            }
        };

        const fetchFavoriteArtists = async () => {
            if (token) {
                try {
                    const response = await fetch("https://api.spotify.com/v1/me/top/artists", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const data = await response.json();

                    if (response.ok) {
                        const artistData = data.items.map((artist: any) => ({
                            id: artist.id,
                            image: artist.images[0]?.url || "",
                            name: artist.name,
                            genres: artist.genres,
                        }));
                        setFavoriteArtists(artistData);
                    } else {
                        console.error("Error fetching favorite artists:", data);
                    }
                } catch (error) {
                    console.error("Error fetching favorite artists:", error);
                }
            }
        };
        const fetchRecentlyPlayed = async () => {
            if (token) {
                try {
                    const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const data = await response.json();

                    if (response.ok) {
                        setRecentTracks(data.items);
                    } else {
                        console.error("Error fetching recently played tracks:", data);
                    }
                } catch (error) {
                    console.error("Error fetching recently played tracks:", error);
                }
            }
        };

        fetchFollowedArtists();
        fetchFavoriteArtists();
        fetchRecentlyPlayed();

    }, [token]);

    const memoizedFollowedArtists = useMemo(() => followedArtists, [followedArtists]);
    const memoizedFavoriteArtists = useMemo(() => favoriteArtists, [favoriteArtists]);
    const memoizedRecentTracks = useMemo(() => recentTracks, [recentTracks]);

    if (!token) {
        return <ErrorPage errorMessage="No token found. Please log in to view your artists." />;
    }

    return (
        <div className="flex h-screen">
            {token && (
                <>
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(prev => !prev)} />
                    <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-0'}`}>
                        <div className='p-4 space-y-4'>
                            <Header />
                            <h2 className="text-2xl font-bold">Your Followed Artists</h2>
                            
                            <div className="flex flex-wrap gap-8">
                                {memoizedFollowedArtists.map((artist) => (
                                    <div key={artist.id} className='group w-36 cursor-pointer'>
                                        <Avatar className='w-36 h-36 relative'>
                                            <AvatarImage src={artist.image} />
                                            <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className='font-bold'>{artist.name}</div>
                                        <div className='text-sm'>{artist.genres.join(", ")}</div>
                                    </div>
                                ))}
                            </div>

                            <h2 className="text-2xl font-bold">Your Favorite Artists</h2>
                            
                            <div className="flex flex-wrap gap-8">
                                {memoizedFavoriteArtists.map((artist) => (
                                    <div key={artist.id} className='group w-36 cursor-pointer'>
                                        <Avatar className='w-36 h-36 relative'>
                                            <AvatarImage src={artist.image} />
                                            <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className='font-bold'>{artist.name}</div>
                                        <div className='text-sm'>{artist.genres.join(", ")}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Page;
