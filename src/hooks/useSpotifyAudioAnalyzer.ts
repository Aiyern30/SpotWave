import { useState, useEffect, useRef } from "react";

/**
 * Custom hook to bridge Spotify player audio to Web Audio API
 * This creates an audio context that can analyze the playing audio
 */
export const useSpotifyAudioAnalyzer = (player: any, isPlaying: boolean) => {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!player || !isPlaying) return;

    const setupAudioAnalyzer = async () => {
      try {
        // Get the HTML audio element from the Spotify player
        // The Spotify SDK uses an internal audio element
        const audioElement = document.querySelector("audio");

        if (!audioElement) {
          console.log("Waiting for Spotify audio element...");
          return;
        }

        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;

        // Resume context if suspended
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        // Create analyzer
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;

        // Create source from audio element if not already created
        if (!sourceRef.current) {
          try {
            const source = audioContext.createMediaElementSource(audioElement);
            sourceRef.current = source;

            // Connect: source -> analyzer -> destination
            source.connect(analyserNode);
            analyserNode.connect(audioContext.destination);
          } catch (err) {
            // Source might already be created, just connect analyzer
            console.log("Audio source already exists");
          }
        }

        // Create data array
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArr = new Uint8Array(bufferLength) as Uint8Array;

        setAnalyser(analyserNode);
        setDataArray(dataArr);

        console.log("Audio analyzer setup complete");
      } catch (error) {
        console.error("Error setting up audio analyzer:", error);
      }
    };

    // Delay setup to ensure audio element exists
    const timeout = setTimeout(setupAudioAnalyzer, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [player, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Already disconnected
        }
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { analyser, dataArray };
};

export default useSpotifyAudioAnalyzer;
