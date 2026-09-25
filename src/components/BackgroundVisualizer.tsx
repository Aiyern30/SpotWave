"use client";

import { useEffect, useState } from "react";
import { useAudioCapture } from "@/contexts/AudioCaptureContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AudioLines, Square } from "lucide-react";
import { Breadcrumbs } from "./Header";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "./ui/Dropdown-menu";
import AudioVisualizer from "./AudioVisualizer";

export default function BackgroundVisualizer() {
  const { analyser, captureMode, pending, error, startListening, stopListening } = useAudioCapture();
  const { isPlaying } = usePlayer();
  const { currentTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState(4);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem("background-visualizer") !== "false");
      const saved = Number(localStorage.getItem("background-visualizer-sensitivity"));
      if (saved >= 1 && saved <= 6) setSensitivity(saved < 3 ? 2 : saved < 5 ? 4 : 6);
    } catch {}
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const connected = captureMode !== "none";
  useEffect(() => { if (error) setOpen(true); }, [error]);
  const controls = <DropdownMenu open={open} onOpenChange={next => {
    if (next && !connected && !pending && !error) {
      void startListening("speaker");
      return;
    }
    setOpen(next);
  }}>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={pending ? "Audio sharing pending" : connected ? "Audio visualizer settings" : "Share audio for visualizer"}
        title={connected ? "Audio visualizer settings" : "Share audio"}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${connected ? "border-brand/40 bg-brand/15 text-brand" : "border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-brand/40 hover:text-zinc-100"}`}>
        <AudioLines size={19} aria-hidden="true" className={pending ? "motion-safe:animate-pulse" : ""} />
        {connected && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} className="w-64 max-w-[calc(100vw-24px)]">
      <DropdownMenuLabel className="text-zinc-100">Audio visualizer</DropdownMenuLabel>
      <p className="px-2.5 pb-2 text-xs leading-relaxed text-zinc-400" role="status">
        {pending ? "Choose audio in the browser picker." : connected ? "Audio connected across your pages." : "Automatic animation"}
      </p>
      {error && <p role="alert" className="px-2.5 pb-2 text-xs text-red-300">{error}</p>}
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem checked={enabled} onSelect={event => event.preventDefault()} onCheckedChange={value => {
        setEnabled(value);
        try { localStorage.setItem("background-visualizer", String(value)); } catch {}
      }}>Background animation</DropdownMenuCheckboxItem>
      <DropdownMenuLabel>Sensitivity</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={String(sensitivity)} onValueChange={value => {
        setSensitivity(Number(value));
        try { localStorage.setItem("background-visualizer-sensitivity", value); } catch {}
      }}>
        {[[2, "Balanced"], [4, "Sensitive"], [6, "Very sensitive"]].map(([value, label]) =>
          <DropdownMenuRadioItem key={value} value={String(value)} onSelect={event => event.preventDefault()}>{label}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
      {reducedMotion && <p className="px-2.5 py-2 text-xs text-zinc-400">Reduced motion is enabled on your device.</p>}
      <DropdownMenuSeparator />
      {connected || pending ? <DropdownMenuItem onSelect={stopListening}><Square size={14} />{pending ? "Cancel sharing" : "Stop sharing"}</DropdownMenuItem>
        : <DropdownMenuItem onSelect={() => void startListening("speaker")}>Share audio</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;
  return <>
    {enabled && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-60">
      <AudioVisualizer analyser={null} captureAnalyser={analyser} captured={connected}
        playing={isPlaying} reducedMotion={reducedMotion} color={currentTheme.color}
        sensitivity={sensitivity} detail={8} background />
    </div>}
    <Breadcrumbs actions={controls} />
  </>;
}
