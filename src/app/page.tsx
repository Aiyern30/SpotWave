"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

// Define a type for the player events
interface SpotifyPlayerEvent {
  device_id: string;
}

export default function Home() {
  const CLIENT_ID = "5bf8d69f8aaf4727a4677c0ad2fef6ec";
  const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000";
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";

  const [token, setToken] = useState<string>("");
  const router = useRouter();

  // Function to check if the token is valid
  const validateToken = useCallback(async (token: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.status !== 401;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }, []);

  // Function to initialize the Spotify player
  const initializePlayer = useCallback(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (window.Spotify) {
        const player = new window.Spotify.Player({
          name: 'SpotWave Player',
          getOAuthToken: (cb: (token: string) => void) => { cb(token); }
        });

        player.addListener('ready', ({ device_id }: SpotifyPlayerEvent) => {
          console.log('Ready with Device ID', device_id);
          // You can start playback here if you want
        });

        player.addListener('not_ready', ({ device_id }: SpotifyPlayerEvent) => {
          console.log('Device ID has gone offline', device_id);
        });

        player.connect();
      }
    };
  }, [token]);

  // Load Spotify SDK
  useEffect(() => {
    const loadSpotifySdk = () => {
      if (window.Spotify) {
        initializePlayer();
      } else {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.onload = () => initializePlayer();
        document.body.appendChild(script);
      }
    };

    loadSpotifySdk();
  }, [initializePlayer]);

  // Check for token in URL after redirect from Spotify
  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("Token") || "";

    if (!token && hash) {
      const tokenFragment = hash
        .substring(1)
        .split("&")
        .find((elem) => elem.startsWith("access_token"));

      if (tokenFragment) {
        token = tokenFragment.split("=")[1];
        setToken(token);
        window.localStorage.setItem("Token", token);
        window.location.hash = "";
        router.push("/Home");
      }
    } else if (token) {
      validateToken(token).then((isValid) => {
        if (isValid) {
          setToken(token);
          router.push("/Home");
        } else {
          window.localStorage.removeItem("Token");
          setToken("");
        }
      });
    }
  }, [router, validateToken]);

  // Handle the login process
  const handleLogin = () => {
    window.location.href = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${RESPONSE_TYPE}&scope=user-read-private user-read-email streaming`;
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Card>
        <CardHeader>
          <CardTitle>Login to SpotWave</CardTitle>
          <CardDescription>Log in to access your Spotify account</CardDescription>
        </CardHeader>
        <CardContent>
          {!token && (
            <Button onClick={handleLogin}>
              Login to Spotify
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
