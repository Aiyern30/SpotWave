"use client";

import { Pause, Play } from "lucide-react";

type Props = {
  index: number;
  title: string;
  playing: boolean;
  onPlay: () => void;
};

/** Keep both layers mounted so hover never changes the row's geometry. */
export function TablePlayButton({ index, title, playing, onPlay }: Props) {
  return (
    <button
      type="button"
      className="table-play-control"
      data-playing={playing}
      aria-label={`${playing ? "Pause" : "Play"} ${title}`}
      onClick={(event) => {
        event.stopPropagation();
        onPlay();
      }}
    >
      <span className="table-track-number" aria-hidden="true">{index}</span>
      <span className="table-play-icon" aria-hidden="true">
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </span>
    </button>
  );
}
