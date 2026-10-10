"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SITE } from "@/content/site";

const VISITED_KEY = "city-visited";

function readVisited() {
  try {
    return sessionStorage.getItem(VISITED_KEY) === "1";
  } catch {
    return false;
  }
}

function createVisitedStore() {
  let cached: boolean | null = null;
  return {
    subscribe: () => () => {},
    getSnapshot: () => (cached ??= readVisited()),
    getServerSnapshot: () => false,
  };
}

export function useReturningVisitor() {
  const [store] = useState(createVisitedStore);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function markVisited() {
  try {
    sessionStorage.setItem(VISITED_KEY, "1");
  } catch {
    return;
  }
}

const RAMP_MS = 2800;
const QUICK_RAMP_MS = 700;
const STAGES: [number, string][] = [
  [30, "Lighting the skyline"],
  [62, "Warming up the neon"],
  [100, "Opening the doors"],
];
const BARS = [0.55, 0.9, 0.7, 1, 0.6, 0.85, 0.5];

const DETROIT_SKYLINE_FROM_WINDSOR = [
  [18, 7, 74], [62, 7, 74], [40, 30, 14], [100, 52, 46], [112, 28, 56], [160, 20, 14], [186, 26, 18], [218, 30, 22],
  [254, 22, 30], [284, 18, 40], [306, 14, 92], [310, 6, 100], [330, 12, 84], [350, 24, 36], [380, 22, 90], [386, 10, 96],
  [410, 18, 46], [432, 24, 100], [440, 8, 112], [466, 20, 58], [490, 28, 108], [492, 6, 122], [512, 6, 122],
  [528, 20, 82], [556, 18, 86], [582, 26, 44], [612, 24, 96], [640, 30, 136], [668, 24, 96], [596, 20, 104], [688, 20, 104],
  [722, 34, 26], [760, 26, 30], [792, 40, 18], [838, 30, 22], [874, 24, 16], [904, 5, 28], [920, 46, 12], [972, 28, 16],
];

function buildWindows() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = ["var(--gold-2)", "var(--gold-2)", "var(--gold-2)", "var(--cyan)", "var(--pink)", "var(--amber)"];
  const out: { x: number; y: number; c: string; d: number }[] = [];
  for (const [x, w, h] of DETROIT_SKYLINE_FROM_WINDSOR) {
    const cols = Math.max(1, Math.floor(w / 6));
    const rows = Math.max(1, Math.floor(h / 8));
    if (w < 8) continue;
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
      {DETROIT_SKYLINE_FROM_WINDSOR.map(([x, w, h], i) => (
        <rect key={i} x={x} y={160 - h} width={w} height={h} />
      ))}
      {WINDOWS.map((p, i) => (
        <rect key={i} className="loader__win" x={p.x} y={p.y} width={2.2} height={2.8} fill={p.c} style={{ animationDelay: `${p.d}s` }} />
      ))}
    </svg>
  );
}

export default function Loader({ ready, returning }: { ready: boolean; returning: boolean }) {
  const { progress: assets } = useProgress();
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const start = useRef(0);
  const assetsRef = useRef(0);
  const shownRef = useRef(0);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    start.current = performance.now();
    const rampMs = returning ? QUICK_RAMP_MS : RAMP_MS;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start.current) / rampMs);
      const ramp = (1 - Math.pow(1 - t, 3)) * 88;
      const target = ready ? 100 : Math.max(ramp, assetsRef.current * 0.88);
      const ease = ready ? 0.3 : 0.12;
      const p = shownRef.current;
      const next = target - p < 0.05 ? target : p + (target - p) * ease;
      shownRef.current = next;
      setShown(next);
      if (ready && next >= 100) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, returning]);

  useEffect(() => {
    if (!ready) return;
    const a = setTimeout(() => setDone(true), returning ? 120 : 500);
    const b = setTimeout(() => setGone(true), returning ? 900 : 2100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [ready, returning]);

  if (gone) return null;
  const pct = Math.round(shown);
  const welcome = returning ? "Welcome back" : "Welcome to the city";
  const stage = ready ? welcome : STAGES.find(([max]) => pct < max)?.[1] ?? "Opening the doors";

  return (
    <div className={`loader ${returning ? "loader--quick" : ""} ${done ? "is-done" : ""}`} aria-busy={!ready}>
      <span className="sr-only" role="status">
        {stage}
      </span>
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

      <span className="loader__corner loader__corner--tl" aria-hidden>
        <i className="loader__dot" />
        Est. {SITE.year} · {SITE.city}
      </span>
      <span className="loader__corner loader__corner--tr" aria-hidden>Now entering</span>

      <div className="loader__center" aria-hidden>
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

      <span className="loader__corner loader__corner--bl" aria-hidden>Music · Art · The Creatives</span>
      <span className="loader__corner loader__corner--br" aria-hidden>42.33° N, 83.05° W</span>
    </div>
  );
}
