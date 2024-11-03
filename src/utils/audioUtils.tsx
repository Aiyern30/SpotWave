// src/utils/audioUtils.ts
import { useState } from "react";

let audio: HTMLAudioElement | null = null;
let currentlyPlayingUrl: string | null = null;

export const togglePreview = (
  url: string,
  setPlayingUrl: (url: string | null) => void
) => {
  if (audio && currentlyPlayingUrl === url) {
    audio.pause();
    currentlyPlayingUrl = null;
    setPlayingUrl(null);
  } else {
    if (audio) {
      audio.pause();
    }
    const newAudio = new Audio(url);
    newAudio.volume = 0.5;
    newAudio.play();
    audio = newAudio;
    currentlyPlayingUrl = url;
    setPlayingUrl(url);

    newAudio.onended = () => {
      currentlyPlayingUrl = null;
      setPlayingUrl(null);
    };
  }
};
