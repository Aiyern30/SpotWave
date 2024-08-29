"use client";

import Sidebar from "@/app/Sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const ArtistProfilePage = () => {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [artistProfile, setArtistProfile] = useState<any>(null);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Extract the ID from the URL path
    const segments = pathname.split('/');
    const id = segments[segments.length - 1];

    // Extract the name from the search params
    const name = searchParams.get('name');

    // Fetch artist profile when the component mounts
    useEffect(() => {
        if (id) {
            const fetchProfile = async () => {
                const profile = await fetchArtistProfile(id);
                setArtistProfile(profile);
            };

            fetchProfile();
        }
    }, [id]);

    const fetchArtistProfile = async (id: string) => {
        const token = localStorage.getItem('Token');
        if (!token) return null;

        try {
            const response = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                console.error('Failed to fetch artist profile:', response.statusText);
                return null;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching artist profile:', error);
            return null;
        }
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
                <div className="p-4 space-y-4">
                    {/* Display the artist profile if available */}
                    {artistProfile ? (
                        <div className="flex flex-col items-center space-y-4">
                            <h1 className="text-4xl font-bold">{artistProfile.name}</h1>
                            

<Avatar>
          <AvatarImage src={artistProfile.images[0]?.url || '/default-artist.jpg'}                                  className="w-48 h-48 rounded-full object-cover"
          />
          <AvatarFallback>{artistProfile.name}</AvatarFallback>
        </Avatar>
                            <p className="text-lg">Followers: {artistProfile.followers.total}</p>
                            <p className="text-lg">Genres: {artistProfile.genres.join(', ')}</p>
                        </div>
                    ) : (
                        <p>Loading artist profile...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArtistProfilePage;
