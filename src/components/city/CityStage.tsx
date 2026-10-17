"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { NoToneMapping, type Clock } from "three";
import CameraRig, { type CameraView } from "./CameraRig";
import type { Quality } from "./CityContext";
import QualityGovernor from "./QualityGovernor";
import Scene from "./Scene";

// Low tier only: windows over 1600x1000 (the 1440x900 Intel budget with headroom) render smaller and scale up.
const MAX_RENDER_PIXELS = 1_600_000;
const RESTORE_WAIT_MS = 3000;
const MAX_REBUILDS = 3;

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

function ContextWatch({ onRebuild }: { onRebuild: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const lost = () => {
      clearTimeout(fallback);
      fallback = setTimeout(onRebuild, RESTORE_WAIT_MS);
    };
    const restored = () => {
      clearTimeout(fallback);
      onRebuild();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      clearTimeout(fallback);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, onRebuild]);
  return null;
}

function CityStage({ live, active, quality, onSlow, onReady }: { live: boolean; active: boolean; quality: Quality; onSlow: () => void; onReady: () => void }) {
  const capped = useSyncExternalStore(subscribeResize, cappedDpr, serverDpr);
  const [warm, setWarm] = useState(false);
  const markWarm = useCallback(() => setWarm(true), []);
  const [generation, setGeneration] = useState(0);
  const resumeRef = useRef<CameraView | null>(null);
  const rebuild = useCallback(() => {
    setWarm(false);
    setGeneration((g) => g + 1);
  }, []);
  if (generation > MAX_REBUILDS) throw new Error("The WebGL context was lost repeatedly");
  return (
    <Canvas
      key={generation}
      frameloop={active && warm ? "always" : "never"}
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
      <ContextWatch onRebuild={rebuild} />
      <ClockKeeper active={active} />
      <QualityGovernor live={live} onSlow={onSlow} />
      <Scene live={live} onWarm={markWarm} onReady={onReady} />
      <CameraRig live={live} resumeRef={resumeRef} />
    </Canvas>
  );
}

export default memo(CityStage);
