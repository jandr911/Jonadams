"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { NoToneMapping, type Clock } from "three";
import CameraRig from "./CameraRig";
import type { Quality } from "./CityContext";
import QualityGovernor from "./QualityGovernor";
import Scene from "./Scene";

// Low tier only: windows over 1600x1000 (the 1440x900 Intel budget with headroom) render smaller and scale up.
const MAX_RENDER_PIXELS = 1_600_000;

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

function cappedDpr() {
  return Math.min(1, Math.round(Math.sqrt(MAX_RENDER_PIXELS / (window.innerWidth * window.innerHeight)) * 100) / 100);
}

function serverDpr() {
  return 1;
}

function restoreElapsed(clock: Clock, elapsed: number) {
  clock.elapsedTime = elapsed;
}

function ClockKeeper({ active }: { active: boolean }) {
  const clock = useThree((s) => s.clock);
  const elapsed = useRef(0);
  useFrame(() => {
    elapsed.current = clock.elapsedTime;
  });
  useLayoutEffect(() => {
    if (active) restoreElapsed(clock, elapsed.current);
  }, [active, clock]);
  return null;
}

function CityStage({ live, active, quality, onSlow, onReady }: { live: boolean; active: boolean; quality: Quality; onSlow: () => void; onReady: () => void }) {
  const capped = useSyncExternalStore(subscribeResize, cappedDpr, serverDpr);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={quality === "low" ? capped : 1}
      camera={{ fov: 40, near: 1, far: 2600, position: [0, 80, 260] }}
      gl={{ antialias: false, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
      onCreated={({ gl, scene }) => {
        if (process.env.NODE_ENV !== "production") {
          const w = window as unknown as { __cityGL?: typeof gl; __cityScene?: typeof scene };
          w.__cityGL = gl;
          w.__cityScene = scene;
        }
      }}
    >
      <ClockKeeper active={active} />
      <QualityGovernor live={live} onSlow={onSlow} />
      <Scene onReady={onReady} />
      <CameraRig live={live} />
    </Canvas>
  );
}

export default memo(CityStage);
