"use client";

import { useEffect, useState } from "react";
import { parseSyncedLyrics, type LyricsLine } from "@/lib/lyrics";

type Lyrics = { lines: LyricsLine[]; plain: string; instrumental: boolean; isFallback: boolean };
const cache = new Map<string, Lyrics>();
type Track = { id: string; name: string; artists: { name: string }[]; album: { name: string }; duration_ms: number };

/**
 * Strips common cover/remix/version suffixes from a track title so we can
 * fall back to fetching the original song's lyrics.
 *
 * Examples:
 *   "心太软 - RNB 温柔男版"      → "心太软"
 *   "心太软 · R&B温柔男版"       → "心太软"
 *   "痴心绝对-rnb新版"           → "痴心绝对"
 *   "最好的我 - rnb版"           → "最好的我"
 *   "梦醒时分-rnb版"             → "梦醒时分"
 *   "Love Story (Taylor's Version)" → "Love Story"
 *   "Blinding Lights - Remix"       → "Blinding Lights"
 */
function stripVersionSuffix(title: string): string {
  return title
    // 1. Parenthesised/bracketed tags: (RnB Ver.), [Live], 【翻唱】, etc.
    .replace(/[\(\[【（\{][^\)\]】）\}]*?(版|ver\.?|version|cover|remix|翻唱|live|acoustic|edit|instrumental|remaster|rnb|r&b|dj|伴奏)[^\)\]】）\}]*?[\)\]】）\}]/gi, "")
    // 2. Dash/dot/pipe/slash separated suffixes: - rnb版, · R&B温柔男版, - Remix
    .replace(/\s*[-–—·・•|/~]\s*(rnb|r&b|jazz|lo-?fi|acoustic|cover|remix|live|版|翻唱|edit|instrumental|remaster|dj|伴奏|新版|男版|女版|温柔)[^\n]*/gi, "")
    // 3. Space followed by version keyword: " 心太软 RNB 温柔男版"
    .replace(/\s+(rnb|r&b|jazz|lo-?fi|acoustic|cover|remix|live|版|翻唱|edit|instrumental|remaster|dj|新版|男版|女版)[^\n]*/gi, "")
    // 4. Trailing separators & punctuation left over
    .replace(/[\s\-–—·・•|/~,，]+$/, "")
    .trim();
}

type LrclibGetResponse = {
  plainLyrics?: string;
  syncedLyrics?: string;
  instrumental?: boolean;
};

type LrclibSearchItem = LrclibGetResponse & {
  trackName: string;
  artistName: string;
  duration: number;
};

/** Attempt 1 & 2: exact /api/get with metadata */
async function fetchExact(
  signal: AbortSignal,
  artist: string,
  title: string,
  album: string,
  durationSec: number
): Promise<LrclibGetResponse | null> {
  try {
    const params = new URLSearchParams({
      artist_name: artist,
      track_name: title,
    });
    if (album) params.set("album_name", album);
    if (durationSec > 0) params.set("duration", String(Math.round(durationSec)));

    // Do NOT send custom User-Agent in browser fetch — browser blocks it via CORS preflight
    const res = await fetch(`https://lrclib.net/api/get?${params}`, { signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (signal.aborted) throw err;
    return null;
  }
}

/** Attempt 3: fuzzy /api/search by title only — cover artists won't exist in LRCLIB,
 *  so we drop artist_name here and match on the clean original title. */
async function fetchSearch(
  signal: AbortSignal,
  title: string
): Promise<LrclibGetResponse | null> {
  try {
    const params = new URLSearchParams({ track_name: title });
    // Do NOT send custom User-Agent in browser fetch — browser blocks it via CORS preflight
    const res = await fetch(`https://lrclib.net/api/search?${params}`, { signal });
    if (!res.ok) return null;
    const results: LrclibSearchItem[] = await res.json();
    if (!results?.length) return null;
    // Prefer a result that has synced lyrics, otherwise take first with any lyrics
    const withSynced = results.find(r => r.syncedLyrics?.trim());
    const withPlain = results.find(r => r.plainLyrics?.trim());
    return withSynced ?? withPlain ?? null;
  } catch (err) {
    if (signal.aborted) throw err;
    return null;
  }
}

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

    (async () => {
      try {
        const durationSec = trackDuration / 1000;
        let isFallback = false;
        const cleanTitle = stripVersionSuffix(title) || title;
        const titleChanged = cleanTitle !== title;

        // Attempt 1: exact match with original title + artist
        let body = await fetchExact(controller.signal, artist, title, album, durationSec);

        // Attempt 2: exact match with cleaned title + artist (without album/duration constraint)
        if (!body && titleChanged) {
          body = await fetchExact(controller.signal, artist, cleanTitle, "", 0);
        }

        // Attempt 3: fuzzy search by title without artist — handles covers where
        // the performer on Spotify is unknown to LRCLIB, but original song exists
        if (!body) {
          body = await fetchSearch(controller.signal, cleanTitle);
          if (!body && titleChanged) {
            body = await fetchSearch(controller.signal, title);
          }
          if (body) isFallback = true; // came from fallback search
        }

        if (controller.signal.aborted) return;

        const safeBody = body ?? { plainLyrics: "" };
        // If this is a fallback result, skip synced lines — timestamps belong to
        // the original recording, not this cover/remix version.
        const lines = isFallback ? [] : parseSyncedLyrics(safeBody.syncedLyrics || "");
        const value: Lyrics = {
          lines,
          plain: safeBody.plainLyrics || lines.map(line => line.text).join("\n"),
          instrumental: !!safeBody.instrumental,
          isFallback,
        };
        if (cache.size >= 50) cache.delete(cache.keys().next().value!);
        cache.set(key, value);
        setResult({ key, data: value });
      } catch (reason: unknown) {
        if (!controller.signal.aborted) setError((reason as Error).message);
      }
    })();

    return () => controller.abort();
  }, [active, key, trackId, artist, title, album, trackDuration, retry]);

  const hasLyrics = !!data && !data.instrumental && (data.lines.some(line => line.text.trim()) || !!data.plain.trim());
  return { data, error, hasLyrics, isFallback: data?.isFallback ?? false, retry: () => setRetry(value => value + 1) };
}
