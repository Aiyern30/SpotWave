"use client";
import React, { useEffect, useState } from "react";

const Page = () => {
  const [token, setToken] = useState<string | null>(null); // Replace this with your actual token retrieval logic
  const [volume, setVolume] = useState<number>(50);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [currentlyPlayingUrl, setCurrentlyPlayingUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("Token");
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);
  // Sample Spotify URI for testing
  const spotifyUri = "https://open.spotify.com/track/0WbMK4wrZ1wFSty9F7FCgu";

  const playAudio = async () => {
    try {
      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [spotifyUri] }),
      });
      setCurrentlyPlayingUrl(spotifyUri);
    } catch (error) {
      console.error("Error starting playback:", error);
    }
  };

  const pauseAudio = async () => {
    try {
      await fetch("https://api.spotify.com/v1/me/player/pause", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCurrentlyPlayingUrl(null);
    } catch (error) {
      console.error("Error pausing playback:", error);
    }
  };

  const skipToNext = async () => {
    try {
      await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Error skipping to next track:", error);
    }
  };

  const setPlaybackVolume = async (volumePercent: number) => {
    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  };

  const toggleShuffle = async () => {
    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${!isShuffle}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setIsShuffle(!isShuffle);
    } catch (error) {
      console.error("Error toggling shuffle:", error);
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(event.target.value);
    setVolume(newVolume);
    setPlaybackVolume(newVolume);
  };

  return (
    <div>
      <h1>Spotify Playback Testing</h1>
      <button onClick={playAudio}>Play</button>
      <button onClick={pauseAudio}>Pause</button>
      <button onClick={skipToNext}>Skip to Next</button>
      <button onClick={toggleShuffle}>
        Toggle Shuffle ({isShuffle ? "On" : "Off"})
      </button>
      <div>
        <label htmlFor="volume">Volume: {volume}%</label>
        <input
          id="volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={handleVolumeChange}
        />
      </div>
      {currentlyPlayingUrl ? (
        <p>Currently playing: {currentlyPlayingUrl}</p>
      ) : (
        <p>No track playing</p>
      )}
    </div>
  );
};

export default Page;
