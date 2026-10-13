"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

const WINDOW_MS = 1000;
const SLOW_FPS = 26;
const DROP_AFTER = 4;
const SETTLE_MS = 3000;
const STALL_MS = 250;

interface Governor {
  dropped: boolean;
  windowStart: number;
  frames: number;
  last: number;
  slow: number;
  quietUntil: number;
}

function restartWindow(g: Governor, now: number) {
  g.windowStart = now;
  g.frames = 0;
}

function sample(g: Governor, now: number, live: boolean) {
  const gap = now - g.last;
  g.last = now;
  if (g.dropped) return false;
  if (!live) {
    g.quietUntil = now + SETTLE_MS;
    return false;
  }
  if (gap > STALL_MS || now < g.quietUntil) {
    restartWindow(g, now);
    return false;
  }
  g.frames += 1;
  const span = now - g.windowStart;
  if (span < WINDOW_MS) return false;
  const fps = (g.frames * 1000) / span;
  restartWindow(g, now);
  g.slow = fps < SLOW_FPS ? g.slow + 1 : 0;
  if (g.slow < DROP_AFTER) return false;
  g.dropped = true;
  return true;
}

export default function QualityGovernor({ live, onSlow }: { live: boolean; onSlow: () => void }) {
  const governor = useRef<Governor>({ dropped: false, windowStart: 0, frames: 0, last: 0, slow: 0, quietUntil: 0 });
  useFrame(() => {
    if (sample(governor.current, performance.now(), live)) onSlow();
  });
  return null;
}
