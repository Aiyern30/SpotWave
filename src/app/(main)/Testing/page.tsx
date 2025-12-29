"use client";

import SpotifyRippleVisualizer from "@/components/SpotifyRippleVisualizer";
import { usePlayer } from "@/contexts/PlayerContext";
import useSpotifyAudioAnalyzer from "@/hooks/useSpotifyAudioAnalyzer";

export default function VisualizerPage() {
  return <SpotifyRippleVisualizer />;
}
