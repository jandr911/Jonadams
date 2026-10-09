"use client";

import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import Scene from "./Scene";

export default function CityStage({ onQuality, onReady }: { onQuality: (q: "high" | "low") => void; onReady: () => void }) {
  return (
    <Canvas
      dpr={1}
      shadows
      camera={{ fov: 40, near: 1, far: 2600, position: [0, 80, 260] }}
      gl={{ antialias: false, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
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
      <PerformanceMonitor
        onDecline={() => onQuality("low")}
        onIncline={() => onQuality("high")}
        ms={400}
        iterations={12}
        flipflops={2}
        bounds={() => [30, 60]}
        onFallback={() => onQuality("low")}
      />
      <AdaptiveDpr />
      <Scene onReady={onReady} />
    </Canvas>
  );
}
