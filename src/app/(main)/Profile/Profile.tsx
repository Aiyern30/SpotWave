"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { User } from "@/lib/types";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { Card, CardContent, Skeleton } from "@/components/ui";
import { Users, Mail, Crown, Music, Heart } from "lucide-react";

const ProfileComponent = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [playlistsCount, setPlaylistsCount] = useState<number>(0);
  const [followingArtistsCount, setFollowingArtistsCount] = useState<number>(0);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

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
    }
  }, [token]);

  const fetchMyPlaylists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    const playlistsData = await fetchSpotifyPlaylists(token);
    if (playlistsData) {
      setPlaylistsCount(playlistsData.length);
    }
  }, [token]);

  const fetchFollowingArtists = useCallback(async () => {
    if (!token) {
      console.error("Token not available");
      return;
    }

    const artistsData = await fetchFollowedArtists(token);
    setFollowingArtistsCount(artistsData.length);
  }, [token]);

  useEffect(() => {
    if (token) {
      Promise.all([
        fetchMyProfile(),
        fetchMyPlaylists(),
        fetchFollowingArtists(),
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [token, fetchMyProfile, fetchMyPlaylists, fetchFollowingArtists]);

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
        <Skeleton className="w-48 h-48 rounded-full" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-lg p-8">
        <div className="flex-shrink-0">
          <div className="relative">
            <Image
              src={
                uploadedImage ||
                myProfile?.images[0]?.url ||
                "/default-artist.png"
              }
              width={200}
              height={200}
              alt={myProfile?.display_name || "User name"}
              priority
              className="rounded-full object-cover shadow-2xl border-4 border-green-500/20"
            />
            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
              <Crown className="h-6 w-6 text-black" />
            </div>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-zinc-400 uppercase tracking-wide">
              Profile
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              {myProfile?.display_name || "Your Display Name"}
            </h1>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-300">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>
                {myProfile?.followers.total.toLocaleString()} followers
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4" />
              <span>{playlistsCount} playlists</span>
            </div>
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>{followingArtistsCount} following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Email</p>
                <p className="text-white font-medium">
                  {myProfile?.email || "Not available"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Subscription</p>
                <p className="text-white font-medium capitalize">
                  {myProfile?.product || "Free"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Country</p>
                <p className="text-white font-medium">
                  {myProfile?.country || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileComponent;
