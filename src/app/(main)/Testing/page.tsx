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

export default function AudioRippleVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [sensitivity, setSensitivity] = useState(2);
  const [rippleCount, setRippleCount] = useState(3);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

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

  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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

      // Resume context if suspended (common browser policy)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create source and assign to ref to prevent Garbage Collection
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source; // IMPORTANT: Keep reference
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      setIsListening(true);
      animate();
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

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = dataArrayRef.current;
    if (!dataArray) return;

    analyser.getByteFrequencyData(dataArray as any);

    // Calculate average amplitude
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

    // Get low, mid, high frequencies
    const bass = dataArray.slice(0, 8).reduce((a, b) => a + b) / 8;
    const mid = dataArray.slice(8, 32).reduce((a, b) => a + b) / 24;
    const treble = dataArray.slice(32, 64).reduce((a, b) => a + b) / 32;

    // Clear canvas
    ctx.fillStyle = "#000000"; // Pitch black background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Base radius for the central circle
    const baseRadius = 50;
    // Pulse the center circle based on overall loudness (average)
    const dynamicRadius = baseRadius + (average / 255) * 15 * sensitivity;

    // Draw lines
    const bufferLength = dataArray.length;
    // We want to cover 360 degrees.
    // Mirror the spectrum to make it symmetrical (left/right) or just wrap around?
    // The image looks fairly symmetrical. Let's mirror it for a pleasing look.
    // We'll use half the data for one half of the circle, and mirror it.

    // Number of bars relative to buffer size
    const barsToDraw = 60; // Adjust for density
    const step = Math.floor(bufferLength / barsToDraw);
    const angleStep = (Math.PI * 2) / barsToDraw;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    for (let i = 0; i < barsToDraw; i++) {
      // Get value from dataArray (using step to skip frequencies)
      const index = i * step;
      const value = dataArray[index] || 0;

      // Calculate amplitude with sensitivity
      // Make high frequencies extend more sharply if wanted, or just linear
      const amplitude = (value / 255) * 150 * sensitivity;

      // Angle for this bar
      const angle = i * angleStep;

      // Start point (on the circle edge)
      const x1 = centerX + Math.cos(angle) * dynamicRadius;
      const y1 = centerY + Math.sin(angle) * dynamicRadius;

      // End point (extending outwards)
      const x2 = centerX + Math.cos(angle) * (dynamicRadius + amplitude);
      const y2 = centerY + Math.sin(angle) * (dynamicRadius + amplitude);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; // White bars
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw the Central White Circle (on top of lines to clean up start points)
    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // Add an outer ring glow
    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Create ripples based on bass intensity
    const bassThreshold = 50 * (2 / sensitivity); // Dynamic based on sensitivity
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

    // Optional: Draw some "stars" or particles if high energy
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

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎵</span>
            Audio Ripple Visualizer
          </h1>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {isListening ? (
              <>
                <MicOff size={20} />
                Stop
              </>
            ) : (
              <>
                <Mic size={20} />
                Start Listening
              </>
            )}
          </button>
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

        {isListening && (
          <div className="text-center mt-4 text-green-500 text-xs animate-pulse">
            Microphone Active - Play music out loud
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />

        {!isListening && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Mic size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl">Click "Start Listening" to begin</p>
              <p className="text-sm mt-2">
                Make some noise and watch the ripples!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
