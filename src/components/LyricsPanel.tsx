"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { estimateLyricPosition, lyricIndexAt, parseSyncedLyrics, type LyricsLine } from "@/lib/lyrics";

type Lyrics = { lines: LyricsLine[]; plain: string; instrumental: boolean };
const cache = new Map<string, Lyrics>();
const control = "min-h-11 rounded-lg border border-white/10 px-3 text-xs font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand";

export default function LyricsPanel({ active = true }: { active?: boolean }) {
  const { currentTrack, position, positionUpdatedAt, duration, isPlaying, isPaused, seekTo } = usePlayer();
  const trackId = currentTrack?.id || "";
  const artist = currentTrack?.artists[0]?.name || "";
  const title = currentTrack?.name || "";
  const album = currentTrack?.album.name || "";
  const trackDuration = currentTrack?.duration_ms || 0;
  const key = JSON.stringify([trackId, artist, title, album, trackDuration]);
  const [result, setResult] = useState<{ key: string; data: Lyrics } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [index, setIndex] = useState(-1);
  const [following, setFollowing] = useState(true);
  const [offset, setOffset] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const anchor = useRef({ position, at: 0, running: false, sampledAt: -1, trackId: "" });
  const data = result?.key === key ? result.data : null;

  useEffect(() => {
    const previous = anchor.current;
    const now = performance.now();
    const freshSample = previous.sampledAt !== positionUpdatedAt || previous.trackId !== trackId;
    anchor.current = {
      position: freshSample ? position : estimateLyricPosition(previous.position, previous.at, now, previous.running, trackDuration),
      at: freshSample ? (positionUpdatedAt || now) : now,
      running: isPlaying && !isPaused,
      sampledAt: positionUpdatedAt,
      trackId,
    };
  }, [position, positionUpdatedAt, isPlaying, isPaused, trackId, trackDuration]);

  useEffect(() => {
    setFollowing(true);
    setIndex(-1);
    try {
      const saved = Number(localStorage.getItem(`lyrics-offset:${trackId}`) || 0);
      setOffset(Number.isFinite(saved) ? Math.max(-10000, Math.min(10000, saved)) : 0);
    } catch { setOffset(0); }
  }, [trackId]);

  useEffect(() => {
    if (!active || !trackId) return;
    const controller = new AbortController();
    setError("");
    const cached = cache.get(key);
    if (cached) { setResult({ key, data: cached }); return; }
    const params = new URLSearchParams({ artist_name: artist, track_name: title, album_name: album, duration: String(trackDuration / 1000) });
    fetch(`https://lrclib.net/api/get?${params}`, { signal: controller.signal })
      .then(async response => {
        if (response.status === 404) return { plainLyrics: "No lyrics found for this recording." };
        if (!response.ok) throw new Error("Lyrics are unavailable right now. Please try again.");
        return response.json();
      })
      .then(body => {
        if (controller.signal.aborted) return;
        const lines = parseSyncedLyrics(body.syncedLyrics || "");
        const value = { lines, plain: body.plainLyrics || lines.map(line => line.text).join("\n") || "No lyrics found for this recording.", instrumental: !!body.instrumental };
        if (cache.size >= 50) cache.delete(cache.keys().next().value!);
        cache.set(key, value);
        setResult({ key, data: value });
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [active, key, trackId, artist, title, album, trackDuration, retry]);

  useEffect(() => {
    if (!active || !data?.lines.length) return;
    const update = () => {
      const sample = anchor.current;
      // Interpolate from an authoritative sample; never accumulate timer ticks.
      // Stop extrapolating if playback updates have been absent for five seconds.
      const playhead = estimateLyricPosition(sample.position, sample.at, performance.now(), sample.running, duration || trackDuration);
      setIndex(lyricIndexAt(data.lines, playhead - offset));
    };
    update();
    const timer = window.setInterval(update, 80);
    return () => window.clearInterval(timer);
  }, [active, data, duration, trackDuration, offset, position, isPlaying, isPaused]);

  useEffect(() => {
    if (!following || !active || index < 0) return;
    const viewport = container.current;
    const line = viewport?.querySelector<HTMLElement>(`[data-line="${index}"]`);
    if (!viewport || !line) return;
    const top = viewport.scrollTop + line.getBoundingClientRect().top - viewport.getBoundingClientRect().top - viewport.clientHeight / 2 + line.clientHeight / 2;
    viewport.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [index, following, active]);

  const adjust = (value: number) => {
    const next = Math.max(-10000, Math.min(10000, value));
    setOffset(next);
    try { localStorage.setItem(`lyrics-offset:${trackId}`, String(next)); } catch {}
  };

  return <section className="flex h-full min-h-0 flex-col" aria-label="Lyrics">
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-5 py-3">
      <span className="text-xs text-zinc-400">{data?.lines.length ? "Synced lyrics" : "Lyrics"}</span>
      {data?.lines.length ? <button className={control} aria-pressed={following} onClick={() => setFollowing(!following)}>{following ? "Following" : "Follow lyrics"}</button> : null}
    </div>
    <div ref={container} tabIndex={0} aria-label="Lyrics text" className="lyrics-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-8 sm:px-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      onWheel={() => setFollowing(false)} onTouchMove={() => setFollowing(false)} onPointerDown={() => setFollowing(false)}
      onKeyDown={event => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) setFollowing(false); }}>
      {error ? <div role="status" className="space-y-4 text-sm text-zinc-300"><p>{error}</p><button className={control} onClick={() => setRetry(value => value + 1)}>Try again</button></div> : !data ? <div role="status" className="space-y-7"><span className="sr-only">Loading lyrics</span>{[80, 95, 65, 85, 70].map((width, i) => <div key={i} className="h-6 rounded bg-zinc-800 motion-safe:animate-pulse" style={{ width: `${width}%` }} />)}</div> : data.instrumental ? <p className="text-zinc-300">This track is instrumental.</p> : data.lines.length ? <div className="space-y-4 pb-[45vh]">
        {data.lines.map((line, i) => <button type="button" key={`${line.time}-${i}`} data-line={i} aria-current={i === index ? "true" : undefined} aria-label={`Seek to ${Math.floor(Math.max(0, line.time + offset) / 1000)} seconds: ${line.text || "Instrumental"}`}
          className={`block min-h-11 w-full break-words rounded-lg py-1 text-left text-xl font-semibold leading-relaxed transition-colors sm:text-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${i === index ? "text-brand" : "text-zinc-400 hover:text-zinc-100"}`}
          onClick={() => { seekTo(Math.max(0, Math.min(trackDuration, line.time + offset))); setFollowing(true); }}>{line.text || <span className="text-base font-normal">Instrumental</span>}</button>)}
      </div> : <p className="whitespace-pre-wrap break-words text-lg leading-loose text-zinc-300">{data.plain}</p>}
    </div>
    <footer className="shrink-0 border-t border-white/5 px-5 py-3">
      {data?.lines.length ? <><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs tabular-nums text-zinc-300">Timing {offset > 0 ? "+" : ""}{(offset / 1000).toFixed(1)}s</span><div className="flex gap-1"><button className={control} disabled={offset <= -10000} onClick={() => adjust(offset - 100)}>Earlier</button><button className={control} disabled={offset >= 10000} onClick={() => adjust(offset + 100)}>Later</button><button className={control} disabled={offset === 0} onClick={() => adjust(0)}>Reset</button></div></div><p className="mt-2 text-xs text-zinc-400">Tap a line to seek. Timing is saved for this song.</p></> : null}
      <a href="https://lrclib.net" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Lyrics from LRCLIB</a>
    </footer>
  </section>;
}
