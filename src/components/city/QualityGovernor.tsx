"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Quality } from "./CityContext";

const WINDOW_MS = 1000;
const SLOW_FPS = 30;
const RECOVER_FPS = 40;
const DROP_AFTER = 4;
const RISE_AFTER = 6;
const SETTLE_MS = 3000;
const STALL_MS = 250;
const RETRY_MS = 20000;
const FAILED_RISE_MS = 15000;
const MAX_FAILED_RISES = 3;

interface Governor {
  quality: Quality;
  windowStart: number;
  frames: number;
  last: number;
  slow: number;
  recover: number;
  quietUntil: number;
  retryAt: number;
  risenAt: number;
  failedRises: number;
}

function restartWindow(g: Governor, now: number) {
  g.windowStart = now;
  g.frames = 0;
}

function switchTo(g: Governor, quality: Quality, now: number) {
  g.quality = quality;
  g.slow = 0;
  g.recover = 0;
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
  g.recover = fps >= RECOVER_FPS ? g.recover + 1 : 0;
  if (g.quality === "high" && g.slow >= DROP_AFTER) {
    if (now - g.risenAt < FAILED_RISE_MS) g.failedRises += 1;
    g.retryAt = now + RETRY_MS * 2 ** g.failedRises;
    return switchTo(g, "low", now);
  }
  if (g.quality === "low" && g.recover >= RISE_AFTER && now >= g.retryAt && g.failedRises < MAX_FAILED_RISES) {
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
    recover: 0,
    quietUntil: 0,
    retryAt: 0,
    risenAt: -Infinity,
    failedRises: 0,
  });
  useFrame(() => {
    const next = sample(governor.current, performance.now(), live);
    if (next) onQuality(next);
  });
  return null;
}
