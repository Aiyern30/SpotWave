"use client";

import { useEffect, useState } from "react";
import { parseSyncedLyrics, type LyricsLine } from "@/lib/lyrics";

type Lyrics = { lines: LyricsLine[]; plain: string; instrumental: boolean };
const cache = new Map<string, Lyrics>();
type Track = { id: string; name: string; artists: { name: string }[]; album: { name: string }; duration_ms: number };

export function useTrackLyrics(track: Track | null | undefined, active = true) {
  const trackId = track?.id || "";
  const artist = track?.artists[0]?.name || "";
  const title = track?.name || "";
  const album = track?.album.name || "";
  const trackDuration = track?.duration_ms || 0;
  const key = JSON.stringify([trackId, artist, title, album, trackDuration]);
  const [result, setResult] = useState<{ key: string; data: Lyrics } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const data = result?.key === key ? result.data : null;
  useEffect(() => {
    if (!active || !trackId) return;
    const controller = new AbortController();
    setError("");
    const cached = cache.get(key);
    if (cached) { setResult({ key, data: cached }); return; }
    const params = new URLSearchParams({ artist_name: artist, track_name: title, album_name: album, duration: String(trackDuration / 1000) });
    fetch(`https://lrclib.net/api/get?${params}`, { signal: controller.signal })
      .then(async response => {
        if (response.status === 404) return { plainLyrics: "" };
        if (!response.ok) throw new Error("Lyrics are unavailable right now. Please try again.");
        return response.json();
      })
      .then(body => {
        if (controller.signal.aborted) return;
        const lines = parseSyncedLyrics(body.syncedLyrics || "");
        const value = { lines, plain: body.plainLyrics || lines.map(line => line.text).join("\n"), instrumental: !!body.instrumental };
        if (cache.size >= 50) cache.delete(cache.keys().next().value!);
        cache.set(key, value);
        setResult({ key, data: value });
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [active, key, trackId, artist, title, album, trackDuration, retry]);

  const hasLyrics = !!data && !data.instrumental && (data.lines.some(line => line.text.trim()) || !!data.plain.trim());
  return { data, error, hasLyrics, retry: () => setRetry(value => value + 1) };
}
