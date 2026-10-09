"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import { fillInstances } from "./instancing";
import { crownColor, setWindTime, useCrownMaterial, useTreeGeometry, useTrunkMaterial, type CrownQuality, type TreeSpecies } from "./trees";

export interface TreePlace {
  x: number;
  z: number;
  s: number;
}

export interface TreeSpec extends TreePlace {
  species: TreeSpecies;
  tint: Color;
  yaw: number;
}

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
    return { ...p, species, tint: crownColor(species, rand), yaw: rand() * Math.PI * 2 };
  });
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
    const dummy = new Object3D();
    const place = (i: number, d: Object3D) => {
      const t = trees[i];
      d.position.set(t.x, groundY, t.z);
      d.rotation.y = t.yaw;
      d.scale.setScalar(t.s);
    };
    fillInstances(trunks.current, dummy, trees.length, place);
    fillInstances(crowns.current, dummy, trees.length, place);
    const c = crowns.current;
    if (!c) return;
    trees.forEach((t, i) => c.setColorAt(i, t.tint));
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
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
    </group>
  );
}
