"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/content/site";

const RAMP_MS = 2800;
const STAGES: [number, string][] = [
  [30, "Lighting the skyline"],
  [62, "Warming up the neon"],
  [100, "Opening the doors"],
];
const BARS = [0.55, 0.9, 0.7, 1, 0.6, 0.85, 0.5];

const SKYLINE = [
  [0, 46, 22], [26, 30, 40], [60, 24, 58], [88, 40, 34], [132, 18, 92], [154, 26, 70], [184, 34, 48],
  [222, 20, 118], [246, 28, 86], [278, 44, 62], [326, 16, 140], [346, 30, 104], [380, 24, 76], [408, 38, 54],
  [450, 20, 96], [474, 32, 128], [510, 26, 66], [540, 48, 40], [592, 18, 82], [614, 30, 112], [648, 24, 58],
  [676, 40, 36], [720, 22, 100], [746, 34, 72], [784, 28, 48], [816, 44, 30], [864, 20, 64], [888, 36, 44], [928, 72, 24],
];

function buildWindows() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = ["var(--gold-2)", "var(--gold-2)", "var(--gold-2)", "var(--cyan)", "var(--pink)", "var(--amber)"];
  const out: { x: number; y: number; c: string; d: number }[] = [];
  for (const [x, w, h] of SKYLINE) {
    const cols = Math.max(1, Math.floor(w / 6));
    const rows = Math.max(1, Math.floor(h / 8));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (rnd() > 0.28) continue;
        out.push({ x: x + 2 + i * 6, y: 160 - h + 3 + j * 8, c: colors[Math.floor(rnd() * colors.length)], d: rnd() * 4 });
      }
    }
  }
  return out;
}
const WINDOWS = buildWindows();

function buildStars() {
  let seed = 31;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 70 }, () => ({ x: rnd() * 1000, y: rnd() * 520, r: 0.5 + rnd() * 1.1, d: rnd() * 5, t: 2.5 + rnd() * 3 }));
}
const STARS = buildStars();

function Stars() {
  return (
    <svg className="loader__stars" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMin slice" aria-hidden>
      {STARS.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} style={{ animationDelay: `${p.d}s`, animationDuration: `${p.t}s` }} />
      ))}
    </svg>
  );
}

function Skyline({ mirror = false }: { mirror?: boolean }) {
  return (
    <svg className={mirror ? "loader__skyline loader__skyline--mirror" : "loader__skyline"} viewBox="0 0 1000 160" preserveAspectRatio="xMidYMax slice" aria-hidden>
      {SKYLINE.map(([x, w, h], i) => (
        <rect key={i} x={x} y={160 - h} width={w} height={h} />
      ))}
      {WINDOWS.map((p, i) => (
        <rect key={i} className="loader__win" x={p.x} y={p.y} width={2.2} height={2.8} fill={p.c} style={{ animationDelay: `${p.d}s` }} />
      ))}
    </svg>
  );
}

export default function Loader({ ready }: { ready: boolean }) {
  const { progress: assets } = useProgress();
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const start = useRef(0);
  const assetsRef = useRef(0);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    start.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start.current) / RAMP_MS);
      const ramp = (1 - Math.pow(1 - t, 3)) * 88;
      const target = ready ? 100 : Math.max(ramp, assetsRef.current * 0.88);
      const ease = ready ? 0.3 : 0.12;
      setShown((p) => (target - p < 0.05 ? target : p + (target - p) * ease));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const a = setTimeout(() => setDone(true), 500);
    const b = setTimeout(() => setGone(true), 2100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [ready]);

  if (gone) return null;
  const pct = Math.round(shown);
  const stage = ready ? "Welcome to the city" : STAGES.find(([max]) => pct < max)?.[1] ?? "Opening the doors";

  return (
    <div className={`loader ${done ? "is-done" : ""}`} role="status" aria-live="polite" aria-label={`Loading, ${pct} percent`}>
      <div className="loader__glow" />
      <Stars />
      <div className="loader__beam loader__beam--a" />
      <div className="loader__beam loader__beam--b" />
      <div className="loader__water">
        <Skyline mirror />
      </div>
      <Skyline />
      <div className="loader__horizon" />
      <div className="loader__vignette" />
      <div className="loader__grain" />
      <div className="loader__frame" />

      <span className="loader__corner loader__corner--tl">
        <i className="loader__dot" />
        Est. {SITE.year} · {SITE.city}
      </span>
      <span className="loader__corner loader__corner--tr">Now entering</span>

      <div className="loader__center">
        <span className="loader__eyebrow">{SITE.artist} presents</span>
        <div className="loader__title">
          <span style={{ animationDelay: "0.1s" }}>Adams</span>
          <span style={{ animationDelay: "0.3s" }}>UniverseCity</span>
        </div>
        <span className="loader__caps">A city built on music · Downtown Detroit</span>

        <div className="loader__eq" aria-hidden>
          {BARS.map((h, i) => (
            <i key={i} style={{ ["--h" as string]: h, animationDelay: `${i * 0.11}s` }} />
          ))}
        </div>

        <div className="loader__meter">
          <span className="loader__stage">{stage}</span>
          <span className="loader__pct">{pct}</span>
          <div className="loader__bar">
            <div style={{ width: `${shown}%` }} />
          </div>
        </div>
      </div>

      <span className="loader__corner loader__corner--bl">Music · Art · The Creatives</span>
      <span className="loader__corner loader__corner--br">42.33° N, 83.05° W</span>
    </div>
  );
}
