"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

interface Track {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  uri: string;
  preview_url?: string | null;
}

interface PlayerContextType {
  // Current track state
  currentTrack: Track | null;
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
  duration: number;
  volume: number;

  // Player controls
  playTrack: (track: Track) => void;
  playPlaylist: (playlistUri: string, trackUri?: string) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (position: number) => void;
  setVolume: (volume: number) => void;

  // Queue management
  queue: Track[];
  addToQueue: (track: Track) => void;
  clearQueue: () => void;

  // Player state
  deviceId: string | null;
  isReady: boolean;
  player: any;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.5);
  const [queue, setQueue] = useState<Track[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const playerRef = useRef<any>(null);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    const initializePlayer = () => {
      if (window.Spotify) {
        const spotifyPlayer = new window.Spotify.Player({
          name: "SpotWave Player",
          getOAuthToken: (cb: (token: string) => void) => {
            cb(token);
          },
          volume: volume,
        });

        // Ready
        spotifyPlayer.addListener(
          "ready",
          ({ device_id }: { device_id: string }) => {
            console.log("Ready with Device ID", device_id);
            setDeviceId(device_id);
            setIsReady(true);
          }
        );

        // Not Ready
        spotifyPlayer.addListener(
          "not_ready",
          ({ device_id }: { device_id: string }) => {
            console.log("Device ID has gone offline", device_id);
            setIsReady(false);
          }
        );

        // Player state changed
        spotifyPlayer.addListener("player_state_changed", (state: any) => {
          if (!state) {
            setCurrentTrack(null);
            setIsPlaying(false);
            setIsPaused(true);
            setPosition(0);
            setDuration(0);
            return;
          }

          const track = state.track_window.current_track;
          const isCurrentlyPaused = state.paused;

          setCurrentTrack({
            id: track.id,
            name: track.name,
            artists: track.artists,
            album: track.album,
            duration_ms: state.duration,
            uri: track.uri,
          });

          setIsPlaying(!isCurrentlyPaused);
          setIsPaused(isCurrentlyPaused);
          setPosition(state.position);
          setDuration(state.duration);
        });

        // Error handling
        spotifyPlayer.addListener(
          "initialization_error",
          ({ message }: { message: string }) => {
            console.error("Failed to initialize:", message);
          }
        );

        spotifyPlayer.addListener(
          "authentication_error",
          ({ message }: { message: string }) => {
            console.error("Failed to authenticate:", message);
          }
        );

        spotifyPlayer.addListener(
          "account_error",
          ({ message }: { message: string }) => {
            console.error("Failed to validate Spotify account:", message);
          }
        );

        spotifyPlayer.addListener(
          "playback_error",
          ({ message }: { message: string }) => {
            console.error("Failed to perform playback:", message);
          }
        );

        // Connect to the player
        spotifyPlayer.connect().then((success: boolean) => {
          if (success) {
            console.log("Successfully connected to Spotify!");
          } else {
            console.error("Failed to connect to Spotify");
          }
        });

        setPlayer(spotifyPlayer);
        playerRef.current = spotifyPlayer;
      }
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }

    // Cleanup function
    return () => {
      if (
        playerRef.current &&
        typeof playerRef.current.disconnect === "function"
      ) {
        playerRef.current.disconnect();
      }
    };
  }, [token, volume]);

  // Position tracking
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const interval = setInterval(() => {
      if (player && typeof player.getCurrentState === "function") {
        player.getCurrentState().then((state: any) => {
          if (state) {
            setPosition(state.position);
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, player]);

  const playTrack = useCallback(
    async (track: Track) => {
      if (!deviceId || !token) {
        console.error("Device not ready or token missing");
        return;
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              uris: [track.uri],
            }),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to play track:", response.status, errorText);
        }
      } catch (error) {
        console.error("Error playing track:", error);
      }
    },
    [deviceId, token]
  );

  const playPlaylist = useCallback(
    async (playlistUri: string, trackUri?: string) => {
      if (!deviceId || !token) {
        console.error("Device not ready or token missing");
        return;
      }

      try {
        const body: any = {
          context_uri: playlistUri,
        };

        // If a specific track is provided, start from that track
        if (trackUri) {
          body.offset = { uri: trackUri };
        }

        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: "PUT",
            body: JSON.stringify(body),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to play playlist:", response.status, errorText);
        }
      } catch (error) {
        console.error("Error playing playlist:", error);
      }
    },
    [deviceId, token]
  );

  const pauseTrack = useCallback(() => {
    if (player && typeof player.pause === "function") {
      player.pause().catch((error: any) => {
        console.error("Error pausing track:", error);
      });
    }
  }, [player]);

  const resumeTrack = useCallback(() => {
    if (player && typeof player.resume === "function") {
      player.resume().catch((error: any) => {
        console.error("Error resuming track:", error);
      });
    }
  }, [player]);

  const nextTrack = useCallback(() => {
    if (player && typeof player.nextTrack === "function") {
      player.nextTrack().catch((error: any) => {
        console.error("Error skipping to next track:", error);
      });
    }
  }, [player]);

  const previousTrack = useCallback(() => {
    if (player && typeof player.previousTrack === "function") {
      player.previousTrack().catch((error: any) => {
        console.error("Error skipping to previous track:", error);
      });
    }
  }, [player]);

  const seekTo = useCallback(
    (positionMs: number) => {
      if (player && typeof player.seek === "function") {
        player.seek(positionMs).catch((error: any) => {
          console.error("Error seeking:", error);
        });
      }
    },
    [player]
  );

  const setVolume = useCallback(
    (newVolume: number) => {
      setVolumeState(newVolume);
      if (player && typeof player.setVolume === "function") {
        player.setVolume(newVolume).catch((error: any) => {
          console.error("Error setting volume:", error);
        });
      }
    },
    [player]
  );

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const value: PlayerContextType = {
    currentTrack,
    isPlaying,
    isPaused,
    position,
    duration,
    volume,
    playTrack,
    playPlaylist,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    queue,
    addToQueue,
    clearQueue,
    deviceId,
    isReady,
    player,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
};
