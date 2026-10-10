"use client";

import { Text } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CanvasTexture, Color, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import { useDayNight } from "./DayNightContext";
import { CITY_HALF_X, CITY_HALF_Z, CORNER_OFFSET, CROSSWALK_OFFSET, OUTER_HALF_X, OUTER_MIN_Z, PITCH, ROAD_HALF, STREETS_EW, STREETS_NS, WOODWARD_INDEX, nearIntersection, outerRoadLinesX, outerRoadLinesZ, roadLinesX, roadLinesZ } from "./layout";
import { DISPLAY_FONT } from "./NeonSign";

const EDGE_LINE = ROAD_HALF - 0.4;
const EDGE_LEN = PITCH - 2 * (ROAD_HALF + 1);
const STRIPES = Math.floor((ROAD_HALF - 0.6) / 1.1);

function LaneDashes() {
  const ref = useRef<InstancedMesh>(null);
  const dn = useDayNight();
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    const step = 4.5;
    for (const x of outerRoadLinesX()) {
      for (let z = OUTER_MIN_Z + 2; z < CITY_HALF_Z - 2; z += step) {
        if (nearIntersection(z, CITY_HALF_Z)) continue;
        out.push({ x, z, rot: 0 });
      }
    }
    for (const z of outerRoadLinesZ()) {
      for (let x = -OUTER_HALF_X + 2; x < OUTER_HALF_X - 2; x += step) {
        if (nearIntersection(x, CITY_HALF_X)) continue;
        out.push({ x, z, rot: Math.PI / 2 });
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 0.03, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.28, 0.04, 2.2]} />
      <meshStandardMaterial color="#e6d98a" emissive="#ffb84a" emissiveIntensity={0.35 + dn.night * 1.3} roughness={0.8} toneMapped={false} />
    </instancedMesh>
  );
}

function EdgeLines() {
  const ref = useRef<InstancedMesh>(null);
  const dn = useDayNight();
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; z: number; rot: number; len: number }[] = [];
    const xs = outerRoadLinesX();
    const zs = outerRoadLinesZ();
    for (const x of xs) {
      for (let i = 0; i < zs.length - 1; i++) {
        const z = (zs[i] + zs[i + 1]) / 2;
        out.push({ x: x + EDGE_LINE, z, rot: 0, len: EDGE_LEN });
        out.push({ x: x - EDGE_LINE, z, rot: 0, len: EDGE_LEN });
      }
    }
    for (const z of zs) {
      for (let i = 0; i < xs.length - 1; i++) {
        const x = (xs[i] + xs[i + 1]) / 2;
        out.push({ x, z: z + EDGE_LINE, rot: Math.PI / 2, len: EDGE_LEN });
        out.push({ x, z: z - EDGE_LINE, rot: Math.PI / 2, len: EDGE_LEN });
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 0.03, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(1, 1, it.len);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.18, 0.03, 1]} />
      <meshStandardMaterial color="#d9d6cc" emissive="#49f2d6" emissiveIntensity={0.35 + dn.night * 1.3} roughness={0.8} toneMapped={false} />
    </instancedMesh>
  );
}

function Crosswalks() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    for (const x of outerRoadLinesX()) {
      for (const z of outerRoadLinesZ()) {
        for (let k = -STRIPES; k <= STRIPES; k++) {
          out.push({ x: x + k * 1.1, z: z + CROSSWALK_OFFSET, rot: 0 });
          out.push({ x: x + k * 1.1, z: z - CROSSWALK_OFFSET, rot: 0 });
          out.push({ x: x + CROSSWALK_OFFSET, z: z + k * 1.1, rot: Math.PI / 2 });
          out.push({ x: x - CROSSWALK_OFFSET, z: z + k * 1.1, rot: Math.PI / 2 });
        }
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 0.025, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.5, 0.03, 1.6]} />
      <meshStandardMaterial color="#d9d6cc" roughness={0.8} />
    </instancedMesh>
  );
}

function makePoolTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,214,140,0.85)");
  g.addColorStop(0.35, "rgba(255,200,120,0.35)");
  g.addColorStop(1, "rgba(255,190,110,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

function LightPools({ items }: { items: { x: number; z: number }[] }) {
  const dn = useDayNight();
  const ref = useRef<InstancedMesh>(null);
  const poolMat = useRef<MeshBasicMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const texture = useMemo(() => makePoolTexture(), []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 0.06, it.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(9, 9, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  useEffect(() => {
    if (poolMat.current) poolMat.current.opacity = 0.55 * dn.night;
  }, [dn]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={poolMat} map={texture} transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
}

function Streetlights() {
  const dn = useDayNight();
  const poles = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const headMat = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (const x of outerRoadLinesX()) {
      for (const z of outerRoadLinesZ()) {
        out.push({ x: x + CORNER_OFFSET, z: z + CORNER_OFFSET });
        out.push({ x: x - CORNER_OFFSET, z: z - CORNER_OFFSET });
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const p = poles.current;
    const h = heads.current;
    if (!p || !h) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 3.2, it.z);
      dummy.updateMatrix();
      p.setMatrixAt(i, dummy.matrix);
      dummy.position.set(it.x, 6.3, it.z);
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
    });
    p.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  useEffect(() => {
    if (!headMat.current) return;
    headMat.current.emissiveIntensity = 0.1 + dn.night * 1.2;
    headMat.current.color.set(new Color("#ffffff").lerp(new Color("#ffd27a"), dn.night));
  }, [dn]);
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, items.length]}>
        <cylinderGeometry args={[0.12, 0.16, 6.4, 6]} />
        <meshStandardMaterial color="#4d4f4f" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, items.length]}>
        <sphereGeometry args={[0.36, 6, 4]} />
        <meshStandardMaterial
          ref={headMat}
          color="#ffd27a"
          emissive="#ffc96a"
          emissiveIntensity={2}
          roughness={0.3}
        />
      </instancedMesh>
      <LightPools items={items} />
    </group>
  );
}

function WoodwardMedian() {
  const x = roadLinesX()[WOODWARD_INDEX];
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const zs = roadLinesZ();
  const segments = useMemo(() => {
    const out: { z: number; len: number }[] = [];
    for (let i = 0; i < zs.length - 1; i++) out.push({ z: (zs[i] + zs[i + 1]) / 2, len: PITCH - 12 });
    return out;
  }, [zs]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    segments.forEach((s, i) => {
      dummy.position.set(x, 0.12, s.z);
      dummy.scale.set(1, 1, s.len);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [segments, dummy, x]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, segments.length]}>
      <boxGeometry args={[1.2, 0.24, 1]} />
      <meshStandardMaterial color="#77746c" roughness={0.9} />
    </instancedMesh>
  );
}

function StreetSign({ position, rotation, text }: { position: [number, number, number]; rotation: number; text: string }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4.6, 0.9, 0.12]} />
        <meshStandardMaterial color="#1f6b3a" roughness={0.6} />
      </mesh>
      <Text font={DISPLAY_FONT} fontSize={0.62} color="#ffffff" anchorX="center" anchorY="middle" position={[0, 0, 0.08]} letterSpacing={0.06}>
        {text.toUpperCase()}
      </Text>
      <Text font={DISPLAY_FONT} fontSize={0.62} color="#ffffff" anchorX="center" anchorY="middle" position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]} letterSpacing={0.06}>
        {text.toUpperCase()}
      </Text>
    </group>
  );
}

function StreetSigns() {
  const xs = roadLinesX();
  const zs = roadLinesZ();
  const signs = useMemo(() => {
    const out: { position: [number, number, number]; rotation: number; text: string }[] = [];
    const wx = xs[WOODWARD_INDEX];
    zs.forEach((z, i) => {
      out.push({ position: [wx + CORNER_OFFSET, 4.6, z + CORNER_OFFSET], rotation: 0, text: STREETS_EW[i] });
      out.push({ position: [wx + CORNER_OFFSET, 3.6, z + CORNER_OFFSET], rotation: Math.PI / 2, text: STREETS_NS[WOODWARD_INDEX] });
    });
    const jz = zs[zs.length - 1];
    xs.forEach((x, i) => {
      if (i === WOODWARD_INDEX) return;
      out.push({ position: [x - CORNER_OFFSET, 4.6, jz - CORNER_OFFSET], rotation: Math.PI / 2, text: STREETS_NS[i] });
      out.push({ position: [x - CORNER_OFFSET, 3.6, jz - CORNER_OFFSET], rotation: 0, text: STREETS_EW[STREETS_EW.length - 1] });
    });
    return out;
  }, [xs, zs]);
  return (
    <group>
      {signs.map((s, i) => (
        <group key={i}>
          <mesh position={[s.position[0], 2.4, s.position[2]]}>
            <cylinderGeometry args={[0.08, 0.08, 4.8, 5]} />
            <meshStandardMaterial color="#4d4f4f" />
          </mesh>
          <StreetSign {...s} />
        </group>
      ))}
    </group>
  );
}

export default function Roads() {
  return (
    <group>
      <LaneDashes />
      <EdgeLines />
      <Crosswalks />
      <Streetlights />
      <WoodwardMedian />
      <StreetSigns />
    </group>
  );
}
