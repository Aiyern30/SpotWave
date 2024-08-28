"use client"

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Sidebar from '@/app/Sidebar';
import Header from '@/components/Header';
import { Avatar, AvatarFallback, AvatarImage, Card, CardFooter, CardHeader, CardTitle } from '@/components/ui';
import { useRouter } from 'next/navigation';

interface Image {
    ['#text']: string;
    size: string;
}

interface GlobalArtistProps {
    name: string;
    playcount: string;
    listeners: string;
    mbid: string;
    url: string;
    image: Image[];
}

interface ArtistsResponse {
    artists: {
        artist: GlobalArtistProps[];
    };
}

const Page = () => {
    const [artists, setArtists] = useState<GlobalArtistProps[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const router = useRouter();

    const LASTFM_API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
    
    const fetchSpotifyImages = useCallback(async (artists: GlobalArtistProps[]) => {
        const updatedArtists = await Promise.all(artists.map(async (artist) => {
            const imageUrl = await searchArtistOnSpotify(artist.name);
            return {
                ...artist,
                image: imageUrl ? [{ '#text': imageUrl, size: 'large' }] : artist.image,
            };
        }));
        return updatedArtists;
    }, []);

    const fetchTopArtists = useCallback(async (apiKey: string) => {
        setLoading(true);
        try {
            const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${apiKey}&format=json`);
            const data: ArtistsResponse = await response.json();
    
            if (response.ok) {
                const sortedArtists = data.artists.artist.sort((a, b) => {
                    return parseInt(b.playcount) - parseInt(a.playcount);
                });
    
                const artistsWithImages = await fetchSpotifyImages(sortedArtists);
                setArtists(artistsWithImages);
            } else {
                console.error('Failed to fetch top artists from Last.fm:', data);
            }
        } catch (error) {
            console.error('Error fetching top artists:', error);
        }
        setLoading(false);
    }, [fetchSpotifyImages]);

    const searchArtistOnSpotify = async (artistName: string): Promise<string | null> => {
        const token = localStorage.getItem('Token');

        if (!token) {
            console.error('Spotify API token not found');
            return null;
        }

        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.artists && data.artists.items.length > 0) {
                return data.artists.items[0].images[0]?.url || null;
            }
        } catch (error) {
            console.error(`Error fetching artist image from Spotify for ${artistName}:`, error);
        }
        return null;
    };

    useEffect(() => {
        if (LASTFM_API_KEY === undefined) {
            return;
        }
        fetchTopArtists(LASTFM_API_KEY);
    }, [LASTFM_API_KEY, fetchTopArtists]);

    // Memoize the artists data to avoid unnecessary re-renders
    const memoizedArtists = useMemo(() => artists, [artists]);

    const handleClick = (id: string, name: string) => {
        router.push(`/Artists/${id}?name=${encodeURIComponent(name)}`);
    };

    return (
        <div className="flex h-screen">
            <Sidebar 
                isOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(prev => !prev)} 
            />
            <div 
                className={`flex-1 transition-all ml-16 duration-300 ${sidebarOpen ? 'lg:ml-64 ml-16' : 'lg:ml-16'}`}
            >
                <div className='p-4 space-y-4'>
                    <Header />
                    <div className="flex flex-wrap gap-8">
                        {memoizedArtists.map((artist, index) => {
                            const imageUrl = artist.image[0]['#text'];

                            return (
                                <Card key={artist.mbid || index} className='group w-36 cursor-pointer text-white' onClick={() => handleClick(artist.mbid, artist.name)}>
                                    <CardHeader>
                                        <Avatar className='w-36 h-36 relative p-1'>
                                            <AvatarImage 
                                                src={imageUrl} 
                                                alt={artist.name} 
                                            />
                                            <AvatarFallback>{artist.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <CardTitle>{artist.name}</CardTitle>
                                    </CardHeader>
                                    <CardFooter className='text-sm'>
                                        {artist.playcount}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Page;
