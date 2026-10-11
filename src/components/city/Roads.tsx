"use client";

import { Text } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { useDayNight } from "./DayNightContext";
import { CITY_HALF_X, CITY_HALF_Z, CORNER_OFFSET, CROSSWALK_OFFSET, OUTER_HALF_X, OUTER_MIN_Z, PITCH, ROAD_HALF, STREETS_EW, STREETS_NS, WOODWARD_INDEX, nearIntersection, outerRoadLinesX, outerRoadLinesZ, roadLinesX, roadLinesZ } from "./layout";
import { DISPLAY_FONT } from "./NeonSign";
import { fillInstances } from "./instancing";
import { makePoolTexture } from "./textures";

const EDGE_LINE = ROAD_HALF - 0.4;
const EDGE_LEN = PITCH - 2 * (ROAD_HALF + 1);
const STRIPES = Math.floor((ROAD_HALF - 0.6) / 1.1);
const ROAD_XS = roadLinesX();
const ROAD_ZS = roadLinesZ();

function LaneDashes() {
  const ref = useRef<InstancedMesh>(null);
  const dn = useDayNight();
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
    fillInstances(ref.current, items.length, (i, d) => {
      d.position.set(items[i].x, 0.03, items[i].z);
      d.rotation.set(0, items[i].rot, 0);
    });
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.28, 0.04, 2.2]} />
      <meshStandardMaterial color="#e6d98a" emissive="#ffb84a" emissiveIntensity={0.35 + dn.night * 1.3} roughness={0.8} />
    </instancedMesh>
  );
}

function EdgeLines() {
  const ref = useRef<InstancedMesh>(null);
  const dn = useDayNight();
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
    fillInstances(ref.current, items.length, (i, d) => {
      d.position.set(items[i].x, 0.03, items[i].z);
      d.rotation.set(0, items[i].rot, 0);
      d.scale.set(1, 1, items[i].len);
    });
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.18, 0.03, 1]} />
      <meshStandardMaterial color="#d9d6cc" emissive="#49f2d6" emissiveIntensity={0.35 + dn.night * 1.3} roughness={0.8} />
    </instancedMesh>
  );
}

function Crosswalks() {
  const ref = useRef<InstancedMesh>(null);
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
    fillInstances(ref.current, items.length, (i, d) => {
      d.position.set(items[i].x, 0.025, items[i].z);
      d.rotation.set(0, items[i].rot, 0);
    });
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.5, 0.03, 1.6]} />
      <meshStandardMaterial color="#d9d6cc" roughness={0.8} />
    </instancedMesh>
  );
}

function LightPools({ items }: { items: { x: number; z: number }[] }) {
  const dn = useDayNight();
  const ref = useRef<InstancedMesh>(null);
  const poolMat = useRef<MeshBasicMaterial>(null);
  const texture = useMemo(() => makePoolTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    fillInstances(ref.current, items.length, (i, d) => {
      d.position.set(items[i].x, 0.06, items[i].z);
      d.rotation.set(-Math.PI / 2, 0, 0);
      d.scale.set(9, 9, 1);
    });
  }, [items]);
  useEffect(() => {
    if (poolMat.current) poolMat.current.opacity = 0.55 * dn.night;
  }, [dn]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} visible={dn.night > 0.01}>
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
    fillInstances(poles.current, items.length, (i, d) => d.position.set(items[i].x, 3.2, items[i].z));
    fillInstances(heads.current, items.length, (i, d) => d.position.set(items[i].x, 6.3, items[i].z));
  }, [items]);
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
        <sphereGeometry args={[0.3, 10, 6]} />
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
  const ref = useRef<InstancedMesh>(null);
  const segments = useMemo(() => {
    const out: { z: number; len: number }[] = [];
    for (let i = 0; i < ROAD_ZS.length - 1; i++) out.push({ z: (ROAD_ZS[i] + ROAD_ZS[i + 1]) / 2, len: PITCH - 12 });
    return out;
  }, []);
  useEffect(() => {
    const x = ROAD_XS[WOODWARD_INDEX];
    fillInstances(ref.current, segments.length, (i, d) => {
      d.position.set(x, 0.12, segments[i].z);
      d.scale.set(1, 1, segments[i].len);
    });
  }, [segments]);
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
  const signs = useMemo(() => {
    const out: { position: [number, number, number]; rotation: number; text: string }[] = [];
    const wx = ROAD_XS[WOODWARD_INDEX];
    ROAD_ZS.forEach((z, i) => {
      out.push({ position: [wx + CORNER_OFFSET, 4.6, z + CORNER_OFFSET], rotation: 0, text: STREETS_EW[i] });
      out.push({ position: [wx + CORNER_OFFSET, 3.6, z + CORNER_OFFSET], rotation: Math.PI / 2, text: STREETS_NS[WOODWARD_INDEX] });
    });
    const jz = ROAD_ZS[ROAD_ZS.length - 1];
    ROAD_XS.forEach((x, i) => {
      if (i === WOODWARD_INDEX) return;
      out.push({ position: [x - CORNER_OFFSET, 4.6, jz - CORNER_OFFSET], rotation: Math.PI / 2, text: STREETS_NS[i] });
      out.push({ position: [x - CORNER_OFFSET, 3.6, jz - CORNER_OFFSET], rotation: 0, text: STREETS_EW[STREETS_EW.length - 1] });
    });
    return out;
  }, []);
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
