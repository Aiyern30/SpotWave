"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Settings, Volume2, Waves } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

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
  const [sensitivity, setSensitivity] = useState(2);
  const [rippleCount, setRippleCount] = useState(3);
  const [useSpotifyAudio, setUseSpotifyAudio] = useState(true);
  const [captureMode, setCaptureMode] = useState<"none" | "mic" | "speaker">(
    "none",
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const ripplesRef = useRef<Ripple[]>([]);
  const animationRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  const {
    currentTrack,
    analyser: globalAnalyser,
    dataArray: globalDataArray,
    isPlaying: isGlobalPlaying,
    activeDevice,
    deviceId,
  } = usePlayer();

  const hasSpotifyAudio = !!(externalAnalyser || globalAnalyser);
  const isSpotifyPlaying = isExternalPlaying || isGlobalPlaying;
  const isActive = useSpotifyAudio ? isSpotifyPlaying : captureMode !== "none";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#050816";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      ripplesRef.current = [];
      return;
    }

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [
    isActive,
    useSpotifyAudio,
    hasSpotifyAudio,
    externalAnalyser,
    globalAnalyser,
  ]);

  const startListening = async (mode: "mic" | "speaker") => {
    try {
      let stream: MediaStream;

      if (mode === "speaker") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        stream.getVideoTracks().forEach((track) => track.stop());

        if (stream.getAudioTracks().length === 0) {
          throw new Error(
            "No audio found in system stream. Did you check 'Share audio'?",
          );
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      streamRef.current = stream;

      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      setCaptureMode(mode);
      setUseSpotifyAudio(false);
    } catch (err) {
      console.error("Error setting up audio:", err);
      alert(
        err instanceof Error ? err.message : "Could not access audio source.",
      );
    }
  };

  const stopListening = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
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

    analyserRef.current = null;
    dataArrayRef.current = null;
    setCaptureMode("none");
    ripplesRef.current = [];
  };

  const toggleAudioSource = () => {
    if (captureMode !== "none") {
      stopListening();
    }
    setUseSpotifyAudio((prev) => !prev);
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser =
      externalAnalyser ||
      (useSpotifyAudio ? globalAnalyser : analyserRef.current);

    const dataArray =
      externalDataArray ||
      (useSpotifyAudio ? globalDataArray : dataArrayRef.current);

    if (!analyser || !dataArray) return;

    const localArray =
      externalDataArray ||
      (useSpotifyAudio ? globalDataArray : dataArrayRef.current);

    if (!localArray || localArray.length === 0) return;

    if (!externalDataArray) {
      const tempData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(tempData as any);

      const sum = tempData.reduce((a, b) => a + b, 0);
      if (sum > 0 || !useSpotifyAudio) {
        for (let i = 0; i < localArray.length; i++) {
          localArray[i] = tempData[i];
        }
      }
    }

    const average = localArray.reduce((a, b) => a + b, 0) / localArray.length;
    const bass = localArray.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
    const treble = localArray.slice(32, 64).reduce((a, b) => a + b, 0) / 32;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const minSide = Math.min(width, height);
    const themeHue = 145 + Math.sin(frameRef.current * 0.02) * 28;
    const accent = `hsla(${themeHue}, 82%, 58%, 1)`;
    const accentSoft = `hsla(${themeHue}, 82%, 58%, 0.14)`;
    const accentDim = `hsla(${themeHue}, 82%, 58%, 0.06)`;

    const baseRadius = Math.max(78, minSide * 0.17);
    const dynamicRadius = baseRadius + (average / 255) * 38 * sensitivity;
    const ringRadius = dynamicRadius + 18;

    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createRadialGradient(
      centerX,
      centerY,
      minSide * 0.05,
      centerX,
      centerY,
      minSide * 0.7,
    );
    bg.addColorStop(0, "rgba(10, 18, 14, 0.92)");
    bg.addColorStop(0.45, "rgba(4, 8, 14, 0.95)");
    bg.addColorStop(1, "rgba(0, 0, 0, 0.98)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const barsToDraw = 84;
    const step = Math.max(1, Math.floor(localArray.length / barsToDraw));
    const angleStep = (Math.PI * 2) / barsToDraw;

    for (let i = 0; i < barsToDraw; i++) {
      const value = localArray[i * step] || 0;
      const amplitude = (value / 255) * 185 * sensitivity;
      const angle = i * angleStep;

      const x1 = centerX + Math.cos(angle) * ringRadius;
      const y1 = centerY + Math.sin(angle) * ringRadius;
      const x2 = centerX + Math.cos(angle) * (ringRadius + amplitude);
      const y2 = centerY + Math.sin(angle) * (ringRadius + amplitude);

      const barHue = (themeHue + i * 2.5) % 360;
      ctx.strokeStyle = `hsla(${barHue}, 88%, ${52 + Math.min(20, value / 18)}%, 0.95)`;
      ctx.lineWidth = Math.max(1.5, minSide * 0.004);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(34, 197, 94, 0.45)";
    ctx.shadowBlur = 48;

    const orb = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      dynamicRadius + 6,
    );
    orb.addColorStop(0, accent);
    orb.addColorStop(0.55, accentSoft);
    orb.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
    ctx.fillStyle = orb;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accentDim;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const bassThreshold = 50 * (2 / sensitivity);
    if (bass > bassThreshold && ripplesRef.current.length < rippleCount) {
      const angle = Math.random() * Math.PI * 2;
      const distance = dynamicRadius + 24 + Math.random() * 56;
      ripplesRef.current.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        radius: 0,
        maxRadius: 110 + (bass / 255) * 140,
        alpha: 1,
        color: `${Math.round(90 + themeHue)}, 255, 160`,
        speed: 2 + (bass / 255) * 3.25,
      });
    }

    ripplesRef.current = ripplesRef.current.filter((ripple) => {
      ripple.radius += ripple.speed;
      ripple.alpha = 1 - ripple.radius / ripple.maxRadius;

      if (ripple.alpha > 0) {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ripple.color}, ${Math.max(0.08, ripple.alpha)})`;
        ctx.lineWidth = 2 + (1 - ripple.alpha) * 3;
        ctx.stroke();
        return true;
      }
      return false;
    });

    if (treble > 170 && Math.random() > 0.72) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(
        centerX + (Math.random() - 0.5) * width * 0.55,
        centerY + (Math.random() - 0.5) * height * 0.55,
        1.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    frameRef.current += 1;
    animationRef.current = requestAnimationFrame(animate);
  };

  const trackImage = currentTrack?.album?.images?.[0]?.url;
  const trackTitle = currentTrack?.name ?? "Spotify Ripple Visualizer";
  const trackArtist =
    currentTrack?.artists?.map((artist) => artist.name).join(", ") ??
    "Play something to begin";
  const visualLabel = useSpotifyAudio
    ? "Spotify Audio"
    : captureMode === "mic"
      ? "Microphone"
      : "System Audio";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_32%),linear-gradient(180deg,#050816_0%,#02040a_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 shadow-[0_0_40px_rgba(34,197,94,0.18)]">
                <Waves className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                    Ripple Visualizer
                  </h1>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Live
                  </span>
                </div>
                <p className="text-sm text-white/55">
                  A stage for Spotify, mic, or system audio
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/70">
                {visualLabel}
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/70">
                {isActive ? "Animating" : "Idle"}
              </div>
              {activeDevice &&
                activeDevice.id !== deviceId &&
                useSpotifyAudio && (
                  <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-200">
                    Playing on {activeDevice.name}
                  </div>
                )}
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_28%)]" />
              <div className="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/45">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                      Current Track
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {trackTitle}
                    </h2>
                    <p className="mt-1 text-sm text-white/55 sm:text-base">
                      {trackArtist}
                    </p>
                  </div>
                  <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65 sm:block">
                    {currentTrack?.artists?.length
                      ? `${currentTrack.artists.length} artist${currentTrack.artists.length > 1 ? "s" : ""}`
                      : "No track loaded"}
                  </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
                  <div className="absolute inset-0 opacity-70">
                    <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
                  </div>

                  <div className="relative w-full max-w-[860px]">
                    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-center">
                      <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#0a0f18] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                        {trackImage ? (
                          <Image
                            src={trackImage}
                            alt={trackTitle}
                            fill
                            className="object-cover"
                            priority
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.28),rgba(3,7,18,0.96))]">
                            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(34,197,94,0.22)]">
                              <Waves className="h-12 w-12 text-emerald-300" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-transparent to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 py-4 text-left">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                            Visual Energy
                          </p>
                          <p className="mt-1 text-sm text-white/75">
                            {visualLabel}
                          </p>
                        </div>
                      </div>

                      <div className="flex min-h-[280px] flex-col justify-center gap-4">
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                              <Settings
                                size={16}
                                className="text-emerald-300"
                              />
                              Visual Controls
                            </div>
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">
                              Premium stage
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                                <span>Sensitivity</span>
                                <span className="text-emerald-300">
                                  {sensitivity.toFixed(1)}x
                                </span>
                              </label>
                              <input
                                type="range"
                                min="0.5"
                                max="5"
                                step="0.1"
                                value={sensitivity}
                                onChange={(e) =>
                                  setSensitivity(parseFloat(e.target.value))
                                }
                                className="visual-slider w-full"
                              />
                            </div>

                            <div>
                              <label className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                                <span>Max Ripples</span>
                                <span className="text-emerald-300">
                                  {rippleCount}
                                </span>
                              </label>
                              <input
                                type="range"
                                min="1"
                                max="8"
                                step="1"
                                value={rippleCount}
                                onChange={(e) =>
                                  setRippleCount(parseInt(e.target.value))
                                }
                                className="visual-slider w-full"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {hasSpotifyAudio && (
                            <button
                              onClick={toggleAudioSource}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                                useSpotifyAudio
                                  ? "border-emerald-400/30 bg-emerald-400 text-black shadow-[0_0_40px_rgba(34,197,94,0.22)]"
                                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                              }`}
                            >
                              {useSpotifyAudio ? (
                                <Volume2 size={16} />
                              ) : (
                                <Mic size={16} />
                              )}
                              {useSpotifyAudio ? "Spotify Audio" : "Mic Mode"}
                            </button>
                          )}

                          <button
                            onClick={() =>
                              captureMode === "speaker"
                                ? stopListening()
                                : startListening("speaker")
                            }
                            disabled={!!(useSpotifyAudio && hasSpotifyAudio)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                              captureMode === "speaker"
                                ? "border-rose-400/30 bg-rose-500 text-white"
                                : useSpotifyAudio && hasSpotifyAudio
                                  ? "cursor-not-allowed border-white/10 bg-white/5 text-white/25"
                                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                            }`}
                          >
                            {captureMode === "speaker" ? (
                              <MicOff size={16} />
                            ) : (
                              <Volume2 size={16} />
                            )}
                            {captureMode === "speaker"
                              ? "Stop Share"
                              : "Share Audio"}
                          </button>

                          <button
                            onClick={() =>
                              captureMode === "mic"
                                ? stopListening()
                                : startListening("mic")
                            }
                            disabled={!!(useSpotifyAudio && hasSpotifyAudio)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                              captureMode === "mic"
                                ? "border-rose-400/30 bg-rose-500 text-white"
                                : useSpotifyAudio && hasSpotifyAudio
                                  ? "cursor-not-allowed border-white/10 bg-white/5 text-white/25"
                                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                            }`}
                          >
                            {captureMode === "mic" ? (
                              <MicOff size={16} />
                            ) : (
                              <Mic size={16} />
                            )}
                            {captureMode === "mic" ? "Stop Mic" : "Use Mic"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-4 text-xs text-white/45">
                    <span>
                      {isActive ? "Audio locked in" : "Waiting for audio"}
                    </span>
                    <span>
                      {useSpotifyAudio
                        ? "Spotify layer active"
                        : captureMode === "none"
                          ? "Capture off"
                          : "External capture active"}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400 transition-all duration-300"
                      style={{ width: isActive ? "100%" : "18%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                    Now Playing
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/55">
                    {isActive ? "Live" : "Idle"}
                  </span>
                </div>
                <h3 className="text-xl font-semibold leading-tight text-white sm:text-2xl">
                  {trackTitle}
                </h3>
                <p className="mt-2 text-sm text-white/55">{trackArtist}</p>
              </div>

              <div className="relative flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_38%)]" />
                <div className="relative flex h-full min-h-[320px] items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="h-full w-full"
                    style={{ display: "block" }}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                <p className="font-medium text-white/75">Design idea</p>
                <p className="mt-2 leading-relaxed">
                  This version uses the album art as a stage anchor, then layers
                  the waveform, glow, and controls around it so it feels more
                  like a premium music screen than a plain canvas.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>

      <style jsx global>{`
        .visual-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 9999px;
          background: linear-gradient(
            90deg,
            rgba(34, 197, 94, 0.95),
            rgba(34, 211, 238, 0.95)
          );
          outline: none;
          cursor: pointer;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        }
        .visual-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: white;
          border: 2px solid rgba(34, 197, 94, 0.85);
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.16);
        }
        .visual-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: white;
          border: 2px solid rgba(34, 197, 94, 0.85);
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.16);
        }
      `}</style>
    </div>
  );
}
