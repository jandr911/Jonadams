"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, Group, InstancedMesh, MeshStandardMaterial } from "three";
import { useDayNight } from "./DayNightContext";
import {
  BLOCK,
  CITY_HALF_Z,
  OUTER_HALF_X,
  OUTER_MIN_Z,
  PAD,
  RIVER_FAR,
  RIVER_NEAR,
  RIVERWALK_HALF,
  allBlocks,
  blockCenter,
} from "./layout";
import { mulberry32, range } from "./rng";
import { makeAsphaltTexture, makeConcreteTexture } from "./textures";
import TreeStand, { plantTrees, type TreePlace } from "./TreeStand";
import BelleIsle from "./BelleIsle";
import RiverMirror from "./RiverMirror";
import { enableReflection } from "./layers";
import { fillInstances } from "./instancing";

function BlockPads() {
  const ref = useRef<InstancedMesh>(null);
  const concrete = useMemo(() => {
    const t = makeConcreteTexture();
    t.repeat.set(5, 5);
    return t;
  }, []);
  useEffect(() => () => concrete.dispose(), [concrete]);
  const blocks = useMemo(() => allBlocks(), []);
  const count = blocks.length;
  useEffect(() => {
    fillInstances(ref.current, count, (i, d) => {
      const [x, z] = blockCenter(blocks[i].c, blocks[i].r);
      d.position.set(x, PAD / 2, z);
      d.scale.set(BLOCK + 2.4, PAD, BLOCK + 2.4);
    });
  }, [blocks, count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8f8c86" map={concrete} roughness={0.95} />
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
  const postCount = 70;
  useEffect(() => {
    fillInstances(postsRef.current, postCount, (i, d) => {
      d.position.set(-RIVERWALK_HALF + (i / (postCount - 1)) * (RIVERWALK_HALF * 2), 0.9, WALK_Z1 - 1.2);
    });
  }, []);
  return (
    <group ref={root}>
      <mesh position={[0, 0.25, z0 + depth / 2]} receiveShadow>
        <boxGeometry args={[RIVERWALK_HALF * 2, 0.5, depth]} />
        <meshStandardMaterial color="#77736b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, z1 - 2.6]}>
        <boxGeometry args={[RIVERWALK_HALF * 2, 0.12, 0.8]} />
        <meshStandardMaterial color="#9a958c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.6, z1 - 1.2]}>
        <boxGeometry args={[RIVERWALK_HALF * 2, 0.14, 0.14]} />
        <meshStandardMaterial color="#b8b6b0" roughness={0.4} metalness={0.4} />
      </mesh>
      <instancedMesh ref={postsRef} args={[undefined, undefined, postCount]}>
        <boxGeometry args={[0.2, 1.4, 0.2]} />
        <meshStandardMaterial color="#b8b6b0" roughness={0.4} metalness={0.4} />
      </instancedMesh>
      <mesh position={[0, -0.3, z1 + 0.5]}>
        <boxGeometry args={[RIVERWALK_HALF * 2, 1.3, 1.2]} />
        <meshStandardMaterial color="#3a3833" roughness={1} />
      </mesh>
    </group>
  );
}

function Trees() {
  const trees = useMemo(() => {
    const rand = mulberry32(99);
    const blocks: TreePlace[] = [];
    for (const { c, r, outer } of allBlocks()) {
      const [x, z] = blockCenter(c, r);
      const n = (outer ? 1 : 2) + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const side = Math.floor(rand() * 4);
        const t = range(rand, -BLOCK / 2 + 2, BLOCK / 2 - 2);
        const e = BLOCK / 2 + 0.6;
        const [dx, dz] = side === 0 ? [t, e] : side === 1 ? [t, -e] : side === 2 ? [e, t] : [-e, t];
        blocks.push({ x: x + dx, z: z + dz, s: range(rand, 0.8, 1.3) });
      }
    }
    const span = RIVERWALK_HALF * 2;
    const allee: TreePlace[] = [];
    for (let i = 0; i < 26; i++) {
      allee.push({ x: -span / 2 + (i / 25) * span + range(rand, -1, 1), z: CITY_HALF_Z + 4.5, s: range(rand, 1.0, 1.25) });
    }
    return [...plantTrees(rand, blocks, { shade: 0.6, elm: 0.25, bare: 0.15 }), ...plantTrees(rand, allee, { elm: 1 })];
  }, []);
  return <TreeStand trees={trees} quality="mid" seed={7} castShadow groundY={PAD} />;
}

const ASPHALT_DAY = new Color("#7d7b77");
const ASPHALT_NIGHT = new Color("#2b2a28");
const BASE_DAY = new Color("#6c6b67");
const BASE_NIGHT = new Color("#1a1a19");

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
    const t = asphalt.clone();
    t.repeat.set(400, 400);
    return t;
  }, [asphalt]);
  useEffect(() => () => asphalt.dispose(), [asphalt]);
  useEffect(() => () => asphaltFar.dispose(), [asphaltFar]);
  useEffect(() => {
    mat.current?.color.copy(ASPHALT_DAY).lerp(ASPHALT_NIGHT, dn.night);
    base.current?.color.copy(BASE_DAY).lerp(BASE_NIGHT, dn.night);
  }, [dn]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[9000, 9000]} />
        <meshStandardMaterial ref={base} color="#3d4a3f" map={asphaltFar} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (OUTER_MIN_Z - 30 + CITY_HALF_Z) / 2]} receiveShadow>
        <planeGeometry args={[OUTER_HALF_X * 2 + 60, CITY_HALF_Z - OUTER_MIN_Z + 30]} />
        <meshStandardMaterial ref={mat} color="#2b2a28" map={asphalt} roughness={1} />
      </mesh>
    </group>
  );
}

export default function Ground() {
  return (
    <group>
      <Asphalt />
      <BlockPads />
      <Riverwalk />
      <River />
      <BelleIsle />
      <Trees />
    </group>
  );
}
