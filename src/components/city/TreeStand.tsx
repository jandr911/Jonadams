"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import { fillColors, fillInstances } from "./instancing";
import { mulberry32 } from "./rng";
import { crownTint, setWindTime, useCrownMaterial, useTreeGeometry, useTrunkMaterial, type CrownQuality, type TreeSpecies } from "./trees";

export interface TreePlace {
  x: number;
  z: number;
  s: number;
}

export interface TreeSpec extends TreePlace {
  species: TreeSpecies;
  tint: Color;
  yaw: number;
  autumn: boolean;
}

const LEAVES_PER_TREE = 9;

export type SpeciesMix = Partial<Record<TreeSpecies, number>>;

export function plantTrees(rand: () => number, places: TreePlace[], mix: SpeciesMix): TreeSpec[] {
  const entries = Object.entries(mix) as [TreeSpecies, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  return places.map((p) => {
    let roll = rand() * total;
    let species: TreeSpecies = entries[0][0];
    for (const [name, w] of entries) {
      species = name;
      roll -= w;
      if (roll <= 0) break;
    }
    const { tint, autumn } = crownTint(species, rand);
    return { ...p, species, tint, yaw: rand() * Math.PI * 2, autumn };
  });
}

function FallenLeaves({ trees, groundY }: { trees: TreeSpec[]; groundY: number }) {
  const ref = useRef<InstancedMesh>(null);
  const autumn = useMemo(() => trees.filter((t) => t.autumn), [trees]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rand = mulberry32(autumn.length * 13 + 5);
    const count = autumn.length * LEAVES_PER_TREE;
    fillInstances(m, count, (j, d) => {
      const t = autumn[Math.floor(j / LEAVES_PER_TREE)];
      const a = rand() * Math.PI * 2;
      const r = 0.6 + rand() * 2.6 * t.s;
      d.position.set(t.x + Math.cos(a) * r, groundY + 0.03, t.z + Math.sin(a) * r);
      d.rotation.set(-Math.PI / 2, 0, rand() * Math.PI);
      d.scale.setScalar(0.5 + rand() * 0.6);
    });
    fillColors(m, count, (j) => autumn[Math.floor(j / LEAVES_PER_TREE)].tint);
  }, [autumn, groundY]);
  if (autumn.length === 0) return null;
  return (
    <instancedMesh ref={ref} name="fallen-leaves" args={[undefined, undefined, autumn.length * LEAVES_PER_TREE]}>
      <planeGeometry args={[0.7, 0.45]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </instancedMesh>
  );
}

function Stand({
  trees,
  species,
  quality,
  seed,
  castShadow,
  groundY,
}: {
  trees: TreeSpec[];
  species: TreeSpecies;
  quality: CrownQuality;
  seed: number;
  castShadow: boolean;
  groundY: number;
}) {
  const geo = useTreeGeometry(species, quality, seed);
  const crownMat = useCrownMaterial();
  const trunkMat = useTrunkMaterial();
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useEffect(() => {
    const place = (i: number, d: Object3D) => {
      const t = trees[i];
      d.position.set(t.x, groundY, t.z);
      d.rotation.y = t.yaw;
      d.scale.setScalar(t.s);
    };
    fillInstances(trunks.current, trees.length, place);
    fillInstances(crowns.current, trees.length, place);
    fillColors(crowns.current, trees.length, (i) => trees[i].tint);
  }, [trees, groundY, geo]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[geo.trunk, trunkMat, trees.length]} castShadow={castShadow} />
      {geo.crown && <instancedMesh ref={crowns} args={[geo.crown, crownMat, trees.length]} castShadow={castShadow} />}
    </group>
  );
}

export function TreeWind() {
  useFrame(({ clock }) => {
    setWindTime(clock.elapsedTime);
  });
  return null;
}

export default function TreeStand({
  trees,
  quality,
  seed = 1,
  castShadow = false,
  groundY = 0,
}: {
  trees: TreeSpec[];
  quality: CrownQuality;
  seed?: number;
  castShadow?: boolean;
  groundY?: number;
}) {
  const groups = useMemo(() => {
    const map = new Map<TreeSpecies, TreeSpec[]>();
    for (const t of trees) {
      const list = map.get(t.species) ?? [];
      list.push(t);
      map.set(t.species, list);
    }
    return [...map.entries()];
  }, [trees]);
  return (
    <group>
      {groups.map(([species, list]) => (
        <Stand key={species} species={species} trees={list} quality={quality} seed={seed} castShadow={castShadow} groundY={groundY} />
      ))}
      {quality !== "far" && <FallenLeaves trees={trees} groundY={groundY} />}
    </group>
  );
}
