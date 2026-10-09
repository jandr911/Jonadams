"use client";

import { Preload } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Color } from "three";
import Blimp from "./Blimp";
import Buildings from "./Buildings";
import CameraRig from "./CameraRig";
import Details from "./Details";
import Suburbs from "./Suburbs";
import { useDayNight } from "./DayNightContext";
import Effects from "./Effects";
import Ground from "./Ground";
import Landmarks from "./Landmarks";
import { requestShadowUpdate, setShadowManual } from "./mirrorRender";
import PeopleMover from "./PeopleMover";
import Roads from "./Roads";
import Sky from "./Sky";
import Traffic from "./Traffic";

function ShadowThrottle() {
  const gl = useThree((s) => s.gl);
  const frame = useRef(0);
  useEffect(() => setShadowManual(gl), [gl]);
  useFrame(() => {
    frame.current += 1;
    if (frame.current % 6 === 0) requestShadowUpdate(gl);
  }, -2);
  return null;
}

export default function Scene() {
  const dn = useDayNight();
  const fogColor = useMemo(() => new Color().copy(dn.fog), [dn.fog]);
  return (
    <>
      <fog attach="fog" args={[fogColor, 420 + dn.night * 60, 1250 + dn.night * 150]} />
      <ambientLight intensity={dn.ambient * 0.6} color={dn.hemiSky} />
      <hemisphereLight args={[dn.hemiSky, dn.hemiGround, dn.ambient * 1.6]} />
      <directionalLight
        position={dn.sunDir.map((v) => v * 300) as [number, number, number]}
        intensity={dn.sunIntensity}
        color={dn.sunColor}
        castShadow={dn.night < 0.85}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.5}
        shadow-radius={3}
        shadow-camera-left={-190}
        shadow-camera-right={190}
        shadow-camera-top={190}
        shadow-camera-bottom={-190}
        shadow-camera-near={10}
        shadow-camera-far={700}
      />
      <Suspense fallback={null}>
        <Sky />
        <Ground />
        <Roads />
        <Buildings />
        <Landmarks />
        <PeopleMover />
        <Traffic />
        <Blimp />
        <Details />
        <Suburbs />
        <Preload all />
      </Suspense>
      <CameraRig />
      <Effects />
      <ShadowThrottle />
    </>
  );
}
