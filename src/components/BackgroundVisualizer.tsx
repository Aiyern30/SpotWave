"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAudioCapture } from "@/contexts/AudioCaptureContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AudioLines, Square, MonitorUp, Mic, Aperture, Waves, Activity, Scale, Gauge, Zap, PictureInPicture2 } from "lucide-react";
import { useMiniPlayer } from "@/contexts/MiniPlayerContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./ui/Dropdown-menu";
import AudioVisualizer, { type Mode } from "./AudioVisualizer";

export default function BackgroundVisualizer({ renderControls }: { renderControls: (controls: ReactNode) => ReactNode }) {
  const {
    analyser,
    captureMode,
    pending,
    error,
    startListening,
    stopListening,
  } = useAudioCapture();
  const { isPlaying } = usePlayer();
  const { currentTheme } = useTheme();
  const { isMiniPlayerOpen, toggleMiniPlayer } = useMiniPlayer();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [visualMode, setVisualMode] = useState<Mode>("Ribbons");
  const [sensitivity, setSensitivity] = useState(4);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem("background-visualizer") !== "false");
      const savedMode = localStorage.getItem("background-visualizer-mode");
      if (savedMode === "Orbit" || savedMode === "Ribbons" || savedMode === "Spectrum") setVisualMode(savedMode);
      const saved = Number(
        localStorage.getItem("background-visualizer-sensitivity"),
      );
      if (saved >= 1 && saved <= 6)
        setSensitivity(saved < 3 ? 2 : saved < 5 ? 4 : 6);
    } catch {}
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const connected = captureMode !== "none";
  useEffect(() => {
    if (error) setOpen(true);
  }, [error]);
  const requestAudio = (mode: "speaker" | "mic" = "speaker") => {
    // Invoke capture directly from a click, never from menu state or an effect.
    void startListening(mode);
    setOpen(true);
  };
  const controls = (
    <div className="flex items-center gap-1 sm:gap-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            pending
              ? "Audio sharing pending"
              : "Audio visualizer settings"
          }
          title="Audio visualizer settings"
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${connected ? "border-brand/40 bg-brand/15 text-brand" : "border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-brand/40 hover:text-zinc-100"}`}
        >
          <AudioLines
            size={19}
            aria-hidden="true"
            className={pending ? "motion-safe:animate-pulse" : ""}
          />
          {connected && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[420px] max-w-[calc(100vw-24px)] max-h-[min(80dvh,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
      >
        <DropdownMenuLabel className="text-zinc-100">
          Audio visualizer
        </DropdownMenuLabel>
        <p
          className="px-2.5 pb-2 text-xs leading-relaxed text-zinc-400"
          role="status"
        >
          {pending
            ? "Select the playing tab and enable Share tab audio."
            : connected
              ? (captureMode === "mic" ? "Microphone connected. Reacts to sound around you." : "Shared audio connected across your pages.")
              : "Waiting for shared audio. No simulated movement."}
        </p>
        {error && (
          <p role="alert" className="px-2.5 pb-2 text-xs text-red-300">
            {error}
          </p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={enabled}
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={(value) => {
            setEnabled(value);
            try {
              localStorage.setItem("background-visualizer", String(value));
            } catch {}
          }}
        >
          Background animation
        </DropdownMenuCheckboxItem>
        <DropdownMenuLabel>Audio source</DropdownMenuLabel>
        <DropdownMenuItem disabled={pending} onSelect={event => event.preventDefault()} onClick={() => requestAudio("speaker")}>
          <MonitorUp size={14} className="mr-2" />
          {captureMode === "speaker" ? "Change shared audio" : "Share tab / screen audio"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={pending || captureMode === "mic"} onSelect={event => event.preventDefault()} onClick={() => requestAudio("mic")}>
          <Mic size={14} className="mr-2" />
          {captureMode === "mic" ? "Microphone active" : "Use microphone"}
        </DropdownMenuItem>
        <p className="px-2.5 py-2 text-xs leading-relaxed text-zinc-400">Shared audio is clearest. Microphone mode needs audible speakers and also picks up room noise.</p>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Visualization</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={visualMode} onValueChange={value => {
          if (value !== "Orbit" && value !== "Ribbons" && value !== "Spectrum") return;
          setVisualMode(value);
          try { localStorage.setItem("background-visualizer-mode", value); } catch {}
        }}>
          <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
          {(["Orbit", "Ribbons", "Spectrum"] as const).map(value => {
            const Icon = value === "Orbit" ? Aperture : value === "Ribbons" ? Waves : Activity;
            const checked = visualMode === value;
            return (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                onSelect={event => event.preventDefault()}
                className={`flex-col gap-1.5 justify-center items-center py-3 pl-0 rounded-lg border transition-colors ${
                  checked
                    ? "bg-brand/20 border-brand/50 text-brand"
                    : "border-white/10 hover:border-brand/30 hover:bg-brand/10"
                } [&>span:first-child]:hidden`}
              >
                <Icon size={16} />
                <span className="text-xs font-medium">{value}</span>
              </DropdownMenuRadioItem>
            );
          })}
          </div>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Sensitivity</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(sensitivity)}
          onValueChange={(value) => {
            setSensitivity(Number(value));
            try {
              localStorage.setItem("background-visualizer-sensitivity", value);
            } catch {}
          }}
        >
          <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
          {[
            [2, "Balanced", Scale],
            [4, "Sensitive", Gauge],
            [6, "Very sensitive", Zap],
          ].map(([value, label, Icon]) => {
            const checked = sensitivity === (value as number);
            return (
              <DropdownMenuRadioItem
                key={value as number}
                value={String(value)}
                onSelect={(event) => event.preventDefault()}
                className={`flex-col gap-1.5 justify-center items-center py-3 pl-0 rounded-lg border transition-colors ${
                  checked
                    ? "bg-brand/20 border-brand/50 text-brand"
                    : "border-white/10 hover:border-brand/30 hover:bg-brand/10"
                } [&>span:first-child]:hidden`}
              >
                {/* @ts-ignore Icon will be a Lucide component */}
                <Icon size={16} />
                <span className="text-xs font-medium text-center leading-tight">{label as string}</span>
              </DropdownMenuRadioItem>
            );
          })}
          </div>
        </DropdownMenuRadioGroup>
        {reducedMotion && (
          <p className="px-2.5 py-2 text-xs text-zinc-400">
            Reduced motion is enabled on your device.
          </p>
        )}
        <DropdownMenuSeparator />
        {connected || pending ? (
          <DropdownMenuItem onSelect={stopListening}>
            <Square size={14} className="mr-2" />
            {pending ? "Cancel sharing" : "Stop sharing"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={(event) => event.preventDefault()}
            onClick={() => requestAudio()}
          >
            <MonitorUp size={14} className="mr-2" />
            {error ? "Try sharing again" : "Share audio"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

      <button
        type="button"
        onClick={toggleMiniPlayer}
        aria-label={isMiniPlayerOpen ? "Close Mini Player" : "Open Mini Player"}
        title={isMiniPlayerOpen ? "Close Mini Player" : "Open Mini Player"}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
          isMiniPlayerOpen
            ? "border-brand/40 bg-brand/15 text-brand"
            : "border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-brand/40 hover:text-zinc-100"
        }`}
      >
        <PictureInPicture2
          size={19}
          aria-hidden="true"
        />
        {isMiniPlayerOpen && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
        )}
      </button>
    </div>
  );
  return (
    <>
      {enabled && connected && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 opacity-60"
        >
          <AudioVisualizer
            analyser={null}
            captureAnalyser={analyser}
            captured={connected}
            playing={isPlaying}
            reducedMotion={reducedMotion}
            color={currentTheme.color}
            sensitivity={sensitivity}
            detail={8}
            background
            mode={visualMode}
            audioOnly
          />
        </div>
      )}
      {renderControls(controls)}
    </>
  );
}
