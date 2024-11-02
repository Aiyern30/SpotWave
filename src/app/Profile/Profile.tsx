// Profile.tsx
import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { User, PlaylistProps } from "@/lib/types"; // Ensure PlaylistProps is imported
import { fetchUserProfile } from "@/utils/fetchProfile";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist"; // Import the new fetch function

const ProfileComponent = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [playlistsCount, setPlaylistsCount] = useState<number>(0);
  const [followingArtistsCount, setFollowingArtistsCount] = useState<number>(0);
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      } else {
        console.error("No token found. Please authenticate.");
      }
    }
  }, []);

  const fetchMyProfile = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    const profileData = await fetchUserProfile(token);
    if (profileData) {
      setMyProfile(profileData);
      console.log("Profile data fetched:", profileData);
    }
  }, [token]);

  // Fetch user's playlists using the utility function
  const fetchMyPlaylists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    const playlistsData = await fetchSpotifyPlaylists(token);
    if (playlistsData) {
      setPlaylistsCount(playlistsData.length); // Set the total number of playlists
      console.log("Playlists fetched:", playlistsData);
    }
  }, [token]);

  const fetchFollowingArtists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    const artistsData = await fetchFollowedArtists(token);
    setFollowingArtistsCount(artistsData.length);
    console.log("Following artists fetched:", artistsData);
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMyProfile();
      fetchMyPlaylists();
      fetchFollowingArtists();
    }
  }, [token, fetchMyProfile, fetchMyPlaylists, fetchFollowingArtists]);

  return (
    <div className="profile-container flex flex-col md:flex-row p-6 space-y-6 md:space-y-0 md:space-x-8 w-full text-white bg-gray-900 rounded-lg shadow-lg">
      <div className="flex justify-center md:justify-start">
        <Image
          src={
            uploadedImage || myProfile?.images[0]?.url || "/default-artist.png"
          }
          width={150}
          height={150}
          alt={myProfile?.display_name || "User name"}
          priority
          className="rounded-full object-cover shadow-lg"
        />
      </div>

      <div className="flex flex-col space-y-4 flex-grow items-center md:items-start">
        <h1 className="text-7xl font-bold text-center md:text-left">
          {myProfile?.display_name || "Your Display Name"}
        </h1>

        <div className="grid grid-cols-2 gap-1">
          <div className="info-item flex items-center space-x-2">
            <span className="font-semibold">Followers:</span>
            <span>{myProfile?.followers.total}</span>
          </div>
          <div className="info-item flex items-center space-x-2">
            <span className="font-semibold">Email:</span>
            <span>{myProfile?.email}</span>
          </div>
          <div className="info-item flex items-center space-x-2">
            <span className="font-semibold">Subscription:</span>
            <span>{myProfile?.product.toUpperCase()}</span>
          </div>

          <div className="info-item flex items-center space-x-2">
            <span className="font-semibold">Total Playlists:</span>
            <span>{playlistsCount}</span>
          </div>
          <div className="info-item flex items-center space-x-2">
            <span className="font-semibold">Following Artists:</span>
            <span>{followingArtistsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileComponent;
