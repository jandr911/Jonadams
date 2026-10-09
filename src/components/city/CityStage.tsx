"use client";

import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { ACESFilmicToneMapping } from "three";
import Scene from "./Scene";

export default function CityStage({ onQuality }: { onQuality: (q: "high" | "low") => void }) {
  const [dpr, setDpr] = useState(1);
  return (
    <Canvas
      dpr={dpr}
      shadows
      camera={{ fov: 40, near: 1, far: 2600, position: [0, 80, 260] }}
      gl={{ antialias: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
      onCreated={({ gl }) => {
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __cityGL?: typeof gl }).__cityGL = gl;
        }
      }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          onQuality("low");
        }}
        onIncline={() => {
          setDpr(Math.min(1.25, window.devicePixelRatio));
          onQuality("high");
        }}
        ms={400}
        iterations={12}
        flipflops={2}
        bounds={() => [30, 60]}
        onFallback={() => {
          setDpr(1);
          onQuality("low");
        }}
      />
      <AdaptiveDpr />
      <Scene />
    </Canvas>
  );
}
