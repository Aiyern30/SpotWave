"use client";

import { useEffect, useState } from "react";
import { useAudioCapture } from "@/contexts/AudioCaptureContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTheme } from "@/contexts/ThemeContext";
import AudioVisualizer from "./AudioVisualizer";

export default function BackgroundVisualizer() {
  const { analyser, captureMode, pending, error, startListening, stopListening } = useAudioCapture();
  const { isPlaying } = usePlayer();
  const { currentTheme } = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState(4);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem("background-visualizer") !== "false");
      const saved = Number(localStorage.getItem("background-visualizer-sensitivity"));
      if (saved >= 1 && saved <= 6) setSensitivity(saved);
    } catch {}
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const button = "min-h-10 rounded-lg border border-brand/25 bg-zinc-950/90 px-3 text-xs text-zinc-200 hover:border-brand/60 hover:bg-brand/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";
  return <>
    {enabled && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-60">
      <AudioVisualizer analyser={null} captureAnalyser={analyser} captured={captureMode !== "none"}
        playing={isPlaying} reducedMotion={reducedMotion} color={currentTheme.color}
        sensitivity={sensitivity} detail={8} background />
    </div>}
    <div className="relative z-10 flex flex-wrap items-center gap-2 rounded-xl border border-brand/15 bg-zinc-950/85 p-2">
      <span className="mr-auto px-2 text-xs text-zinc-400" role="status">
        {pending ? "Waiting for audio sharing…" : captureMode === "speaker" ? "Tab / system audio connected" : captureMode === "mic" ? "Microphone connected" : "Automatic animation"}
        {reducedMotion && " · Reduced motion"}
      </span>
      <button className={button} aria-pressed={enabled} onClick={() => {
        setEnabled(!enabled);
        try { localStorage.setItem("background-visualizer", String(!enabled)); } catch {}
      }}>{enabled ? "Hide background" : "Show background"}</button>
      {captureMode === "none" && !pending
        ? <button className={button} onClick={() => void startListening("speaker")}>Share audio</button>
        : <button className={button} onClick={stopListening}>{pending ? "Cancel" : "Stop sharing"}</button>}
      {enabled && <label className="flex min-h-10 items-center gap-2 px-2 text-xs text-zinc-400">
        Sensitivity
        <input aria-label="Background visualizer sensitivity" type="range" min="1" max="6" step="0.1" value={sensitivity}
          className="w-24 accent-brand" onChange={event => {
            const value = Number(event.target.value);
            setSensitivity(value);
            try { localStorage.setItem("background-visualizer-sensitivity", String(value)); } catch {}
          }} />
      </label>}
      {error && <p role="alert" className="w-full px-2 pb-1 text-xs text-red-300">{error}</p>}
    </div>
  </>;
}
