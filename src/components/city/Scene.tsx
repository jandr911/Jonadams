"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { InstancedMesh, PMREMGenerator, Scene as ThreeScene, Texture, WebGLRenderTarget, type Object3D } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Aircraft from "./Aircraft";
import AlterEgo from "./AlterEgo";
import StageBoundary from "./StageBoundary";
import Buildings from "./Buildings";
import DetailCull from "./DetailCull";
import Details from "./Details";
import Suburbs from "./Suburbs";
import { useDayNight } from "./DayNightContext";
import Effects from "./Effects";
import Ground from "./Ground";
import HoloBillboards from "./HoloBillboards";
import HologramClock from "./HologramClock";
import Landmarks from "./Landmarks";
import PeopleMover from "./PeopleMover";
import Roads from "./Roads";
import Sky from "./Sky";
import SkyTraffic from "./SkyTraffic";
import StaticBatch from "./StaticBatch";
import Steam from "./Steam";
import Traffic from "./Traffic";
import { TreeWind } from "./TreeStand";
import { WindowClock } from "./useWindowMaterial";
import Watercraft from "./Watercraft";

const WARM_LIMIT_MS = 8000;

function ignoreFailure() {}

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
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
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

function WarmShaders({ onWarm }: { onWarm: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    const warm = () => {
      if (!cancelled) onWarm();
    };
    const giveUp = setTimeout(warm, WARM_LIMIT_MS);
    const raf = requestAnimationFrame(() => {
      const hidden: Object3D[] = [];
      scene.traverse((o) => {
        if (o.visible) return;
        hidden.push(o);
        o.visible = true;
      });
      const target = new WebGLRenderTarget(1, 1);
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      try {
        gl.compileAsync(scene, camera).then(warm);
      } finally {
        gl.setRenderTarget(previous);
        target.dispose();
        for (const o of hidden) o.visible = false;
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      cancelAnimationFrame(raf);
    };
  }, [gl, scene, camera, onWarm]);
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

export default function Scene({ live, onWarm, onReady }: { live: boolean; onWarm: () => void; onReady: () => void }) {
  const dn = useDayNight();
  return (
    <>
      <fog attach="fog" args={[dn.fog, 420 + dn.night * 60, 1250 + dn.night * 150]} />
      <ambientLight intensity={dn.ambient * 0.6} color={dn.hemiSky} />
      <hemisphereLight args={[dn.hemiSky, dn.hemiGround, dn.ambient * 1.6]} />
      <directionalLight
        position={dn.sunDir.map((v) => v * 300) as [number, number, number]}
        intensity={dn.sunIntensity}
        color={dn.sunColor}
      />
      <Suspense fallback={null}>
        <Sky />
        <StaticBatch label="ground">
          <Ground />
        </StaticBatch>
        <StaticBatch label="roads">
          <Roads />
        </StaticBatch>
        <Buildings />
        <StaticBatch label="landmarks">
          <Landmarks />
        </StaticBatch>
        <StaticBatch label="people-mover">
          <PeopleMover />
        </StaticBatch>
        <Traffic />
        <StaticBatch label="aircraft">
          <Aircraft />
        </StaticBatch>
        {live && (
          <StageBoundary name="The alter ego" fallback={null} onFail={ignoreFailure}>
            <Suspense fallback={null}>
              <AlterEgo />
            </Suspense>
          </StageBoundary>
        )}
        <SkyTraffic />
        <HoloBillboards />
        <StaticBatch label="watercraft">
          <Watercraft />
        </StaticBatch>
        <StaticBatch label="details">
          <Details />
        </StaticBatch>
        <Steam />
        <StaticBatch label="suburbs">
          <Suburbs />
        </StaticBatch>
        <TreeWind />
        <WarmShaders onWarm={onWarm} />
        <FirstFrames onReady={onReady} />
      </Suspense>
      <Ambience />
      <HologramClock />
      <WindowClock />
      <Effects />
      <DetailCull />
    </>
  );
}
