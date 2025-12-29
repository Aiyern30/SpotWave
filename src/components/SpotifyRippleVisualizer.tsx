"use client";

import React, { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Settings } from "lucide-react";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
}

interface SpotifyRippleVisualizerProps {
  // Props to receive audio data from Spotify player
  externalAnalyser?: AnalyserNode | null;
  externalDataArray?: Uint8Array | null;
  isExternalPlaying?: boolean;
}

export default function SpotifyRippleVisualizer({
  externalAnalyser,
  externalDataArray,
  isExternalPlaying = false,
}: SpotifyRippleVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [sensitivity, setSensitivity] = useState(2);
  const [rippleCount, setRippleCount] = useState(3);
  const [useSpotifyAudio, setUseSpotifyAudio] = useState(true);

  // Microphone-based audio (original functionality)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const ripplesRef = useRef<Ripple[]>([]);
  const animationRef = useRef<number | null>(null);

  // Determine which audio source to use
  const activeAnalyser =
    useSpotifyAudio && externalAnalyser
      ? externalAnalyser
      : analyserRef.current;
  const activeDataArray =
    useSpotifyAudio && externalDataArray
      ? externalDataArray
      : dataArrayRef.current;
  const isActive = useSpotifyAudio ? isExternalPlaying : isListening;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      stopListening();
    };
  }, []);

  // Start animation when audio is active
  useEffect(() => {
    if (isActive && (activeAnalyser || (useSpotifyAudio && externalAnalyser))) {
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Clear canvas when not active
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      ripplesRef.current = [];
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, activeAnalyser, externalAnalyser, useSpotifyAudio]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      setIsListening(true);
      setUseSpotifyAudio(false); // Switch to microphone mode
    } catch (err) {
      console.error("Error setting up audio:", err);
      alert(
        "Could not access microphone. Please grant permission and ensure no other app is using it."
      );
    }
  };

  const stopListening = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
    ripplesRef.current = [];
  };

  const toggleAudioSource = () => {
    if (isListening) {
      stopListening();
    }
    setUseSpotifyAudio(!useSpotifyAudio);
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser =
      useSpotifyAudio && externalAnalyser
        ? externalAnalyser
        : analyserRef.current;
    const dataArray =
      useSpotifyAudio && externalDataArray
        ? externalDataArray
        : dataArrayRef.current;

    if (!analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray as any);

    // Calculate average amplitude
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    // Get low, mid, high frequencies
    const bass = dataArray.slice(0, 8).reduce((a, b) => a + b) / 8;

    // Clear canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const baseRadius = 50;
    const dynamicRadius = baseRadius + (average / 255) * 15 * sensitivity;

    // Draw lines
    const bufferLength = dataArray.length;
    const barsToDraw = 60;
    const step = Math.floor(bufferLength / barsToDraw);
    const angleStep = (Math.PI * 2) / barsToDraw;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    for (let i = 0; i < barsToDraw; i++) {
      const index = i * step;
      const value = dataArray[index] || 0;
      const amplitude = (value / 255) * 150 * sensitivity;
      const angle = i * angleStep;

      const x1 = centerX + Math.cos(angle) * dynamicRadius;
      const y1 = centerY + Math.sin(angle) * dynamicRadius;
      const x2 = centerX + Math.cos(angle) * (dynamicRadius + amplitude);
      const y2 = centerY + Math.sin(angle) * (dynamicRadius + amplitude);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw central circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Create ripples
    const bassThreshold = 50 * (2 / sensitivity);
    if (bass > bassThreshold && ripplesRef.current.length < rippleCount) {
      const angle = Math.random() * Math.PI * 2;
      const distance = dynamicRadius + 20 + Math.random() * 50;
      ripplesRef.current.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        radius: 0,
        maxRadius: 100 + (bass / 255) * 100,
        alpha: 1,
        color: `rgba(255, 255, 255, ${0.3 + (bass / 255) * 0.4})`,
        speed: 2 + (bass / 255) * 2,
      });
    }

    // Update and draw ripples
    ripplesRef.current = ripplesRef.current.filter((ripple) => {
      ripple.radius += ripple.speed;
      ripple.alpha = 1 - ripple.radius / ripple.maxRadius;

      if (ripple.alpha > 0) {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ripple.color.replace(/[\d.]+\)$/, `${ripple.alpha})`);
        ctx.lineWidth = 2 + (1 - ripple.alpha) * 3;
        ctx.stroke();
        return true;
      }
      return false;
    });

    if (bass > 180) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const hasSpotifyAudio =
    externalAnalyser && externalDataArray && isExternalPlaying;

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎵</span>
            Audio Ripple Visualizer
          </h1>

          <div className="flex gap-2">
            {hasSpotifyAudio && (
              <button
                onClick={toggleAudioSource}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  useSpotifyAudio
                    ? "bg-brand text-brand-foreground"
                    : "bg-gray-600 text-white hover:bg-gray-500"
                }`}
              >
                {useSpotifyAudio ? "Using Spotify" : "Using Microphone"}
              </button>
            )}

            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!!(useSpotifyAudio && hasSpotifyAudio)}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : useSpotifyAudio && hasSpotifyAudio
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-brand hover:bg-brand/90 text-brand-foreground"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff size={20} />
                  Stop Mic
                </>
              ) : (
                <>
                  <Mic size={20} />
                  Use Microphone
                </>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-white text-sm flex items-center gap-2 mb-2">
              <Settings size={16} />
              Sensitivity: {sensitivity.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm flex items-center gap-2 mb-2">
              <Settings size={16} />
              Max Ripples: {rippleCount}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={rippleCount}
              onChange={(e) => setRippleCount(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {isActive && (
          <div className="text-center mt-4 text-brand text-xs animate-pulse">
            {useSpotifyAudio && hasSpotifyAudio
              ? "Visualizing Spotify Audio"
              : "Microphone Active - Play music out loud"}
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Mic size={64} className="mx-auto mb-4 opacity-50" />
              {hasSpotifyAudio ? (
                <>
                  <p className="text-xl">
                    Play music on Spotify to see visualizations
                  </p>
                  <p className="text-sm mt-2">
                    Or click "Use Microphone" to visualize external audio
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl">Click "Use Microphone" to begin</p>
                  <p className="text-sm mt-2">
                    Make some noise and watch the ripples!
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
