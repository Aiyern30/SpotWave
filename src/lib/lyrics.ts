export type LyricsLine = { time: number; text: string };

export function parseSyncedLyrics(lrc: string): LyricsLine[] {
  const offset = Number(lrc.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0);
  const lines: LyricsLine[] = [];
  for (const row of lrc.split(/\r?\n/)) {
    const stamps = [...row.matchAll(/\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g)];
    const text = row.replace(/\[[^\]]*\]/g, "").trim();
    for (const stamp of stamps) {
      const time = (Number(stamp[1]) * 60 + Number(stamp[2])) * 1000 + Number((stamp[3] || "0").padEnd(3, "0")) - offset;
      // Empty timed lines mark instrumental breaks and must not be discarded.
      lines.push({ time, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function lyricIndexAt(lines: LyricsLine[], position: number): number {
  let low = 0, high = lines.length - 1, result = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].time <= position) { result = middle; low = middle + 1; }
    else high = middle - 1;
  }
  return result;
}

export function estimateLyricPosition(position: number, sampledAt: number, now: number, running: boolean, duration: number): number {
  const elapsed = running ? Math.min(Math.max(0, now - sampledAt), 5000) : 0;
  return Math.max(0, Math.min(duration, position + elapsed));
}
