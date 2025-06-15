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
  isConnecting: boolean;
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const playerRef = useRef<any>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationAttempted = useRef(false);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!token || initializationAttempted.current) return;

    const initializePlayer = () => {
      if (window.Spotify && !initializationAttempted.current) {
        initializationAttempted.current = true;
        setIsConnecting(true);

        console.log("Initializing Spotify Player...");

        const spotifyPlayer = new window.Spotify.Player({
          name: "SpotWave Player",
          getOAuthToken: (cb: (token: string) => void) => {
            cb(token);
          },
          volume: 0.5,
        });

        // Ready
        spotifyPlayer.addListener(
          "ready",
          ({ device_id }: { device_id: string }) => {
            console.log("Spotify Player Ready with Device ID:", device_id);
            setDeviceId(device_id);
            setIsReady(true);
            setIsConnecting(false);
          }
        );

        // Not Ready
        spotifyPlayer.addListener(
          "not_ready",
          ({ device_id }: { device_id: string }) => {
            console.log("Device ID has gone offline:", device_id);
            setIsReady(false);
            setDeviceId(null);
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
            console.error("Spotify Player initialization error:", message);
            setIsConnecting(false);
            setIsReady(false);
          }
        );

        spotifyPlayer.addListener(
          "authentication_error",
          ({ message }: { message: string }) => {
            console.error("Spotify Player authentication error:", message);
            setIsConnecting(false);
            setIsReady(false);
          }
        );

        spotifyPlayer.addListener(
          "account_error",
          ({ message }: { message: string }) => {
            console.error("Spotify Player account error:", message);
            setIsConnecting(false);
            setIsReady(false);
          }
        );

        spotifyPlayer.addListener(
          "playback_error",
          ({ message }: { message: string }) => {
            console.error("Spotify Player playback error:", message);
          }
        );

        // Connect to the player
        spotifyPlayer.connect().then((success: boolean) => {
          if (success) {
            console.log("Successfully connected to Spotify Player!");
          } else {
            console.error("Failed to connect to Spotify Player");
            setIsConnecting(false);
            setIsReady(false);
          }
        });

        setPlayer(spotifyPlayer);
        playerRef.current = spotifyPlayer;
      }
    };

    // Wait for Spotify SDK to be ready
    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }

    // Cleanup function
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (
        playerRef.current &&
        typeof playerRef.current.disconnect === "function"
      ) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  // Position tracking
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const interval = setInterval(() => {
      if (player && typeof player.getCurrentState === "function") {
        player
          .getCurrentState()
          .then((state: any) => {
            if (state) {
              setPosition(state.position);
            }
          })
          .catch((error: any) => {
            console.error("Error getting current state:", error);
          });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isPaused, player]);

  // Helper function to wait for device to be ready
  const waitForDevice = useCallback(
    async (maxWaitTime = 10000): Promise<boolean> => {
      if (isReady && deviceId) {
        return true;
      }

      return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (isReady && deviceId) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (Date.now() - startTime > maxWaitTime) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 100);
      });
    },
    [isReady, deviceId]
  );

  const playTrack = useCallback(
    async (track: Track) => {
      console.log("Attempting to play track:", track.name);

      if (!token) {
        console.error("No Spotify token available");
        return;
      }

      // Wait for device to be ready
      const deviceReady = await waitForDevice();
      if (!deviceReady || !deviceId) {
        console.error(
          "Spotify device not ready. Please wait for the player to connect."
        );
        return;
      }

      try {
        console.log("Playing track on device:", deviceId);
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

          // If device is not found, try to transfer playback
          if (response.status === 404) {
            console.log("Device not found, attempting to transfer playback...");
            await transferPlayback();
            // Retry playing the track
            setTimeout(() => playTrack(track), 1000);
          }
        } else {
          console.log("Track started successfully");
        }
      } catch (error) {
        console.error("Error playing track:", error);
      }
    },
    [deviceId, token, waitForDevice]
  );

  const playPlaylist = useCallback(
    async (playlistUri: string, trackUri?: string) => {
      console.log("Attempting to play playlist:", playlistUri);

      if (!token) {
        console.error("No Spotify token available");
        return;
      }

      // Wait for device to be ready
      const deviceReady = await waitForDevice();
      if (!deviceReady || !deviceId) {
        console.error(
          "Spotify device not ready. Please wait for the player to connect."
        );
        return;
      }

      try {
        console.log("Playing playlist on device:", deviceId);
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

          // If device is not found, try to transfer playback
          if (response.status === 404) {
            console.log("Device not found, attempting to transfer playback...");
            await transferPlayback();
            // Retry playing the playlist
            setTimeout(() => playPlaylist(playlistUri, trackUri), 1000);
          }
        } else {
          console.log("Playlist started successfully");
        }
      } catch (error) {
        console.error("Error playing playlist:", error);
      }
    },
    [deviceId, token, waitForDevice]
  );

  // Helper function to transfer playback to our device
  const transferPlayback = useCallback(async () => {
    if (!deviceId || !token) return;

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log("Playback transferred to SpotWave Player");
      } else {
        console.error("Failed to transfer playback:", response.status);
      }
    } catch (error) {
      console.error("Error transferring playback:", error);
    }
  }, [deviceId, token]);

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
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolumeState(clampedVolume);

      // Debounce volume changes to prevent too many API calls
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }

      volumeTimeoutRef.current = setTimeout(() => {
        if (player && typeof player.setVolume === "function" && isReady) {
          player.setVolume(clampedVolume).catch((error: any) => {
            console.error("Error setting volume:", error);
            // If setting volume fails, revert to previous volume
            setVolumeState((prevVolume) => prevVolume);
          });
        }
      }, 100); // 100ms debounce
    },
    [player, isReady]
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
    isConnecting,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
};
