"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { User } from "@/lib/types";
import { fetchUserProfile } from "@/utils/fetchProfile";
import { fetchFollowedArtists } from "@/utils/Artist/fetchFollowedArtists";
import { fetchSpotifyPlaylists } from "@/utils/fetchAllPlaylist";
import { Card, CardContent, Skeleton } from "@/components/ui";
import { Users, Mail, Crown, Music, Heart } from "lucide-react";

const ProfileComponent = ({ userId }: { userId?: string }) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [playlistsCount, setPlaylistsCount] = useState<number>(0);
  const [followingArtistsCount, setFollowingArtistsCount] = useState<number>(0);
  const [savedAlbumsCount, setSavedAlbumsCount] = useState<number>(0);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isMe, setIsMe] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const fetchProfileData = useCallback(async () => {
    if (!token) return;

    try {
      // 1. Fetch the profile details
      const profileData = await fetchUserProfile(token, userId);
      if (profileData) {
        setMyProfile(profileData);

        // Check if this is the logged-in user
        const meResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meResponse.json();
        const currentIsMe = !userId || userId === meData.id;
        setIsMe(currentIsMe);

        // 2. Fetch playlists (Public for others, all for me)
        const playlistsUrl = userId
          ? `https://api.spotify.com/v1/users/${userId}/playlists`
          : "https://api.spotify.com/v1/me/playlists";

        const playlistsRes = await fetch(playlistsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (playlistsRes.ok) {
          const data = await playlistsRes.json();
          setPlaylistsCount(data.total || data.items?.length || 0);
        }

        // 3. Fetch following (Only if it's "Me")
        if (currentIsMe) {
          const artistsData = await fetchFollowedArtists(token);
          setFollowingArtistsCount(artistsData.length);

          // 4. Fetch saved albums count
          const albumsRes = await fetch(
            "https://api.spotify.com/v1/me/albums?limit=1",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (albumsRes.ok) {
            const data = await albumsRes.json();
            setSavedAlbumsCount(data.total || 0);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (token) {
      fetchProfileData();
    }
  }, [token, fetchProfileData]);

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
          <div className="relative w-[200px] h-[200px]">
            <Image
              src={
                uploadedImage ||
                myProfile?.images[0]?.url ||
                "/default-artist.png"
              }
              fill
              alt={myProfile?.display_name || "User name"}
              priority
              className="rounded-full object-cover shadow-2xl border-4 border-brand/20"
            />
            <div className="absolute -bottom-2 -right-2 bg-brand rounded-full p-2">
              <Crown className="h-6 w-6 text-brand-foreground" />
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
            {isMe && (
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>{followingArtistsCount} following</span>
              </div>
            )}
            {isMe && (
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span>{savedAlbumsCount} albums</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Stats Cards */}
      {/* Profile Stats Cards - Only show for "Me" */}
      {isMe && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-brand/20 rounded-full">
                  <Mail className="h-6 w-6 text-brand" />
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
      )}
    </div>
  );
};

export default ProfileComponent;
