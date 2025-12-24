"use client";

import SpotifyRippleVisualizer from "@/components/SpotifyRippleVisualizer";
import { usePlayer } from "@/contexts/PlayerContext";
import useSpotifyAudioAnalyzer from "@/hooks/useSpotifyAudioAnalyzer";

export default function VisualizerPage() {
  const { player, isPlaying } = usePlayer();
  const { analyser, dataArray } = useSpotifyAudioAnalyzer(player, isPlaying);

  return (
    <SpotifyRippleVisualizer
      externalAnalyser={analyser}
      externalDataArray={dataArray}
      isExternalPlaying={isPlaying}
    />
  );
}
