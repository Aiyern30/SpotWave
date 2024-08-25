"use client";

import React, { useEffect, useState, useCallback } from 'react';
import ErrorPage from '@/app/Error';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

type PlaylistsProps = {
    id: string,
    image: string,
    title: string,
    description: string,
};

const Page = () => {
    const [token, setToken] = useState<string>("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [playlists, setPlaylists] = useState<PlaylistsProps[]>([]);
    const router = useRouter();

    const handleClick = (id: string) => {
        router.push(`/Home/${id}`);
    };

    useEffect(() => {
        const storedToken = localStorage.getItem("Token");
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    const fetchSpotifyPlaylists = useCallback(async () => {
        try {
            const response = await fetch("https://api.spotify.com/v1/me/playlists", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            const formattedPlaylists = data.items.map((playlist: any) => ({
                id: playlist.id,
                image: playlist.images[0]?.url || '',
                title: playlist.name,
                description: playlist.description,
            }));
            setPlaylists(formattedPlaylists);
        } catch (error) {
            console.error("Error fetching playlists:", error);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchSpotifyPlaylists();
        }
    }, [token, fetchSpotifyPlaylists]);

    const handleSidebarToggle = () => {
        setSidebarOpen(prev => !prev);
    };

    return (
        <div className="flex h-screen">
            {token && (
                <>
                    <Sidebar isOpen={sidebarOpen} onClose={handleSidebarToggle} />
                    <div
                        className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-0'}`}
                    >
                        <div className='p-4 space-y-4'>
                            <Header />
                            <div className="flex flex-wrap gap-8">
                                {playlists.map((data) => (
                                    <div
                                        key={data.id}
                                        className='group w-36 cursor-pointer'
                                        onClick={() => handleClick(data.id)}
                                    >
                                        <div className=''>
                                            <Avatar className='w-36 h-36 relative'>
                                                <AvatarImage src={data.image} />
                                                <AvatarFallback>CN</AvatarFallback>
                                                <Button className='absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                                                    {'>'}
                                                </Button>
                                            </Avatar>
                                            <div>{data.title}</div>
                                            <div>{data.description}</div>
                                        </div>
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
