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
import type { Track } from "@/lib/types";

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

  // Repeat mode: 'off' | 'context' | 'track'
  repeatMode: "off" | "context" | "track";
  toggleRepeat: () => void;

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

// Global flag to prevent re-initialization across ALL component instances
let globalPlayerInstance: any = null;
let globalDeviceId: string | null = null;
let isGloballyInitialized = false;

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
  const [repeatMode, setRepeatMode] = useState<"off" | "context" | "track">(
    "off"
  );
  const trackEndHandlerRef = useRef<boolean>(false);
  const playerRef = useRef<any>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const deviceIdRef = useRef<string | null>(null);

  // Sync refs with state
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  // Initialize silent audio for metadata hijacking (iOS/Mobile workaround)
  useEffect(() => {
    if (typeof Audio !== "undefined") {
      // Short silent WAV
      silentAudioRef.current = new Audio(
        "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA=="
      );
      silentAudioRef.current.loop = true;
      silentAudioRef.current.volume = 0.01; // Non-zero volume to force OS "Now Playing" recognition
      (silentAudioRef.current as any).playsInline = true; // Essential for iOS
      silentAudioRef.current.muted = false;

      // Allow audio to play in background
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
      }
    }
  }, []);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    const storedToken = localStorage.getItem("Token");
    if (storedToken) {
      setToken(storedToken);
      // Optional: Start loading SDK script early if not present?
      // Next.js handles script loading via layout, so we just set token availability.
    }
  }, []);

  // Use a separate effect to trigger initialization as soon as token is set,
  // ensuring we don't wait on other unrelated state.
  useEffect(() => {
    if (!token) return;

    const attachPlayerListeners = (inst: any) => {
      // Ready
      inst.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("Spotify Player Ready with Device ID:", device_id);
        globalDeviceId = device_id;
        setDeviceId(device_id);
        setIsReady(true);
        setIsConnecting(false);
      });

      // Not Ready
      inst.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("Device ID has gone offline:", device_id);
        setIsReady(false);
        setDeviceId(null);
      });

      // Player state changed
      inst.addListener("player_state_changed", (state: any) => {
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
          id: track.id || "",
          name: track.name,
          artists: track.artists.map((artist: any) => ({
            name: artist.name,
            id: artist.uri?.split(":")[2] || "",
          })),
          album: {
            name: track.album.name,
            images: track.album.images || [],
            id: track.album.uri?.split(":")[2] || "",
            artists: track.artists.map((artist: any) => ({
              name: artist.name,
              id: artist.uri?.split(":")[2] || "",
            })),
            release_date: "",
            total_tracks: 0,
          },
          duration_ms: state.duration,
          explicit: false,
          external_urls: {
            spotify: `https://open.spotify.com/track/${track.id}`,
          },
          popularity: 0,
          preview_url: null,
          track_number: 0,
          disc_number: 0,
          uri: track.uri,
        });

        setIsPlaying(!isCurrentlyPaused);
        setIsPaused(isCurrentlyPaused);
        setPosition(state.position);
        setDuration(state.duration);

        // Handle track end for repeat one
        const trackEnded =
          state.position === 0 && isCurrentlyPaused && state.duration > 0;
        if (trackEnded && !trackEndHandlerRef.current) {
          trackEndHandlerRef.current = true;
          setTimeout(() => {
            trackEndHandlerRef.current = false;
          }, 1000);
        }
      });

      // Errors
      inst.addListener(
        "initialization_error",
        ({ message }: { message: string }) => {
          console.error("Spotify Player initialization error:", message);
          setIsConnecting(false);
          setIsReady(false);
        }
      );
      inst.addListener(
        "authentication_error",
        ({ message }: { message: string }) => {
          console.error("Spotify Player authentication error:", message);
          setIsConnecting(false);
          setIsReady(false);
        }
      );
      inst.addListener("account_error", ({ message }: { message: string }) => {
        console.error("Spotify Player account error:", message);
        setIsConnecting(false);
        setIsReady(false);
      });
      inst.addListener("playback_error", ({ message }: { message: string }) => {
        console.error("Spotify Player playback error:", message);
      });
    };

    // Case 1: Player already exists globally
    if (globalPlayerInstance) {
      console.log("Attaching listeners to existing global player instance");
      setPlayer(globalPlayerInstance);
      playerRef.current = globalPlayerInstance;
      attachPlayerListeners(globalPlayerInstance);

      if (globalDeviceId) {
        console.log("Global device ID found immediately:", globalDeviceId);
        setDeviceId(globalDeviceId);
        setIsReady(true);
        setIsConnecting(false);
      } else {
        // Retry connection if we have an instance but no device ID
        console.log("Global player exists but no device ID, reconnecting...");
        globalPlayerInstance.connect();
      }
      return;
    }

    // Case 2: active initialization
    const initializePlayer = () => {
      // Logic to prevent double init
      if (isGloballyInitialized || globalPlayerInstance) return;
      isGloballyInitialized = true;

      if (window.Spotify) {
        setIsConnecting(true);
        console.log("Initializing Spotify Player (New Instance)...");

        const spotifyPlayer = new window.Spotify.Player({
          name: "SpotWave Player",
          getOAuthToken: (cb: (t: string) => void) => {
            cb(token);
          },
          volume: 0.5,
        });

        attachPlayerListeners(spotifyPlayer);

        const connectPlayer = async () => {
          console.log("Connecting to Spotify Player...");
          const success = await spotifyPlayer.connect();
          if (success) {
            console.log("Successfully connected to Spotify Player!");
          } else {
            console.error(
              "Failed to connect to Spotify Player, retrying in 500ms..."
            );
            setTimeout(connectPlayer, 500);
          }
        };

        connectPlayer();
        };

        connectPlayer();

        globalPlayerInstance = spotifyPlayer;
        setPlayer(spotifyPlayer);
        playerRef.current = spotifyPlayer;
      }
    };

    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }
  }, [token]);

  // Add cleanup only on window unload (when user closes tab)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        playerRef.current &&
        typeof playerRef.current.disconnect === "function"
      ) {
        console.log("Disconnecting player on window unload");
        playerRef.current.disconnect();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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

  // Helper function to wait for device to be ready with retry
  const waitForDevice = useCallback(
    async (maxWaitTime = 15000): Promise<boolean> => {
      // Immediate check
      if (isReadyRef.current && deviceIdRef.current) return true;
      if (globalDeviceId) {
        setDeviceId(globalDeviceId);
        setIsReady(true);
        return true;
      }

      console.log("Waiting for player device to be ready...");

      return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          // Check state via refs to avoid closure staleness
          if (isReadyRef.current && deviceIdRef.current) {
            console.log("Device became ready via state (ref check)!");
            clearInterval(checkInterval);
            resolve(true);
          }
          // Check global fallback
          else if (globalDeviceId) {
            console.log("Device became ready via global ref!");
            setDeviceId(globalDeviceId);
            setIsReady(true);
            clearInterval(checkInterval);
            resolve(true);
          }
          // Timeout
          else if (Date.now() - startTime > maxWaitTime) {
            console.warn("Wait for device timed out");
            clearInterval(checkInterval);
            resolve(false);
          }
          // KICK: Aggressive reconnect if taking too long (> 3s)
          else if (Date.now() - startTime > 3000 && !isConnecting) {
            console.warn(
              "Device taking long to ready, kicking connect() again..."
            );
            if (playerRef.current) {
              playerRef.current.connect();
            }
          }
        }, 500);
      });
    },
    []
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

  const playTrack = useCallback(
    async (track: Track) => {
      console.log("Attempting to play track:", track.name);

      // Get fresh token from localStorage if context token is not available
      const currentToken = token || localStorage.getItem("Token");

      if (!currentToken) {
        console.error("No Spotify token available");
        return;
      }

      // Wait for device to be ready
      const deviceReady = await waitForDevice();
      if (!deviceReady || !deviceIdRef.current) {
        console.error(
          "Spotify device not ready. Please wait for the player to connect."
        );
        return;
      }

      // 1s delay as suggested for robustness ("Initialization Delay")
      // Only delay if we just became ready? Hard to track. A small delay always is safer for mobile.
      await new Promise((r) => setTimeout(r, 500));

      const activeDeviceId = deviceIdRef.current;

      try {
        console.log("Playing track on device:", activeDeviceId);
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${activeDeviceId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              uris: [track.uri],
            }),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
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
          // Try to play silent audio to grab media session focus
          silentAudioRef.current
            ?.play()
            .catch((e) => console.error("Silent audio play failed:", e));
        }
      } catch (error) {
        console.error("Error playing track:", error);
      }
    },
    [deviceId, token, waitForDevice, transferPlayback]
  );

  const playPlaylist = useCallback(
    async (playlistUri: string, trackUri?: string) => {
      console.log("Attempting to play playlist:", playlistUri);

      // Get fresh token from localStorage if context token is not available
      const currentToken = token || localStorage.getItem("Token");

      if (!currentToken) {
        console.error("No Spotify token available");
        return;
      }

      // Wait for device to be ready
      const deviceReady = await waitForDevice();
      if (!deviceReady || !deviceIdRef.current) {
        console.error(
          "Spotify device not ready. Please wait for the player to connect."
        );
        return;
      }

      // 1s delay as suggested for robustness
      await new Promise((r) => setTimeout(r, 500));

      const activeDeviceId = deviceIdRef.current;

      try {
        console.log("Playing playlist on device:", activeDeviceId);
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
              Authorization: `Bearer ${currentToken}`,
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
    [deviceId, token, waitForDevice, transferPlayback]
  );

  const pauseTrack = useCallback(() => {
    if (player && typeof player.pause === "function") {
      player.pause().catch((error: any) => {
        console.error("Error pausing track:", error);
      });
      // Pause silent audio to release focus or sync state
      silentAudioRef.current?.pause();
    }
  }, [player]);

  const resumeTrack = useCallback(() => {
    if (player && typeof player.resume === "function") {
      player.resume().catch((error: any) => {
        console.error("Error resuming track:", error);
      });
      // Play silent audio to grab focus
      silentAudioRef.current
        ?.play()
        .catch((e) => console.error("Silent audio play failed:", e));
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

  // Set repeat mode on Spotify player
  const setSpotifyRepeatMode = useCallback(
    async (mode: "off" | "context" | "track") => {
      if (!deviceId || !token) return;

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/repeat?state=${mode}&device_id=${deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          console.log(`Repeat mode set to: ${mode}`);
        } else {
          console.error("Failed to set repeat mode:", response.status);
        }
      } catch (error) {
        console.error("Error setting repeat mode:", error);
      }
    },
    [deviceId, token]
  );

  // Handle repeat one functionality
  useEffect(() => {
    if (repeatMode === "track" && position > 0 && duration > 0) {
      // Check if track is about to end (within 1 second)
      const timeRemaining = duration - position;

      if (timeRemaining <= 1000 && timeRemaining > 0) {
        const timeout = setTimeout(() => {
          // Seek back to the beginning
          if (player && typeof player.seek === "function") {
            player
              .seek(0)
              .then(() => {
                console.log("Repeating track from beginning");
              })
              .catch((error: any) => {
                console.error("Error seeking to beginning:", error);
              });
          }
        }, timeRemaining);

        return () => clearTimeout(timeout);
      }
    }
  }, [position, duration, repeatMode, player]);

  const toggleRepeat = useCallback(() => {
    const modes: ("off" | "context" | "track")[] = ["off", "context", "track"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);

    // For 'track' mode, set Spotify to 'off' since we handle it manually
    // For 'context' mode, set Spotify to 'context'
    // For 'off' mode, set Spotify to 'off'
    const spotifyMode = nextMode === "track" ? "off" : nextMode;
    setSpotifyRepeatMode(spotifyMode);
  }, [repeatMode, setSpotifyRepeatMode]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  // Media Session API Integration
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (currentTrack) {
      // Delay metadata update to overwrite Spotify SDK's default "Spotify Embedded Player"
      // which usually fires immediately on track change.
      const timer = setTimeout(() => {
        if (!currentTrack) return;

        // Update metadata
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.name,
          artist: currentTrack.artists.map((a) => a.name).join(", "),
          album: currentTrack.album.name,
          artwork: currentTrack.album.images.map((image: any) => ({
            src: image.url,
            sizes: `${image.width || 512}x${image.height || 512}`,
            type: "image/jpeg",
          })),
        });
      }, 500); // 500ms Delay

      // Set action handlers
      navigator.mediaSession.setActionHandler("play", () => {
        resumeTrack();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        pauseTrack();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        previousTrack();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        nextTrack();
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime && details.fastSeek === undefined) {
          seekTo(details.seekTime * 1000); // Spotify SDK uses ms
        }
      });

      return () => clearTimeout(timer);
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [currentTrack, resumeTrack, pauseTrack, previousTrack, nextTrack, seekTo]);

  // Update Media Session playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

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
    repeatMode,
    toggleRepeat,
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
