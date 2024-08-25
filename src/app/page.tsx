"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // for navigation
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export default function Home() {
  const CLIENT_ID = "5bf8d69f8aaf4727a4677c0ad2fef6ec"; // Your Spotify App Client ID
  const REDIRECT_URI = "http://localhost:3000"; // Redirect URI set in your Spotify Developer Dashboard
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";

  const [token, setToken] = useState<string>(""); // Store Spotify access token
  const router = useRouter(); // Router for navigation

  // Function to check if the token is valid
  const validateToken = async (token: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token is expired or invalid
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  };

  // Check for token in URL after redirect from Spotify
  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("Token") || ""; // Provide a default value if null

    if (!token && hash) {
      const tokenFragment = hash
        .substring(1)
        .split("&")
        .find((elem) => elem.startsWith("access_token"));

      if (tokenFragment) {
        token = tokenFragment.split("=")[1];
        setToken(token); // Save token in state
        window.localStorage.setItem("Token", token); // Store token in localStorage
        window.location.hash = ""; // Clear the hash from the URL

        // Navigate to /Homepage after successful login
        router.push("/Home");
      }
    } else if (token) {
      // Validate the token before proceeding
      validateToken(token).then((isValid) => {
        if (isValid) {
          setToken(token); // If token is valid, set it in state
          router.push("/Home"); // Navigate to /Homepage
        } else {
          // If token is invalid or expired, remove it and stay on the login page
          window.localStorage.removeItem("Token");
          setToken(""); // Clear the token in state
        }
      });
    }
  }, [router]);

  // Handle the login process
  const handleLogin = () => {
    window.location.href = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}`;
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
