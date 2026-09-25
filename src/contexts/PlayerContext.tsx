"use client";

import { getSpotifyToken } from "@/lib/spotify-session";
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

import { transferSpotifySession, type SpotifyDevice } from "@/lib/spotify-devices";

interface PlayerContextType {
  selectDevice: (device: SpotifyDevice) => Promise<void>;
  // Current track state
  currentTrack: Track | null;
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
  positionUpdatedAt: number;
  duration: number;
  volume: number;

  // Player controls
  playTrack: (track: Track, contextUris?: string[]) => void;
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
  setToken: (token: string) => void;

  // Analyser and Analysis for visualizers
  analyser: AnalyserNode | null;
  dataArray: Uint8Array | null;

  // Active Device
  activeDevice: { id: string; name: string; type: string } | null;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Global flag to prevent re-initialization across ALL component instances
let globalPlayerInstance: any = null;
let globalDeviceId: string | null = null;
let isGloballyInitialized = false;

// Global polling state to prevent stacked intervals
let globalPollingInterval: NodeJS.Timeout | null = null;
let globalPollingToken: string | null = null;
let globalPollingInFlight = false;
let lastPlayerStateFetch: { data: any; timestamp: number } | null = null;
const PLAYER_STATE_CACHE_TTL_MS = 500; // Cache for 500ms to deduplicate back-to-back requests

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
  const [position, setPositionState] = useState(0);
  const [positionUpdatedAt, setPositionUpdatedAt] = useState(0);
  const setPosition = useCallback((value: number) => {
    setPositionState(value);
    setPositionUpdatedAt(performance.now());
  }, []);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.5);
  const [queue, setQueue] = useState<Track[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const [repeatMode, setRepeatMode] = useState<"off" | "context" | "track">(
    "off",
  );
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const [activeDevice, setActiveDevice] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const trackEndHandlerRef = useRef<boolean>(false);
  const playerRef = useRef<any>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const deviceTransferRef = useRef(false);
  const deviceIdRef = useRef<string | null>(null);
  const activeDeviceRef = useRef<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const lastOwnDeviceSyncRef = useRef(0);

  // Sync refs with state
  useEffect(() => {
    activeDeviceRef.current = activeDevice;
  }, [activeDevice]);

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
        "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==",
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
        if (deviceTransferRef.current) return;
        if (deviceTransferRef.current || (activeDeviceRef.current && activeDeviceRef.current.id !== deviceIdRef.current)) return;
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
        },
      );
      inst.addListener(
        "authentication_error",
        ({ message }: { message: string }) => {
          console.error("Spotify Player authentication error:", message);
          setIsConnecting(false);
          setIsReady(false);
        },
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
            void getSpotifyToken().then(cb).catch(() => { /* AuthProvider handles expired authorization. */ });
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
              "Failed to connect to Spotify Player, retrying in 500ms...",
            );
            setTimeout(connectPlayer, 500);
          }
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

  // Synthetic Analyser Loop - Bridging the gap when hardware analyser is silent
  useEffect(() => {
    if (typeof window === "undefined") return;

    const intervalId = setInterval(() => {
      if (!isPlaying || isPaused) return;

      const currentAnalyser = analyserRef.current;

      // Even if no analyser exists, we provide data for visualizers
      const fftSize = currentAnalyser ? currentAnalyser.frequencyBinCount : 128;

      if (!dataArrayRef.current || dataArrayRef.current.length !== fftSize) {
        dataArrayRef.current = new Uint8Array(fftSize);
      }

      const dataArr = dataArrayRef.current;
      if (currentAnalyser) {
        currentAnalyser.getByteFrequencyData(dataArr as any);
      }

      // Check if hardware is silent (CORS/DRM issue)
      const sum = dataArr.reduce((a, b) => a + b, 0);
      if (sum === 0) {
        // FALLBACK: Pseudo-random beat generator (CORS bypass fallback)
        const now = Date.now();
        // Simulate a 120 BPM beat (500ms per beat)
        const beatMs = 500;
        const beatPhase = (now % beatMs) / beatMs; // 0.0 to 1.0

        // Exponential decay for a sharp "kick drum" effect
        const pulse = Math.pow(1 - beatPhase, 3) * 150;

        for (let i = 0; i < dataArr.length; i++) {
          if (i < 8) {
            // Bass frequencies
            dataArr[i] = 50 + pulse + Math.random() * 20;
          } else {
            // Mid/Treble frequencies
            const falloff = Math.max(0, 1 - i / dataArr.length);
            dataArr[i] = (20 + pulse * 0.3) * falloff + Math.random() * 40;
          }
        }
      }

      // Notify visualizer components through state update
      // We always create a new array to trigger React state updates
      setDataArray(new Uint8Array(dataArr));
    }, 50);

    return () => clearInterval(intervalId);
  }, [isPlaying, isPaused]);

  // Resume AudioContext on any interaction
  useEffect(() => {
    if (isPlaying && audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, [isPlaying]);

  // Add cleanup only on window unload
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
      if (deviceTransferRef.current || (activeDeviceRef.current && activeDeviceRef.current.id !== deviceIdRef.current)) return;
      if (player && typeof player.getCurrentState === "function") {
        player
          .getCurrentState()
          .then((state: any) => {
            if (state && !deviceTransferRef.current && (!activeDeviceRef.current || activeDeviceRef.current.id === deviceIdRef.current)) {
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

  // Poll Spotify API for active device and global playback state
  // Uses global interval to prevent stacked intervals from multiple component mounts
  useEffect(() => {
    if (!token) return;

    // Only set up polling if this is a new token or no polling is active
    if (globalPollingToken !== token) {
      globalPollingToken = token;

      // Clear any existing interval
      if (globalPollingInterval) {
        clearInterval(globalPollingInterval);
      }

      // Fetch immediately on token change
      syncPlaybackState(true);

      // Set up new global polling interval
      globalPollingInterval = setInterval(() => syncPlaybackState(false), 3000);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncPlaybackState(true);
      }
    };

    const handleWindowFocus = () => {
      syncPlaybackState(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    // Cleanup only when component unmounts or token changes
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      // Don't clear global interval here; let it persist across component mounts
      // This prevents stacked intervals. The interval will be replaced if token changes.
    };
  }, [token, syncPlaybackState]);

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
              "Device taking long to ready, kicking connect() again...",
            );
            if (playerRef.current) {
              playerRef.current.connect();
            }
          }
        }, 500);
      });
    },
    [],
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
    async (track: Track, contextUris?: string[]) => {
      console.log("Attempting to play track:", track.name);

      // Play silent audio immediately to grab Media Session focus (iOS restriction)
      silentAudioRef.current
        ?.play()
        .catch((e) => console.error("Silent audio play failed (early):", e));

      // Get fresh token from localStorage if context token is not available
      const currentToken = token || localStorage.getItem("Token");

      if (!currentToken) {
        console.error("No Spotify token available");
        return;
      }

      // Wait for device to be ready
      const deviceReady = !!activeDeviceRef.current?.id || await waitForDevice();
      if (!deviceReady || !(activeDeviceRef.current?.id || deviceIdRef.current)) {
        console.error(
          "Spotify device not ready. Please wait for the player to connect.",
        );
        return;
      }

      // 1s delay as suggested for robustness ("Initialization Delay")
      // Only delay if we just became ready? Hard to track. A small delay always is safer for mobile.
      await new Promise((r) => setTimeout(r, 500));

      const activeDeviceId = activeDeviceRef.current?.id || deviceIdRef.current;

      try {
        console.log("Playing track on device:", activeDeviceId);
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${activeDeviceId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              uris: contextUris && contextUris.length > 0 ? contextUris : [track.uri],
              ...(contextUris && contextUris.length > 0 ? { offset: { uri: track.uri } } : {})
            }),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to play track:", response.status, errorText);

          // If device is not found, try to transfer playback
          if (response.status === 404 && activeDeviceId === deviceIdRef.current) {
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
    [deviceId, token, waitForDevice, transferPlayback],
  );

  const playPlaylist = useCallback(
    async (playlistUri: string, trackUri?: string) => {
      console.log("Attempting to play playlist:", playlistUri);

      // Play silent audio immediately to grab Media Session focus (iOS restriction)
      silentAudioRef.current
        ?.play()
        .catch((e) => console.error("Silent audio play failed (early):", e));

      // Get fresh token from localStorage if context token is not available
      const currentToken = token || localStorage.getItem("Token");

      if (!currentToken) {
        console.error("No Spotify token available");
        return;
      }

      // Wait for device to be ready
      const deviceReady = !!activeDeviceRef.current?.id || await waitForDevice();
      if (!deviceReady || !(activeDeviceRef.current?.id || deviceIdRef.current)) {
        console.error(
          "Spotify device not ready. Please wait for the player to connect.",
        );
        return;
      }

      // 1s delay as suggested for robustness
      await new Promise((r) => setTimeout(r, 500));

      const activeDeviceId = activeDeviceRef.current?.id || deviceIdRef.current;

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
          `https://api.spotify.com/v1/me/player/play?device_id=${activeDeviceId}`,
          {
            method: "PUT",
            body: JSON.stringify(body),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to play playlist:", response.status, errorText);

          // If device is not found, try to transfer playback
          if (response.status === 404 && activeDeviceId === deviceIdRef.current) {
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
    [deviceId, token, waitForDevice, transferPlayback],
  );

  const pauseTrack = useCallback(async () => {
    if (
      activeDeviceRef.current &&
      activeDeviceRef.current.id !== deviceIdRef.current
    ) {
      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/pause?device_id=${activeDeviceRef.current.id}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setIsPlaying(false);
        setIsPaused(true);
      } catch (error) {
        console.error("Error pausing track via API:", error);
      }
      return;
    }

    if (player && typeof player.pause === "function") {
      player.pause().catch((error: any) => {
        console.error("Error pausing track:", error);
      });
      // Pause silent audio to release focus or sync state
      silentAudioRef.current?.pause();
    }
  }, [player, token]);

  const resumeTrack = useCallback(async () => {
    if (
      activeDeviceRef.current &&
      activeDeviceRef.current.id !== deviceIdRef.current
    ) {
      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${activeDeviceRef.current.id}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setIsPlaying(true);
        setIsPaused(false);
      } catch (error) {
        console.error("Error resuming track via API:", error);
      }
      return;
    }

    if (player && typeof player.resume === "function") {
      player.resume().catch((error: any) => {
        console.error("Error resuming track:", error);
      });
      // Play silent audio to grab focus
      silentAudioRef.current
        ?.play()
        .catch((e) => console.error("Silent audio play failed:", e));
    }
  }, [player, token]);

  const nextTrack = useCallback(async () => {
    if (
      activeDeviceRef.current &&
      activeDeviceRef.current.id !== deviceIdRef.current
    ) {
      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/next?device_id=${activeDeviceRef.current.id}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } catch (error) {
        console.error("Error skipping to next track via API:", error);
      }
      return;
    }

    if (player && typeof player.nextTrack === "function") {
      player.nextTrack().catch((error: any) => {
        console.error("Error skipping to next track:", error);
      });
    }
  }, [player, token]);

  const previousTrack = useCallback(async () => {
    if (
      activeDeviceRef.current &&
      activeDeviceRef.current.id !== deviceIdRef.current
    ) {
      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/previous?device_id=${activeDeviceRef.current.id}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } catch (error) {
        console.error("Error skipping to previous track via API:", error);
      }
      return;
    }

    if (player && typeof player.previousTrack === "function") {
      player.previousTrack().catch((error: any) => {
        console.error("Error skipping to previous track:", error);
      });
    }
  }, [player, token]);

  const seekTo = useCallback(
    async (positionMs: number) => {
      if (
        activeDeviceRef.current &&
        activeDeviceRef.current.id !== deviceIdRef.current
      ) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${activeDeviceRef.current.id}`,
            {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (!response.ok) throw new Error(`Seek failed: ${response.status}`);
          lastPlayerStateFetch = null;
          setPosition(positionMs);
        } catch (error) {
          console.error("Error seeking via API:", error);
        }
        return;
      }

      if (player && typeof player.seek === "function") {
        player.seek(positionMs).then(() => setPosition(positionMs)).catch((error: any) => {
          console.error("Error seeking:", error);
        });
      }
    },
    [player, token],
  );

  async function syncPlaybackState(force = false) {
      if (!token || deviceTransferRef.current) return;

      const sdkDeviceId = deviceIdRef.current;
      const activeId = activeDeviceRef.current?.id;
      const isOwnSdkDeviceActive =
        !!sdkDeviceId && !!activeId && activeId === sdkDeviceId;

      if (isOwnSdkDeviceActive) {
        const now = Date.now();
        if (!force && now - lastOwnDeviceSyncRef.current < 15000) {
          return;
        }
        lastOwnDeviceSyncRef.current = now;
      }

      if (globalPollingInFlight) {
        return;
      }

      globalPollingInFlight = true;

      try {
        const now = Date.now();
        if (
          !force &&
          lastPlayerStateFetch &&
          now - lastPlayerStateFetch.timestamp < PLAYER_STATE_CACHE_TTL_MS
        ) {
          const data = lastPlayerStateFetch.data;
          if (data && data.device) {
            setActiveDevice({
              id: data.device.id,
              name: data.device.name,
              type: data.device.type,
            });

            if (data.device.id !== deviceIdRef.current && data.item) {
              setCurrentTrack({
                id: data.item.id || "",
                name: data.item.name,
                artists: data.item.artists.map((artist: any) => ({
                  name: artist.name,
                  id: artist.uri?.split(":")[2] || "",
                })),
                album: {
                  name: data.item.album.name,
                  images: data.item.album.images || [],
                  id: data.item.album.uri?.split(":")[2] || "",
                  artists: data.item.artists.map((artist: any) => ({
                    name: artist.name,
                    id: artist.uri?.split(":")[2] || "",
                  })),
                  release_date: "",
                  total_tracks: 0,
                },
                duration_ms: data.item.duration_ms,
                explicit: false,
                external_urls: {
                  spotify: `https://open.spotify.com/track/${data.item.id}`,
                },
                popularity: 0,
                preview_url: null,
                track_number: 0,
                disc_number: 0,
                uri: data.item.uri,
              });
              setIsPlaying(data.is_playing);
              setIsPaused(!data.is_playing);
              setPosition(Math.min(data.item.duration_ms, data.progress_ms + (data.is_playing ? now - lastPlayerStateFetch.timestamp : 0)));
              setDuration(data.item.duration_ms);
              if (data.device.volume_percent !== null) {
                setVolumeState(data.device.volume_percent / 100);
              }
            }
          } else {
            setActiveDevice(null);
          }
          return;
        }

        const response = await fetch("https://api.spotify.com/v1/me/player", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          if (deviceTransferRef.current) return;
          lastPlayerStateFetch = { data, timestamp: Date.now() };

          if (data && data.device) {
            setActiveDevice({
              id: data.device.id,
              name: data.device.name,
              type: data.device.type,
            });

            if (data.device.id !== deviceIdRef.current) {
              if (data.item) {
                setCurrentTrack({
                  id: data.item.id || "",
                  name: data.item.name,
                  artists: data.item.artists.map((artist: any) => ({
                    name: artist.name,
                    id: artist.uri?.split(":")[2] || "",
                  })),
                  album: {
                    name: data.item.album.name,
                    images: data.item.album.images || [],
                    id: data.item.album.uri?.split(":")[2] || "",
                    artists: data.item.artists.map((artist: any) => ({
                      name: artist.name,
                      id: artist.uri?.split(":")[2] || "",
                    })),
                    release_date: "",
                    total_tracks: 0,
                  },
                  duration_ms: data.item.duration_ms,
                  explicit: false,
                  external_urls: {
                    spotify: `https://open.spotify.com/track/${data.item.id}`,
                  },
                  popularity: 0,
                  preview_url: null,
                  track_number: 0,
                  disc_number: 0,
                  uri: data.item.uri,
                });
                setIsPlaying(data.is_playing);
                setIsPaused(!data.is_playing);
                setPosition(data.progress_ms);
                setDuration(data.item.duration_ms);
                if (data.device.volume_percent !== null) {
                  setVolumeState(data.device.volume_percent / 100);
                }
              }
            }
          } else {
            setActiveDevice(null);
          }
        } else if (response.status === 204) {
          setActiveDevice(null);
        }
      } catch (error) {
        console.error("Error fetching playback state:", error);
      } finally {
        globalPollingInFlight = false;
      }
    }

  const setVolume = useCallback(
    (newVolume: number) => {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolumeState(clampedVolume);

      // Debounce volume changes to prevent too many API calls
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }

      volumeTimeoutRef.current = setTimeout(async () => {
        // Prioritize active device if available, otherwise use current deviceId
        const targetDeviceId = activeDeviceRef.current?.id || deviceIdRef.current;
        
        if (targetDeviceId) {
          try {
            const volumePercent = Math.round(clampedVolume * 100);
            await fetch(
              `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}&device_id=${targetDeviceId}`,
              {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
          } catch (error) {
            console.error("Error setting volume via API:", error);
          }
          return;
        }

        if (player && typeof player.setVolume === "function" && isReady) {
          player.setVolume(clampedVolume).catch((error: any) => {
            console.error("Error setting volume:", error);
            // If setting volume fails, revert to previous volume
            setVolumeState((prevVolume) => prevVolume);
          });
        }
      }, 100); // 100ms debounce
    },
    [player, isReady, token],
  );

  // Set repeat mode on Spotify player
  const setSpotifyRepeatMode = useCallback(
    async (mode: "off" | "context" | "track") => {
      const targetDeviceId = activeDeviceRef.current?.id || deviceIdRef.current;
      if (!targetDeviceId || !token) return;

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/repeat?state=${mode}&device_id=${targetDeviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
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
    [deviceId, token],
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
      const updateMetadata = () => {
        if (!currentTrack) return;

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
      };

      // Update immediately
      updateMetadata();

      // Retry updates to fight against Spotify SDK overwriting our metadata
      // Continuous update to ensure our metadata takes precedence
      const interval = setInterval(updateMetadata, 1000);

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

      return () => {
        clearInterval(interval);
      };
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [currentTrack, resumeTrack, pauseTrack, previousTrack, nextTrack, seekTo]);

  // Update Media Session playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    // Force silent audio to play to ensure we own the media session
    if (isPlaying && silentAudioRef.current) {
      silentAudioRef.current
        .play()
        .catch((e) => console.error("Silent audio ensure-play failed:", e));
    }
  }, [isPlaying, currentTrack]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const updateToken = useCallback((t: string) => {
    setToken(t);
  }, []);

  const selectDevice = async (device: SpotifyDevice) => {
    if (deviceTransferRef.current) return;
    deviceTransferRef.current = true;
    try {
      if (device.id === deviceIdRef.current) await player?.activateElement?.();
      await transferSpotifySession(device);
      const selected = { id: device.id!, name: device.name, type: device.type };
      activeDeviceRef.current = selected;
      setActiveDevice(selected);
    } finally {
      lastPlayerStateFetch = null;
      deviceTransferRef.current = false;
      void syncPlaybackState(true);
    }
  };

  const value: PlayerContextType = {
    selectDevice,
    currentTrack,
    isPlaying,
    isPaused,
    position,
    positionUpdatedAt,
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
    setToken: updateToken,
    analyser,
    dataArray,
    activeDevice,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
};
