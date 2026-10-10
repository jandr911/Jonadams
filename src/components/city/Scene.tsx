"use client";

import { Preload } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, PMREMGenerator, Scene as ThreeScene, Texture } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Aircraft from "./Aircraft";
import Buildings from "./Buildings";
import CameraRig from "./CameraRig";
import DetailCull from "./DetailCull";
import Details from "./Details";
import Suburbs from "./Suburbs";
import { useDayNight } from "./DayNightContext";
import Effects from "./Effects";
import Ground from "./Ground";
import HoloBillboards from "./HoloBillboards";
import Landmarks from "./Landmarks";
import { requestShadowUpdate, setShadowManual } from "./mirrorRender";
import PeopleMover from "./PeopleMover";
import Roads from "./Roads";
import Sky from "./Sky";
import SkyTraffic from "./SkyTraffic";
import Steam from "./Steam";
import Traffic from "./Traffic";
import { TreeWind } from "./TreeStand";
import Watercraft from "./Watercraft";

function applyEnvironment(scene: ThreeScene, tex: Texture | null) {
  scene.environment = tex;
}
function applyEnvironmentIntensity(scene: ThreeScene, v: number) {
  scene.environmentIntensity = v;
}

function Ambience() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const dn = useDayNight();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    applyEnvironment(scene, env);
    return () => {
      applyEnvironment(scene, null);
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    applyEnvironmentIntensity(scene, 0.1 + (1 - dn.night) * 0.5);
  }, [scene, dn.night]);
  return null;
}

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

function FirstFrames({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    frames.current += 1;
    if (frames.current !== 3) return;
    scene.traverse((o) => {
      if (o instanceof InstancedMesh && o.frustumCulled) o.computeBoundingSphere();
    });
    onReady();
  });
  return null;
}

export default function Scene({ onReady }: { onReady: () => void }) {
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
        <Aircraft />
        <SkyTraffic />
        <HoloBillboards />
        <Watercraft />
        <Details />
        <Steam />
        <Suburbs />
        <TreeWind />
        <Preload all />
        <FirstFrames onReady={onReady} />
      </Suspense>
      <Ambience />
      <CameraRig />
      <Effects />
      <ShadowThrottle />
      <DetailCull />
    </>
  );
}
