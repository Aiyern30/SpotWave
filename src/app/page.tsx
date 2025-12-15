/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Music, Play, Headphones, Volume2 } from "lucide-react";

// PKCE Helper Functions
function generateRandomString(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(input))))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export default function Home() {
  const CLIENT_ID = "5bf8d69f8aaf4727a4677c0ad2fef6ec";
  const REDIRECT_URI: string =
    process.env.NEXT_PUBLIC_REDIRECT_URI || "http://127.0.0.1:3000/callback";

  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

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

  // Exchange code for token
  const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    try {
      const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (data.access_token) {
        window.localStorage.setItem("Token", data.access_token);
        if (data.refresh_token) {
          window.localStorage.setItem("RefreshToken", data.refresh_token);
        }
        setToken(data.access_token);
        setLoading(false);
        
        // Clean up URL before redirecting
        window.history.replaceState({}, document.title, "/");
        
        // Navigate to Home
        router.push("/Home");
      } else {
        console.error("Failed to get access token:", data);
        setLoading(false);
        // Don't redirect, show error state instead
      }
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      setLoading(false);
    }
  };

  // Check for existing token or handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const storedToken = window.localStorage.getItem("Token") || "";

    // Handle OAuth error
    if (error) {
      console.error("Spotify OAuth error:", error);
      window.history.replaceState({}, document.title, "/");
      setLoading(false);
      return;
    }

    // Handle OAuth callback with code
    if (code) {
      const codeVerifier = window.localStorage.getItem("code_verifier");
      if (codeVerifier) {
        setLoading(true);
        exchangeCodeForToken(code, codeVerifier);
        window.localStorage.removeItem("code_verifier");
      } else {
        console.error("No code verifier found");
        window.history.replaceState({}, document.title, "/");
        setLoading(false);
      }
      return;
    }

    // Check existing token
    if (storedToken) {
      setLoading(true);
      validateToken(storedToken).then((isValid) => {
        if (isValid) {
          setToken(storedToken);
          router.push("/Home");
        } else {
          window.localStorage.removeItem("Token");
          window.localStorage.removeItem("RefreshToken");
          setToken("");
          setLoading(false);
        }
      });
    }
  }, [router, validateToken]);

  // Handle the login process with PKCE
  const handleLogin = async () => {
    setIsRedirecting(true);

    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    // Store code verifier for later use
    window.localStorage.setItem("code_verifier", codeVerifier);

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

    const authUrl = new URL(AUTH_ENDPOINT);
    authUrl.searchParams.append("client_id", CLIENT_ID);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.append("scope", scopes);
    authUrl.searchParams.append("code_challenge_method", "S256");
    authUrl.searchParams.append("code_challenge", codeChallenge);

    // Redirect immediately without delay
    window.location.href = authUrl.toString();
  };

  if (token || isRedirecting || loading) {
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
              <Music className="h-10 w-10 text-black" />
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

          <h2 className="text-4xl font-bold mb-4">Connecting to Spotify</h2>

          <div className="w-full bg-black/30 h-2 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-green-500 animate-pulse rounded-full"
              style={{ width: "70%" }}
            />
          </div>

          <p className="text-green-400 animate-pulse text-lg">
            Preparing your music experience...
          </p>
        </div>

        <style jsx>{`
          @keyframes float {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
          @keyframes soundWave {
            0%,
            100% {
              height: 30%;
            }
            50% {
              height: 80%;
            }
          }
        `}</style>
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
        <div
          className="absolute top-1/4 left-1/4 opacity-10"
          style={{ animation: "float 6s ease-in-out infinite" }}
        >
          <Music className="h-32 w-32 text-white" />
        </div>
        <div
          className="absolute top-2/3 right-1/4 opacity-10"
          style={{
            animation: "float 8s ease-in-out infinite",
            animationDelay: "1s",
          }}
        >
          <Headphones className="h-24 w-24 text-white" />
        </div>
        <div
          className="absolute bottom-1/4 left-1/3 opacity-10"
          style={{
            animation: "float 7s ease-in-out infinite",
            animationDelay: "2s",
          }}
        >
          <Volume2 className="h-20 w-20 text-white" />
        </div>
      </div>

      <div className="max-w-md w-full backdrop-blur-sm bg-black/30 rounded-xl p-8 shadow-2xl border border-green-500/20 relative z-10">
        <div
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-500 rounded-full p-4 shadow-lg shadow-green-500/30"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          <Music className="h-8 w-8 text-black" />
        </div>

        <div className="text-center mt-6 mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">SpotWave</h1>
          <p className="text-green-400">Your music, amplified.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-black/40 rounded-lg p-4 text-white/80">
            <p>
              Connect with Spotify to access your playlists, discover new music,
              and enjoy a seamless listening experience.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-6 bg-green-500 hover:bg-green-600 text-black font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 group rounded-lg"
          >
            <Play className="h-5 w-5" />
            <span>Connect with Spotify</span>
          </button>

          <div className="text-center text-xs text-white/60">
            By connecting, you agree to Spotify's Terms of Service and Privacy
            Policy
          </div>
        </div>
      </div>

      <div className="mt-8 text-white/80 text-sm">
        © {new Date().getFullYear()} SpotWave. All rights reserved.
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
}
