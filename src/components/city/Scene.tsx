"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { InstancedMesh, Light, Mesh, PMREMGenerator, Scene as ThreeScene, Texture, WebGLRenderTarget, type Material, type Object3D } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Aircraft from "./Aircraft";
import AlterEgo from "./AlterEgo";
import StageBoundary from "./StageBoundary";
import { batchVariantProbes } from "./batching";
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
import { WARM_LAYER } from "./layers";
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
const WARM_SLICE_MS = 12;

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

function withHiddenShown(root: Object3D, run: () => void) {
  const hidden: Object3D[] = [];
  root.traverse((o) => {
    if (o.visible) return;
    hidden.push(o);
    o.visible = true;
  });
  try {
    run();
  } finally {
    for (const o of hidden) o.visible = false;
  }
}

function unwarmedParts(scene: Object3D, seen: Set<Object3D>) {
  const parts: Object3D[] = [];
  for (const child of scene.children) {
    const units = "material" in child || child.children.length === 0 ? [child] : child.children;
    for (const unit of units) {
      if (seen.has(unit)) continue;
      seen.add(unit);
      parts.push(unit);
    }
  }
  return parts;
}

function WarmShaders({ onWarm }: { onWarm: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const seen = new Set<Object3D>();
    let queue: Object3D[] = [];
    let probes: Object3D | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let autoUpdate = scene.matrixWorldAutoUpdate;
    const lights: Object3D[] = [];
    const target = new WebGLRenderTarget(1, 1);
    const endDrawing = () => {
      scene.matrixWorldAutoUpdate = autoUpdate;
      for (const o of lights) o.layers.disable(WARM_LAYER);
      lights.length = 0;
      if (probes) scene.remove(probes);
    };
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      endDrawing();
      target.dispose();
      onWarm();
    };
    const giveUp = setTimeout(finish, WARM_LIMIT_MS);
    const offscreen = (run: () => void) => {
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      try {
        withHiddenShown(scene, run);
      } finally {
        gl.setRenderTarget(previous);
      }
    };
    const compilePart = (part: Object3D) => {
      try {
        gl.compile(part, camera, scene);
      } catch (error) {
        console.error("Shader warm-up failed for part of the city", error);
      }
    };
    // ANGLE's Direct3D backend compiles shader variants at the first draw, not at link, so each part is drawn once offscreen.
    const drawPart = (part: Object3D) => {
      const drawn: Object3D[] = [];
      const culled: Object3D[] = [];
      part.traverse((o) => {
        if (!("material" in o)) return;
        o.layers.enable(WARM_LAYER);
        drawn.push(o);
        if (o.frustumCulled) {
          o.frustumCulled = false;
          culled.push(o);
        }
      });
      if (drawn.length === 0) return;
      const mask = camera.layers.mask;
      camera.layers.set(WARM_LAYER);
      try {
        gl.render(scene, camera);
      } catch (error) {
        console.error("Shader warm-up draw failed for part of the city", error);
      } finally {
        camera.layers.mask = mask;
        for (const o of drawn) o.layers.disable(WARM_LAYER);
        for (const o of culled) o.frustumCulled = true;
      }
    };
    const drawStep = () => {
      if (cancelled) return;
      if (queue.length === 0) {
        queue = unwarmedParts(scene, seen);
        if (queue.length === 0) return finish();
        offscreen(() => queue.forEach(compilePart));
      }
      const start = performance.now();
      offscreen(() => {
        while (queue.length > 0 && performance.now() - start < WARM_SLICE_MS) drawPart(queue.shift() as Object3D);
      });
      timer = setTimeout(drawStep, 0);
    };
    const startDrawing = () => {
      if (cancelled) return;
      scene.updateMatrixWorld();
      autoUpdate = scene.matrixWorldAutoUpdate;
      scene.matrixWorldAutoUpdate = false;
      scene.traverse((o) => {
        if (!(o instanceof Light)) return;
        o.layers.enable(WARM_LAYER);
        lights.push(o);
      });
      queue = [...(probes?.children ?? []), ...seen];
      if (probes) scene.add(probes);
      timer = setTimeout(drawStep, 0);
    };
    const step = () => {
      if (cancelled) return;
      if (queue.length === 0) queue = unwarmedParts(scene, seen);
      if (queue.length === 0 && !probes) {
        probes = batchVariantProbes();
        queue = [...probes.children];
      }
      if (queue.length === 0) {
        if (!gl.extensions.has("KHR_parallel_shader_compile")) return startDrawing();
        const variants = probes;
        offscreen(() => {
          const ready = [gl.compileAsync(scene, camera)];
          if (variants) ready.push(gl.compileAsync(variants, camera, scene));
          Promise.all(ready).then(startDrawing, startDrawing);
        });
        return;
      }
      const start = performance.now();
      offscreen(() => {
        while (queue.length > 0 && performance.now() - start < WARM_SLICE_MS) compilePart(queue.shift() as Object3D);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      endDrawing();
      target.dispose();
      probes?.traverse((o) => {
        if (o instanceof Mesh) (o.material as Material).dispose();
      });
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
