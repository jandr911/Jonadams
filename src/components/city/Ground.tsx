"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, Group, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useDayNight } from "./DayNightContext";
import {
  BLOCK,
  CITY_HALF_X,
  CITY_HALF_Z,
  OUTER_HALF_X,
  OUTER_MIN_Z,
  RIVER_FAR,
  RIVER_NEAR,
  allBlocks,
  blockCenter,
} from "./layout";
import { mulberry32, range } from "./rng";
import { makeAsphaltTexture, makeConcreteTexture } from "./textures";
import BelleIsle from "./BelleIsle";
import RiverMirror from "./RiverMirror";
import { enableReflection } from "./layers";

function BlockPads() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const concrete = useMemo(() => {
    const t = makeConcreteTexture();
    t.repeat.set(5, 5);
    return t;
  }, []);
  const blocks = useMemo(() => allBlocks(), []);
  const count = blocks.length;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    blocks.forEach(({ c, r }, i) => {
      const [x, z] = blockCenter(c, r);
      dummy.position.set(x, 0.2, z);
      dummy.scale.set(BLOCK + 2.4, 0.4, BLOCK + 2.4);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [dummy, blocks]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8a84a0" map={concrete} roughness={0.95} />
    </instancedMesh>
  );
}

function River() {
  const width = RIVER_FAR - RIVER_NEAR;
  return <RiverMirror width={7000} depth={width} position={[0, -0.6, (RIVER_NEAR + RIVER_FAR) / 2]} />;
}

const WALK_Z0 = CITY_HALF_Z;
const WALK_Z1 = RIVER_NEAR;

function Riverwalk() {
  const z0 = WALK_Z0;
  const z1 = WALK_Z1;
  const depth = z1 - z0;
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  const postsRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const postCount = 70;
  useEffect(() => {
    const m = postsRef.current;
    if (!m) return;
    for (let i = 0; i < postCount; i++) {
      const x = -CITY_HALF_X - 40 + (i / (postCount - 1)) * (CITY_HALF_X * 2 + 80);
      dummy.position.set(x, 0.9, WALK_Z1 - 1.2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [dummy]);
  return (
    <group ref={root}>
      <mesh position={[0, 0.25, z0 + depth / 2]} receiveShadow>
        <boxGeometry args={[CITY_HALF_X * 2 + 80, 0.5, depth]} />
        <meshStandardMaterial color="#5d5680" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, z1 - 2.6]}>
        <boxGeometry args={[CITY_HALF_X * 2 + 80, 0.12, 0.8]} />
        <meshStandardMaterial color="#8e86b8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.6, z1 - 1.2]}>
        <boxGeometry args={[CITY_HALF_X * 2 + 80, 0.14, 0.14]} />
        <meshStandardMaterial color="#c9c3e8" roughness={0.4} metalness={0.4} />
      </mesh>
      <instancedMesh ref={postsRef} args={[undefined, undefined, postCount]}>
        <boxGeometry args={[0.2, 1.4, 0.2]} />
        <meshStandardMaterial color="#c9c3e8" roughness={0.4} metalness={0.4} />
      </instancedMesh>
      <mesh position={[0, -0.3, z1 + 0.5]}>
        <boxGeometry args={[CITY_HALF_X * 2 + 80, 1.3, 1.2]} />
        <meshStandardMaterial color="#2f2a4a" roughness={1} />
      </mesh>
    </group>
  );
}

function Trees() {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const crowns2 = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const specs = useMemo(() => {
    const rand = mulberry32(99);
    const out: { x: number; z: number; s: number }[] = [];
    for (const { c, r, outer } of allBlocks()) {
      {
        const [x, z] = blockCenter(c, r);
        const n = (outer ? 1 : 2) + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const side = Math.floor(rand() * 4);
          const t = range(rand, -BLOCK / 2 + 2, BLOCK / 2 - 2);
          const e = BLOCK / 2 + 0.6;
          const [dx, dz] =
            side === 0 ? [t, e] : side === 1 ? [t, -e] : side === 2 ? [e, t] : [-e, t];
          out.push({ x: x + dx, z: z + dz, s: range(rand, 0.8, 1.35) });
        }
      }
    }
    const span = CITY_HALF_X * 2 + 80;
    for (let i = 0; i < 26; i++) {
      out.push({
        x: -span / 2 + (i / 25) * span + range(rand, -1, 1),
        z: CITY_HALF_Z + 4.5,
        s: range(rand, 0.9, 1.3),
      });
    }
    return out;
  }, []);
  useEffect(() => {
    const t = trunks.current;
    const cr = crowns.current;
    const cr2 = crowns2.current;
    if (!t || !cr || !cr2) return;
    specs.forEach((s, i) => {
      dummy.position.set(s.x, 0.4 + 1.1 * s.s, s.z);
      dummy.scale.set(s.s, s.s, s.s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x, 0.4 + 3.1 * s.s, s.z);
      dummy.rotation.set(0, i * 1.3, 0);
      dummy.updateMatrix();
      cr.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x + 0.6 * s.s, 0.4 + 4.1 * s.s, s.z - 0.4 * s.s);
      dummy.rotation.set(0.4, i * 2.1, 0.3);
      dummy.scale.set(s.s * 0.8, s.s * 0.8, s.s * 0.8);
      dummy.updateMatrix();
      cr2.setMatrixAt(i, dummy.matrix);
    });
    t.instanceMatrix.needsUpdate = true;
    cr.instanceMatrix.needsUpdate = true;
    cr2.instanceMatrix.needsUpdate = true;
  }, [specs, dummy]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, specs.length]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 2.2, 6]} />
        <meshStandardMaterial color="#4a2e2a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, specs.length]} castShadow>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshStandardMaterial color="#2f8a5a" roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={crowns2} args={[undefined, undefined, specs.length]}>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshStandardMaterial color="#3a9c66" roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}

function Asphalt() {
  const dn = useDayNight();
  const mat = useRef<MeshStandardMaterial>(null);
  const base = useRef<MeshStandardMaterial>(null);
  const asphalt = useMemo(() => {
    const t = makeAsphaltTexture();
    t.repeat.set(70, 40);
    return t;
  }, []);
  const asphaltFar = useMemo(() => {
    const t = makeAsphaltTexture();
    t.repeat.set(400, 400);
    return t;
  }, []);
  useEffect(() => {
    mat.current?.color.set(new Color("#8a8894").lerp(new Color("#2a2846"), dn.night));
    base.current?.color.set(new Color("#6a6e78").lerp(new Color("#171b30"), dn.night));
  }, [dn]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[9000, 9000]} />
        <meshStandardMaterial ref={base} color="#3d4a3f" map={asphaltFar} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (OUTER_MIN_Z - 30 + CITY_HALF_Z) / 2]} receiveShadow>
        <planeGeometry args={[OUTER_HALF_X * 2 + 60, CITY_HALF_Z - OUTER_MIN_Z + 30]} />
        <meshStandardMaterial ref={mat} color="#1b182e" map={asphalt} roughness={1} />
      </mesh>
    </group>
  );
}

function FarShore() {
  return null;
}

export default function Ground() {
  return (
    <group>
      <Asphalt />
      <FarShore />
      <BlockPads />
      <Riverwalk />
      <River />
      <BelleIsle />
      <Trees />
    </group>
  );
}
