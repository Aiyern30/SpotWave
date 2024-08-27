"use client";

import React, { useEffect, useMemo, useState } from 'react';
import ErrorPage from '@/app/Error';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui';
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

interface RecentTracksProps {
    played_at: string;
    track: {
        album: {
            album_type: string;
            artists: {
                name: string;
                id: string;
                type: string;
            }
            release_date: string;
            images: Image[];
        }
        name: string;
        duration_ms: string;
    }
}

const Page = () => {
    const [token, setToken] = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [followedArtists, setFollowedArtists] = useState<ArtistProps[]>([]);
    const [favoriteArtists, setFavoriteArtists] = useState<ArtistProps[]>([]);
    console.log('favoriteArtists',favoriteArtists)
    const [recentTracks, setRecentTracks] = useState<RecentTracksProps[]>([]);

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
                            <Accordion type="multiple" className="w-full" defaultValue={["item-1", "item-2", "item-3"]}>
                                <AccordionItem value="item-1">
                                    <AccordionTrigger onClick={(e)=>e.preventDefault }><div onClick={()=>router.push("/Home")}> Your Followed Artists</div></AccordionTrigger>
                                    <AccordionContent className='text-white'>
                                        <div className="flex flex-wrap gap-8">
                                            {memoizedFollowedArtists.map((artist) => (
                                                <Card key={artist.id} className='group w-36 cursor-pointer'>
                                                    <CardHeader>
                                                        <Avatar className='w-36 h-36 relative p-1'>
                                                            <AvatarImage src={artist.image} className='rounded-xl' />
                                                            <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                    </CardHeader>
                                                    <CardTitle>{artist.name}</CardTitle>
                                                    <CardContent>
                                                    {artist.genres.join(", ")}
                                                    </CardContent>
                                                    
                                                </Card>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>Your Favorite Artists</AccordionTrigger>
                                    <AccordionContent className='text-white'>
                                        <div className="flex flex-wrap gap-8">
                                            {memoizedFavoriteArtists.map((artist) => (
                                                <Card key={artist.id} className='group w-36 cursor-pointer'>
                                                    <CardHeader>
                                                        <Avatar className='w-36 h-36 relative p-1'>
                                                            <AvatarImage src={artist.image} className='rounded-xl' />
                                                            <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                    </CardHeader>
                                                    <CardTitle>{artist.name}</CardTitle>
                                                    <CardContent>
                                                    {artist.genres.join(", ")}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger>Your Recently Listening</AccordionTrigger>
                                    <AccordionContent className='text-white'>
                                        <div className="flex flex-wrap gap-8">
                                            {memoizedRecentTracks.map((tracks, index) => (
                                                <Card key={`${tracks.track.album.artists.id}-${index}`} className='group w-36 cursor-pointer'>
                                                    <CardHeader>
                                                        <Avatar className='w-36 h-36 relative p-1'>
                                                            <AvatarImage src={tracks.track.album.images[0].url} className='rounded-xl' />
                                                            <AvatarFallback>{tracks.track.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                    </CardHeader>
                                                    <CardTitle>{tracks.track.name}</CardTitle>
                                                    <CardContent>
                                                        {tracks.track.name}
                                                    </CardContent>
                                                    <CardFooter>
                                                        {tracks.track.album.release_date}
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Page;
