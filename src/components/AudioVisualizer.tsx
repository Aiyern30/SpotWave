"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

type Props = {
  analyser: AnalyserNode | null;
  captureAnalyser: MutableRefObject<AnalyserNode | null>;
  captured: boolean;
  playing: boolean;
  reducedMotion: boolean;
  color: string;
  sensitivity: number;
  detail: number;
};
type Mode = "Orbit" | "Ribbons" | "Spectrum";

/** Canvas owns animation state so audio frames never rerender the player. */
export default function AudioVisualizer(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const latest = useRef(props);
  const [mode, setMode] = useState<Mode>("Orbit");
  useEffect(() => { latest.current = props; });

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d");
    if (!ctx) return;
    let width = 1, height = 1, ratio = 1, frame = 0, last = 0, time = 0;
    let visible = true;
    let samples = new Uint8Array(128);
    const bands = new Float32Array(96);
    const pulses: { age: number; strength: number }[] = [];
    let bassAverage = 0, cooldown = 0, silentFor = 0;
    let previousSource: AnalyserNode | null = null;

    const draw = (stamp: number) => {
      frame = 0;
      const p = latest.current;
      const moving = !p.reducedMotion && (p.playing || p.captured);
      const dt = Math.min((stamp - (last || stamp)) / 1000, .05);
      last = stamp;
      if (moving) time += dt;
      // Automatic mode never depends on access to Spotify's protected audio.
      const analyser = p.captured ? p.captureAnalyser.current : null;
      if (analyser !== previousSource) { bands.fill(0); silentFor = 0; previousSource = analyser; }
      if (analyser) {
        if (samples.length !== analyser.frequencyBinCount) samples = new Uint8Array(analyser.frequencyBinCount);
        try { analyser.getByteFrequencyData(samples); }
        catch { samples.fill(0); }
      } else samples.fill(0);
      let sum = 0;
      for (const value of samples) sum += value;
      const live = sum > 0;
      silentFor = live ? 0 : silentFor + dt;
      const ambient = !p.captured;
      const label = p.reducedMotion ? "Reduced motion" : !moving ? "Paused" : p.captured
        ? (silentFor > 1 ? "Listening for audio" : "Live audio") : live ? "Live audio" : "Automatic animation";
      if (status.current && status.current.textContent !== label) status.current.textContent = label;
      const smoothing = moving ? 1 - Math.exp(-dt * 12) : 1;
      let bass = 0;
      for (let i = 0; i < bands.length; i++) {
        // Logarithmic spacing gives bass and midrange room instead of over-weighting treble.
        const index = Math.min(samples.length - 1, Math.floor(Math.pow(samples.length, i / bands.length) - 1));
        // Deliberately generated movement, not a claim of beat detection.
        const swell = .5 + .5 * Math.sin(time * 1.8);
        const simulated = .24 + .22 * swell + .16 * Math.sin(time * 2.2 + i * .16) + .1 * Math.sin(time * .9 - i * .29);
        const target = !moving ? .08 : ambient ? simulated : samples[index] / 255;
        bands[i] += (Math.min(1, target * p.sensitivity * .7) - bands[i]) * smoothing;
        if (i < 18) bass += bands[i] / 18;
      }
      cooldown -= dt;
      if (moving && ((live && bass > bassAverage + .09) || (ambient && Math.sin(time * 1.8) > .98)) && cooldown <= 0) {
        pulses.push({ age: 0, strength: bass });
        if (pulses.length > p.detail) pulses.shift();
        cooldown = ambient ? 1.5 : .3;
      }
      bassAverage += (bass - bassAverage) * (1 - Math.exp(-dt * 2));
      const rgb = /^#[0-9a-f]{6}$/i.test(p.color) ? [1, 3, 5].map(i => parseInt(p.color.slice(i, i + 2), 16)).join(",") : "34,197,94";
      const tint = (alpha: number) => `rgba(${rgb},${alpha})`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);
      const cx = width / 2, cy = height / 2;
      const size = Math.min(width, height) * .34;
      const atmosphere = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * .55);
      atmosphere.addColorStop(0, tint(.09 + bass * .07));
      atmosphere.addColorStop(1, tint(0));
      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, width, height);
      ctx.lineCap = "round";

      if (mode === "Orbit") {
        // Nested organic contours: a low-frequency core with detailed outer harmonics.
        for (let layer = 0; layer < 7; layer++) {
          ctx.beginPath();
          for (let i = 0; i <= 192; i++) {
            const angle = i / 192 * Math.PI * 2;
            const band = bands[Math.floor((i % 192) / 192 * 96)];
            const radius = size * (.48 + layer * .065 + band * .17 + bass * .08)
              + Math.sin(angle * 3 + time * .25 + layer * .4) * size * .04;
            const x = cx + Math.cos(angle + time * .04) * radius;
            const y = cy + Math.sin(angle + time * .04) * radius * (.85 + layer * .025);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = layer === 6 ? "rgba(244,244,245,.7)" : tint(.16 + layer * .1);
          ctx.lineWidth = layer === 6 ? 1.4 : 1;
          ctx.stroke();
        }
        for (let i = 0; i < p.detail * 10; i++) {
          const angle = i * 2.39996 + time * .045;
          const radius = size * (1 + (i % 13) / 30) + bands[i % 96] * size * .1;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * .65, i % 7 === 0 ? 1.6 : .7, 0, Math.PI * 2);
          ctx.fillStyle = tint(.25 + bands[i % 96] * .55);
          ctx.fill();
        }
      } else if (mode === "Ribbons") {
        for (let layer = 0; layer < 12; layer++) {
          ctx.beginPath();
          for (let i = 0; i <= 160; i++) {
            const u = i / 160;
            const envelope = Math.sin(u * Math.PI);
            const amplitude = bands[Math.min(95, Math.floor(u * 96))];
            const y = cy + (layer - 5.5) * size * .045 + envelope * size *
              (Math.sin(u * 9 - time * .65 + layer * .2) * (.18 + amplitude * .8)
              + Math.cos(u * 15 + time * .4) * .1);
            if (!i) ctx.moveTo(width * .04, y); else ctx.lineTo(width * (.04 + u * .92), y);
          }
          ctx.strokeStyle = layer === 6 ? "rgba(244,244,245,.8)" : tint(.12 + (1 - Math.abs(layer - 5.5) / 6) * .6);
          ctx.lineWidth = layer === 6 ? 2 : 1;
          ctx.stroke();
        }
      } else {
        const count = width < 600 ? 48 : 96;
        const step = width * .86 / count;
        for (let i = 0; i < count; i++) {
          const energy = bands[Math.floor(i / count * 96)];
          const bar = Math.max(3, energy * height * .56);
          const x = width * .07 + i * step;
          const gradient = ctx.createLinearGradient(0, cy - bar / 2, 0, cy + bar / 2);
          gradient.addColorStop(0, "rgba(244,244,245,.8)");
          gradient.addColorStop(.3, tint(.9));
          gradient.addColorStop(1, tint(.15));
          ctx.fillStyle = gradient;
          ctx.fillRect(x, cy - bar / 2, Math.max(2, step * .5), bar);
        }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        pulse.age += moving ? dt : 0;
        if (pulse.age > 2) { pulses.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(cx, cy, size * (.75 + pulse.age * .5), 0, Math.PI * 2);
        ctx.strokeStyle = tint((1 - pulse.age / 2) * .16 * pulse.strength);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (moving && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      restart();
    });
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); });
    intersection.observe(element);
    document.addEventListener("visibilitychange", restart);
    restart();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); document.removeEventListener("visibilitychange", restart); };
  }, [mode, props.playing, props.captured, props.reducedMotion, props.color]);

  return <div className="relative h-full w-full overflow-hidden rounded-2xl">
    <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label={`${mode} music visualization`} role="img" />
    <div className="absolute inset-x-3 top-3 flex justify-center gap-1" role="group" aria-label="Visualization style">
      {(["Orbit", "Ribbons", "Spectrum"] as const).map(value => <button key={value} onClick={() => setMode(value)} aria-pressed={mode === value}
        className={`min-h-10 rounded-full border px-4 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${mode === value ? "border-brand/40 bg-zinc-900 text-zinc-100" : "border-white/10 bg-zinc-950/90 text-zinc-400 hover:text-zinc-100"}`}>{value}</button>)}
    </div>
    <span ref={status} className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-950/90 px-3 py-1.5 text-xs text-zinc-400">Ambient animation</span>
  </div>;
}
