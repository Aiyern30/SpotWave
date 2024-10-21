import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { User } from "@/lib/types";

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

  // Fetch user profile
  const fetchMyProfile = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch profile:", response.statusText);
        return;
      }

      const data = await response.json();
      setMyProfile(data);
      console.log("Profile data fetched:", data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [token]);

  // Fetch user's playlists
  const fetchMyPlaylists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch playlists:", response.statusText);
        return;
      }

      const data = await response.json();
      setPlaylistsCount(data.total); // Get the total number of playlists
      console.log("Playlists fetched:", data);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  }, [token]);

  // Fetch user's followed artists
  const fetchFollowingArtists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/following?type=artist",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch followed artists:", response.statusText);
        return;
      }

      const data = await response.json();
      setFollowingArtistsCount(data.artists.total); // Get the total number of followed artists
      console.log("Following artists fetched:", data);
    } catch (error) {
      console.error("Error fetching followed artists:", error);
    }
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
      {/* Profile Image Section */}
      <div className="flex justify-center md:justify-start">
        <Image
          src={uploadedImage || myProfile?.images[0].url || "/placeholder.jpg"}
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
