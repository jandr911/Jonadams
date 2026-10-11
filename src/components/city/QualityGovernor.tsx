"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { RENDER_CADENCE } from "./renderCadence";

type Quality = "high" | "low";

const WINDOW_MS = 1000;
const SLOW_FPS = 30;
const SMOOTH_FPS = 40;
const DROP_AFTER = 4;
const RISE_AFTER = 6;
const SETTLE_MS = 3000;
const STALL_MS = 250;
const RETRY_MS = 20000;
const FAILED_RISE_MS = 15000;
const MAX_FAILED_RISES = 3;
const HEADROOM_FPS = 75;
const STRAIN_DROP_FPS = 1.5;
const HEADROOM_AFTER = 10;
const STRAIN_AFTER = 2;

interface Governor {
  quality: Quality;
  windowStart: number;
  frames: number;
  last: number;
  slow: number;
  smooth: number;
  quietUntil: number;
  retryAt: number;
  risenAt: number;
  failedRises: number;
  headroom: number;
  strain: number;
  smoothBase: number;
  smoothSpent: boolean;
}

function setSmooth(g: Governor, on: boolean) {
  if (RENDER_CADENCE.smooth === on) return;
  RENDER_CADENCE.smooth = on;
  g.headroom = 0;
  g.strain = 0;
  if (!on) g.smoothSpent = true;
}

function judgeHeadroom(g: Governor, fps: number) {
  if (g.quality !== "high") return setSmooth(g, false);
  if (RENDER_CADENCE.smooth) {
    g.strain = fps < g.smoothBase - STRAIN_DROP_FPS ? g.strain + 1 : 0;
    if (g.strain >= STRAIN_AFTER) setSmooth(g, false);
    return;
  }
  g.smoothBase = fps >= HEADROOM_FPS ? (g.smoothBase * g.headroom + fps) / (g.headroom + 1) : 0;
  g.headroom = fps >= HEADROOM_FPS ? g.headroom + 1 : 0;
  if (g.headroom >= HEADROOM_AFTER && !g.smoothSpent) setSmooth(g, true);
}

function restartWindow(g: Governor, now: number) {
  g.windowStart = now;
  g.frames = 0;
}

function switchTo(g: Governor, quality: Quality, now: number) {
  g.quality = quality;
  g.slow = 0;
  g.smooth = 0;
  g.quietUntil = now + SETTLE_MS;
  restartWindow(g, now);
  return quality;
}

function sample(g: Governor, now: number, live: boolean): Quality | null {
  const gap = now - g.last;
  g.last = now;
  if (!live) {
    g.quietUntil = now + SETTLE_MS;
    return null;
  }
  if (gap > STALL_MS || now < g.quietUntil) {
    restartWindow(g, now);
    return null;
  }
  g.frames += 1;
  const span = now - g.windowStart;
  if (span < WINDOW_MS) return null;
  const fps = (g.frames * 1000) / span;
  restartWindow(g, now);
  g.slow = fps < SLOW_FPS ? g.slow + 1 : 0;
  g.smooth = fps >= SMOOTH_FPS ? g.smooth + 1 : 0;
  judgeHeadroom(g, fps);
  if (g.quality === "high" && g.slow >= DROP_AFTER) {
    setSmooth(g, false);
    if (now - g.risenAt < FAILED_RISE_MS) g.failedRises += 1;
    g.retryAt = now + RETRY_MS * 2 ** g.failedRises;
    return switchTo(g, "low", now);
  }
  if (g.quality === "low" && g.smooth >= RISE_AFTER && now >= g.retryAt && g.failedRises < MAX_FAILED_RISES) {
    g.risenAt = now;
    return switchTo(g, "high", now);
  }
  return null;
}

export default function QualityGovernor({ live, onQuality }: { live: boolean; onQuality: (q: Quality) => void }) {
  const governor = useRef<Governor>({
    quality: "high",
    windowStart: 0,
    frames: 0,
    last: 0,
    slow: 0,
    smooth: 0,
    quietUntil: 0,
    retryAt: 0,
    risenAt: -Infinity,
    failedRises: 0,
    headroom: 0,
    strain: 0,
    smoothBase: 0,
    smoothSpent: false,
  });
  useEffect(
    () => () => {
      RENDER_CADENCE.smooth = false;
    },
    [],
  );
  useFrame(() => {
    const next = sample(governor.current, performance.now(), live);
    if (next) onQuality(next);
  });
  return null;
}
