"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useDayNight } from "./DayNightContext";
import { fillInstances } from "./instancing";
import { RIVER_NEAR } from "./layout";
import { mulberry32, range } from "./rng";
import TreeStand, { plantTrees } from "./TreeStand";

const X = 340;
const Z = RIVER_NEAR + 23;
const RX = 90;
const RZ = 14;
const LOOP_SCALE = 0.72;
const LOOP_SEGMENTS = 48;
const LAMP_EVERY = 3;
const TREE_COUNT = 64;
const GRASS = "#4b6043";
const BANK = "#7a7262";
const SAND = "#c9b98c";
const PATH = "#6a6a72";
const CONSERVATORY = { x: 2, z: -2 };
const FOUNTAIN = { x: -42, z: -1 };
const LANDING = { x: -62, z: 1 };
export const BRIDGE_LANDING = { x: X + LANDING.x, z: Z + LANDING.z };
const LIGHTHOUSE = { x: 82, z: 0 };
const SLIDE = { x: 46, z: 4 };

interface Tree {
  x: number;
  z: number;
  s: number;
}

function near(x: number, z: number, cx: number, cz: number, hx: number, hz: number) {
  return Math.abs(x - cx) < hx && Math.abs(z - cz) < hz;
}

function buildTrees(): Tree[] {
  const rand = mulberry32(1879);
  const out: Tree[] = [];
  while (out.length < TREE_COUNT) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.93;
    const x = Math.cos(a) * RX * r;
    const z = Math.sin(a) * RZ * r;
    if (Math.abs(r - LOOP_SCALE) < 0.05) continue;
    if (near(x, z, CONSERVATORY.x, CONSERVATORY.z, 33, 10)) continue;
    if (near(x, z, FOUNTAIN.x, FOUNTAIN.z, 13, 13)) continue;
    if (near(x, z, LANDING.x, LANDING.z, 11, 9)) continue;
    if (near(x, z, SLIDE.x, SLIDE.z, 5, 10)) continue;
    if (x > LIGHTHOUSE.x - 5) continue;
    out.push({ x, z, s: range(rand, 0.8, 1.5) });
  }
  return out;
}

interface Segment {
  x: number;
  z: number;
  yaw: number;
  len: number;
}

function buildLoop(): Segment[] {
  const out: Segment[] = [];
  const pt = (i: number) => {
    const a = (i / LOOP_SEGMENTS) * Math.PI * 2;
    return { x: Math.cos(a) * RX * LOOP_SCALE, z: Math.sin(a) * RZ * LOOP_SCALE };
  };
  for (let i = 0; i < LOOP_SEGMENTS; i++) {
    const a = pt(i);
    const b = pt(i + 1);
    out.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, yaw: Math.atan2(b.x - a.x, b.z - a.z), len: Math.hypot(b.x - a.x, b.z - a.z) + 0.4 });
  }
  return out;
}

interface Materials {
  marble: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  water: MeshStandardMaterial;
  gold: MeshStandardMaterial;
}

function buildMaterials(): Materials {
  return {
    marble: new MeshStandardMaterial({ color: "#e6e1d6", roughness: 0.5 }),
    stone: new MeshStandardMaterial({ color: "#d2ccbf", roughness: 0.85 }),
    glass: new MeshStandardMaterial({ color: "#9fd0d8", roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.82 }),
    dark: new MeshStandardMaterial({ color: "#2a2d36", roughness: 0.6, metalness: 0.4 }),
    water: new MeshStandardMaterial({ color: "#7fb0c4", roughness: 0.1, metalness: 0.3 }),
    gold: new MeshStandardMaterial({ color: "#e0b63a", roughness: 0.4, metalness: 0.3 }),
  };
}

function Conservatory({ m, glow }: { m: Materials; glow: RefObject<MeshStandardMaterial | null> }) {
  return (
    <group position={[CONSERVATORY.x, 0, CONSERVATORY.z]}>
      <mesh material={m.stone} position={[0, 0.4, 0]}>
        <boxGeometry args={[60, 0.8, 14]} />
      </mesh>
      <mesh material={m.stone} position={[0, 4.3, 0]}>
        <cylinderGeometry args={[6.5, 6.5, 7, 24]} />
      </mesh>
      <mesh material={m.glass} position={[0, 8.6, 0]}>
        <cylinderGeometry args={[6, 6, 1.6, 24]} />
      </mesh>
      <mesh position={[0, 9.4, 0]}>
        <sphereGeometry args={[5.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={glow} color="#fff3c4" emissive="#ffe9a8" emissiveIntensity={0} toneMapped={false} />
      </mesh>
      <mesh material={m.glass} position={[0, 9.4, 0]}>
        <sphereGeometry args={[6.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m.gold} position={[0, 16, 0]}>
        <sphereGeometry args={[0.5, 8, 6]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 18.5, 0, 0]}>
          <mesh material={m.glass} position={[0, 2.6, 0]}>
            <boxGeometry args={[23, 3.6, 8]} />
          </mesh>
          <mesh material={m.glass} position={[0, 4.4, 0]} rotation-x={Math.PI / 4}>
            <boxGeometry args={[23, 2.6, 2.6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ScottFountain({ m }: { m: Materials }) {
  return (
    <group position={[FOUNTAIN.x, 0, FOUNTAIN.z]}>
      <mesh material={m.marble} position={[0, 0.75, 0]}>
        <cylinderGeometry args={[10, 10.6, 0.9, 32]} />
      </mesh>
      <mesh material={m.water} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[9.2, 9.2, 0.1, 32]} />
      </mesh>
      <mesh material={m.marble} position={[0, 1.8, 0]}>
        <cylinderGeometry args={[5.5, 6, 1.2, 24]} />
      </mesh>
      <mesh material={m.marble} position={[0, 3.2, 0]}>
        <cylinderGeometry args={[3, 3.4, 1.5, 20]} />
      </mesh>
      <mesh material={m.marble} position={[0, 5.8, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 4, 12]} />
      </mesh>
      <mesh material={m.marble} position={[0, 8, 0]}>
        <cylinderGeometry args={[1.9, 1.2, 0.6, 16]} />
      </mesh>
      <mesh material={m.water} position={[0, 10.6, 0]}>
        <cylinderGeometry args={[0.18, 0.4, 5, 8]} />
      </mesh>
    </group>
  );
}

function Lighthouse({ m, lamp }: { m: Materials; lamp: RefObject<MeshStandardMaterial | null> }) {
  return (
    <group position={[LIGHTHOUSE.x, 0, LIGHTHOUSE.z]}>
      <mesh material={m.marble} position={[0, 0.4, 0]}>
        <cylinderGeometry args={[3.2, 3.6, 0.8, 12]} />
      </mesh>
      <mesh material={m.marble} position={[0, 5.3, 0]}>
        <cylinderGeometry args={[1.0, 1.5, 9, 10]} />
      </mesh>
      <mesh material={m.glass} position={[0, 10.6, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 1.6, 10]} />
      </mesh>
      <mesh position={[0, 10.6, 0]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial ref={lamp} color="#fff6d8" emissive="#ffd27a" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh material={m.dark} position={[0, 12, 0]}>
        <coneGeometry args={[1.4, 1.2, 10]} />
      </mesh>
    </group>
  );
}

function GiantSlide({ m }: { m: Materials }) {
  const run = 13;
  const drop = 5.4;
  const len = Math.hypot(run, drop);
  return (
    <group position={[SLIDE.x, 0, SLIDE.z]}>
      <mesh material={m.stone} position={[0, 3, -7]}>
        <boxGeometry args={[3, 6, 2.6]} />
      </mesh>
      <group position={[0, 3.2, 0]} rotation-x={Math.atan2(drop, run)}>
        <mesh material={m.gold}>
          <boxGeometry args={[3.2, 0.3, len]} />
        </mesh>
        {[-1.5, 1.5].map((x) => (
          <mesh key={x} material={m.gold} position={[x, 0.3, 0]}>
            <boxGeometry args={[0.2, 0.5, len]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function BelleIsle() {
  const dn = useDayNight();
  const dummy = useMemo(() => new Object3D(), []);
  const trees = useMemo(() => buildTrees(), []);
  const loop = useMemo(() => buildLoop(), []);
  const m = useMemo(() => buildMaterials(), []);
  const lampMat = useRef<MeshStandardMaterial>(null);
  const glowMat = useRef<MeshStandardMaterial>(null);
  const globeMat = useRef<MeshStandardMaterial>(null);
  useEffect(
    () => () => {
      for (const mat of Object.values(m)) mat.dispose();
    },
    [m],
  );
  const specs = useMemo(
    () =>
      plantTrees(
        mulberry32(1880),
        trees.map((t) => ({ ...t, s: t.s * 1.6 })),
        { shade: 0.5, spruce: 0.35, elm: 0.15 },
      ),
    [trees],
  );
  const path = useRef<InstancedMesh>(null);
  const posts = useRef<InstancedMesh>(null);
  const globes = useRef<InstancedMesh>(null);
  const lampCount = Math.floor(LOOP_SEGMENTS / LAMP_EVERY);

  useEffect(() => {
    fillInstances(path.current, dummy, loop.length, (i, d) => {
      const s = loop[i];
      d.position.set(s.x, 0.36, s.z);
      d.rotation.y = s.yaw;
      d.scale.set(2.4, 0.1, s.len);
    });
    fillInstances(posts.current, dummy, lampCount, (i, d) => {
      const s = loop[i * LAMP_EVERY];
      d.position.set(s.x * 1.04, 2.1, s.z * 1.06);
    });
    fillInstances(globes.current, dummy, lampCount, (i, d) => {
      const s = loop[i * LAMP_EVERY];
      d.position.set(s.x * 1.04, 4.1, s.z * 1.06);
    });
  }, [dummy, trees, loop, lampCount]);

  useEffect(() => {
    if (lampMat.current) lampMat.current.emissiveIntensity = 0.3 + dn.night * 5;
    if (globeMat.current) globeMat.current.emissiveIntensity = 0.2 + dn.night * 3;
    if (glowMat.current) glowMat.current.emissiveIntensity = dn.night * 1.2;
  }, [dn]);

  return (
    <group position={[X, 0, Z]}>
      <mesh position={[0, -0.15, 0]} rotation-x={-Math.PI / 2} scale={[RX + 3, RZ + 1.6, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial color={BANK} roughness={1} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation-x={-Math.PI / 2} scale={[RX, RZ, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial color={GRASS} roughness={1} />
      </mesh>
      <mesh position={[58, 0.33, -6]} rotation-x={-Math.PI / 2} scale={[14, 3.5, 1]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color={SAND} roughness={1} />
      </mesh>
      <instancedMesh ref={path} args={[undefined, undefined, loop.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={PATH} roughness={1} />
      </instancedMesh>
      <TreeStand trees={specs} quality="near" seed={1879} />
      <instancedMesh ref={posts} args={[undefined, undefined, lampCount]} material={m.dark}>
        <cylinderGeometry args={[0.08, 0.12, 3.6, 6]} />
      </instancedMesh>
      <instancedMesh ref={globes} args={[undefined, undefined, lampCount]}>
        <sphereGeometry args={[0.32, 8, 6]} />
        <meshStandardMaterial ref={globeMat} color="#fff6d8" emissive="#ffd27a" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
      <Conservatory m={m} glow={glowMat} />
      <ScottFountain m={m} />
      <Lighthouse m={m} lamp={lampMat} />
      <GiantSlide m={m} />
    </group>
  );
}
