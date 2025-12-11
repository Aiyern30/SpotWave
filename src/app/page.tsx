/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Music, Play, Headphones, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/";

// Import Lottie dynamically only on the client-side
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function Home() {
  const CLIENT_ID = "5bf8d69f8aaf4727a4677c0ad2fef6ec";
  const REDIRECT_URI: string =
    process.env.NEXT_PUBLIC_REDIRECT_URI || "http://127.0.0.1:3000/callback";

  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";

  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const router = useRouter();

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

  const initializePlayer = useCallback(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (window.Spotify) {
        const player = new window.Spotify.Player({
          name: "SpotWave Player",
          getOAuthToken: (cb: (token: string) => void) => {
            cb(token);
          },
        });

        player.addListener("ready", ({ device_id }: { device_id: string }) => {
          console.log("Ready with Device ID", device_id);
        });

        player.addListener(
          "not_ready",
          ({ device_id }: { device_id: string }) => {
            console.log("Device ID has gone offline", device_id);
          }
        );

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
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.onload = () => initializePlayer();
        document.body.appendChild(script);
      }
    };

    loadSpotifySdk();
  }, [initializePlayer]);

  // Check for token in URL after redirect from Spotify
  useEffect(() => {
    const hash = window.location.hash;
    let storedToken = window.localStorage.getItem("Token") || "";

    // Only handle the case when the URL has a hash (redirect from Spotify)
    if (!storedToken && hash) {
      const tokenFragment = hash
        .substring(1)
        .split("&")
        .find((elem) => elem.startsWith("access_token"));

      if (tokenFragment) {
        storedToken = tokenFragment.split("=")[1];
        window.localStorage.setItem("Token", storedToken);
        window.location.hash = "";
        setToken(storedToken);
        router.push("/Home");
      }
    } else if (storedToken) {
      setLoading(true);
      validateToken(storedToken).then((isValid) => {
        if (isValid) {
          setToken(storedToken);
          router.push("/Home");
        } else {
          window.localStorage.removeItem("Token");
          setToken("");
          router.push("/401"); // Ensure we go to /401 if the token is invalid
        }
        setLoading(false);
      });
    }
  }, [router, validateToken]);

  // Handle the login process
  const handleLogin = () => {
    setIsRedirecting(true);

    // Delay the actual redirect to show the animation
    setTimeout(() => {
      const scopes = [
        "ugc-image-upload",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
        "app-remote-control",
        "streaming",
        "playlist-read-private",
        "playlist-read-collaborative",
        "playlist-modify-private",
        "playlist-modify-public",
        "user-follow-modify",
        "user-follow-read",
        "user-read-playback-position",
        "user-top-read",
        "user-read-recently-played",
        "user-library-modify",
        "user-library-read",
        "user-read-email",
        "user-read-private",
      ].join(" ");

      window.location.href = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}&response_type=${RESPONSE_TYPE}&scope=${encodeURIComponent(scopes)}`;
    }, 2500); // Show animation for 2.5 seconds before redirecting
  };

  if (token || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-green-900 flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-green-500/10"
                style={{
                  width: `${Math.random() * 300 + 50}px`,
                  height: `${Math.random() * 300 + 50}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `float ${
                    Math.random() * 10 + 15
                  }s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                  opacity: Math.random() * 0.5,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-white text-center max-w-md">
          {/* Logo animation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-green-500/40 rounded-full animate-pulse" />
            <div className="relative bg-green-500 rounded-full p-5 shadow-lg shadow-green-500/30">
              <Music className="h-10 w-10 text-black animate-wiggle" />
            </div>
          </div>

          {/* Sound wave animation */}
          <div className="flex items-center justify-center gap-1 h-12 mb-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-green-500 rounded-full"
                style={{
                  height: `${Math.sin(i / 2) * 20 + 30}%`,
                  animation: `soundWave 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          <h2 className="text-4xl font-bold mb-4 animate-fadeIn">
            Connecting to Spotify
          </h2>

          <div className="w-full bg-black/30 h-2 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-green-500 animate-progress rounded-full" />
          </div>

          <p className="text-green-400 animate-pulse text-lg">
            Preparing your music experience...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-green-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-green-500/10"
              style={{
                width: `${Math.random() * 300 + 50}px`,
                height: `${Math.random() * 300 + 50}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float ${Math.random() * 10 + 15}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
                opacity: Math.random() * 0.3,
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 opacity-10 animate-float">
          <Music className="h-32 w-32 text-white" />
        </div>
        <div className="absolute top-2/3 right-1/4 opacity-10 animate-float2">
          <Headphones className="h-24 w-24 text-white" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 opacity-10 animate-float3">
          <Volume2 className="h-20 w-20 text-white" />
        </div>
      </div>

      <div className="max-w-md w-full backdrop-blur-sm bg-black/30 rounded-xl p-8 shadow-2xl border border-green-500/20 relative z-10 animate-fadeIn">
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-500 rounded-full p-4 shadow-lg shadow-green-500/30 animate-bounce-slow">
          <Music className="h-8 w-8 text-black animate-wiggle" />
        </div>

        <div className="text-center mt-6 mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 animate-slideDown">
            SpotWave
          </h1>
          <p className="text-green-400 animate-slideUp">
            Your music, amplified.
          </p>
        </div>

        <div className="space-y-6">
          <div
            className="bg-black/40 rounded-lg p-4 text-white/80 animate-fadeIn"
            style={{ animationDelay: "0.3s" }}
          >
            <p>
              Connect with Spotify to access your playlists, discover new music,
              and enjoy a seamless listening experience.
            </p>
          </div>

          <Button
            onClick={handleLogin}
            className="w-full py-6 bg-green-500 hover:bg-green-600 text-black font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 group animate-pulse-slow"
          >
            <Play className="h-5 w-5 group-hover:animate-ping" />
            <span>Connect with Spotify</span>
          </Button>

          <div
            className="text-center text-xs text-white/60 animate-fadeIn"
            style={{ animationDelay: "0.6s" }}
          >
            By connecting, you agree to Spotify's Terms of Service and Privacy
            Policy
          </div>
        </div>
      </div>

      <div
        className="mt-8 text-white/80 text-sm animate-fadeIn"
        style={{ animationDelay: "0.9s" }}
      >
        © {new Date().getFullYear()} SpotWave. All rights reserved.
      </div>
    </div>
  );
}
