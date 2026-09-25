"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type MutableRefObject } from "react";

type Mode = "none" | "mic" | "speaker";
type Capture = {
  captureMode: Mode;
  analyser: MutableRefObject<AnalyserNode | null>;
  pending: boolean;
  error: string | null;
  startListening: (mode: Exclude<Mode, "none">) => Promise<void>;
  stopListening: () => void;
};
const Context = createContext<Capture | null>(null);

/** Capture belongs to the app session, never to a visualizer's mount lifecycle. */
export function AudioCaptureProvider({ children }: { children: ReactNode }) {
  const analyser = useRef<AnalyserNode | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const generation = useRef(0);
  const [captureMode, setMode] = useState<Mode>("none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const release = useCallback(() => {
    generation.current++;
    const previous = stream.current;
    stream.current = null;
    source.current?.disconnect();
    source.current = null;
    previous?.getTracks().forEach(track => track.stop());
    const audio = context.current;
    context.current = null;
    if (audio && audio.state !== "closed") void audio.close().catch(() => {});
    analyser.current = null;
  }, []);
  const stopListening = useCallback(() => {
    release();
    setMode("none");
    setPending(false);
    setError(null);
  }, [release]);

  const startListening = useCallback(async (mode: "mic" | "speaker") => {
    stopListening();
    const request = generation.current;
    setPending(true);
    try {
      const media = navigator.mediaDevices;
      if (!media || (mode === "speaker" && !media.getDisplayMedia)) {
        throw new Error("Audio sharing is unavailable in this browser. Try a desktop browser with tab audio sharing.");
      }
      // Browser hints favor tab audio and hide entire monitors where supported.
      const displayOptions = {
        video: { displaySurface: "browser" }, audio: true,
        preferCurrentTab: true, monitorTypeSurfaces: "exclude",
      };
      const captured = mode === "speaker"
        ? await media.getDisplayMedia(displayOptions)
        : await media.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (request !== generation.current) {
        captured.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = captured;
      if (mode === "speaker" && captured.getVideoTracks().some(track => track.getSettings().displaySurface === "monitor")) {
        throw new Error("Entire-screen sharing is disabled. Choose a browser tab with audio instead.");
      }
      if (!captured.getAudioTracks().some(track => track.readyState === "live")) {
        throw new Error("No audio was shared. Choose the playing tab and enable Share tab audio.");
      }
      // Keep the display track alive for the browser's sharing session; never render or record it.
      captured.getTracks().forEach(track => track.addEventListener("ended", () => {
        if (stream.current === captured) stopListening();
      }, { once: true }));
      const audio = new AudioContext();
      context.current = audio;
      if (audio.state === "suspended") await audio.resume();
      if (request !== generation.current) return;
      const node = audio.createAnalyser();
      node.fftSize = 512;
      node.smoothingTimeConstant = .35;
      analyser.current = node;
      source.current = audio.createMediaStreamSource(captured);
      source.current.connect(node); // No destination connection: avoids duplicated audio/echo.
      setMode(mode);
      setPending(false);
    } catch (cause) {
      if (request !== generation.current) return;
      stopListening();
      const name = cause && typeof cause === "object" && "name" in cause ? cause.name : "";
      setError(name === "NotAllowedError"
        ? "Sharing was cancelled or blocked. Try sharing again. If the picker does not appear, check your browser or system screen-recording permission."
        : name === "InvalidStateError"
          ? "Click Share audio again while this tab is active."
          : cause instanceof Error ? cause.message : "Could not share audio. Please try again.");
    }
  }, [stopListening]);

  useEffect(() => release, [release]);
  return <Context.Provider value={{ captureMode, analyser, pending, error, startListening, stopListening }}>{children}</Context.Provider>;
}

export function useAudioCapture() {
  const value = useContext(Context);
  if (!value) throw new Error("useAudioCapture requires AudioCaptureProvider");
  return value;
}
