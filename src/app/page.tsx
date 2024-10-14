"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

// Import Lottie dynamically only on the client-side
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

import Spotify from "@/Spotify.json";
import PeopleGuitar from "@/PeopleGuitar.json";
import TypingAnimation from "@/components/magicui/Typing-animation";

interface SpotifyPlayerEvent {
  device_id: string;
}

export default function Home() {
  const CLIENT_ID = "5bf8d69f8aaf4727a4677c0ad2fef6ec";
  // const REDIRECT_URI =
  //   process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000";
  const REDIRECT_URI = "http://localhost:3000";

  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";

  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
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

        player.addListener("ready", ({ device_id }: SpotifyPlayerEvent) => {
          console.log("Ready with Device ID", device_id);
          // You can start playback here if you want
        });

        player.addListener("not_ready", ({ device_id }: SpotifyPlayerEvent) => {
          console.log("Device ID has gone offline", device_id);
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
      setLoading(true);
      validateToken(token).then((isValid) => {
        if (isValid) {
          setToken(token);
          router.push("/Home");
        } else {
          window.localStorage.removeItem("Token");
          setToken("");
        }
        setLoading(false);
      });
    }
  }, [router, validateToken]);

  // Handle the login process
  const handleLogin = () => {
    const scopes = [
      "user-read-private",
      "user-read-email",
      "streaming",
      "user-top-read",
      "user-follow-read",
      "playlist-read-private",
      "user-library-read",
      "user-library-modify",
      "user-read-recently-played",
      "playlist-modify-public",
      "playlist-modify-private",
      "app-remote-control",
    ].join(" ");

    window.location.href = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&response_type=${RESPONSE_TYPE}&scope=${encodeURIComponent(scopes)}`;
  };

  return (
    <div className="flex justify-center items-center h-screen">
      {!token ? (
        <>
          <Card className="bg-white min-w-sm max-w-md w-full text-center hover:bg-white p-5 relative">
            <CardHeader>
              <CardTitle className="text-3xl">SpotWave</CardTitle>
              <CardDescription>
                Log in to access your Spotify account
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {/* <Button onClick={handleLogin}>Login to Spotify</Button> */}
              <Lottie
                onClick={handleLogin}
                animationData={Spotify}
                className="w-24 h-24 cursor-pointer mx-auto hover:bg-black hover:rounded-full"
              />
            </CardContent>
            <Lottie
              animationData={PeopleGuitar}
              className="w-24 h-24 absolute -top-20 right-0"
            />
          </Card>
        </>
      ) : (
        <>
          <div className="flex flex-col justify-center items-center text-white">
            <Lottie animationData={Spotify} className="w-96 h-96" />
            <TypingAnimation
              className="text-4xl font-bold"
              text="Redirecting..."
            />
          </div>
        </>
      )}
    </div>
  );
}
