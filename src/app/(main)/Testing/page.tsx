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

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      setIsListening(true);
      animate();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please grant permission.");
    }
  };

  const stopListening = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
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
