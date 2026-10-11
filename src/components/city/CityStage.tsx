"use client";

import { Canvas } from "@react-three/fiber";
import { memo } from "react";
import { NoToneMapping } from "three";
import CameraRig from "./CameraRig";
import QualityGovernor from "./QualityGovernor";
import Scene from "./Scene";

function CityStage({ live, onQuality, onReady }: { live: boolean; onQuality: (q: "high" | "low") => void; onReady: () => void }) {
  return (
    <Canvas
      dpr={1}
      shadows
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
      <QualityGovernor live={live} onQuality={onQuality} />
      <Scene onReady={onReady} />
      <CameraRig live={live} />
    </Canvas>
  );
}

export default memo(CityStage);
