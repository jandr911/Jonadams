import { useEffect, useMemo } from "react";
import { IcosahedronGeometry, type BufferGeometry } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32, range } from "./rng";

export const TRUNK_COLOR = "#4a3f38";
export const CROWN_OLIVE = "#3b5a3a";
export const CROWN_MOSS = "#4a6b3f";
export const CROWN_PINE = "#2f4a30";

export type CrownQuality = "near" | "mid" | "far";

function lobe(radius: number, detail: number, rand: () => number, dx: number, dy: number, dz: number, squash: number) {
  const geo = mergeVertices(new IcosahedronGeometry(radius, detail));
  const pos = geo.attributes.position;
  const fx = range(rand, 1.4, 2.6) / radius;
  const fy = range(rand, 1.4, 2.6) / radius;
  const fz = range(rand, 1.4, 2.6) / radius;
  const px = rand() * Math.PI * 2;
  const py = rand() * Math.PI * 2;
  const pz = rand() * Math.PI * 2;
  const amp = range(rand, 0.09, 0.16);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * fx + px) * Math.sin(y * fy + py) + Math.sin(z * fz + pz) * Math.cos(x * fy + pz);
    const k = 1 + amp * n;
    pos.setXYZ(i, x * k + dx, y * k * squash + dy, z * k + dz);
  }
  geo.computeVertexNormals();
  return geo;
}

export function makeCrownGeometry(radius: number, seed: number, quality: CrownQuality = "near"): BufferGeometry {
  const rand = mulberry32(seed);
  if (quality === "far") return lobe(radius, 0, rand, 0, 0, 0, 0.84);
  if (quality === "mid") return lobe(radius, 1, rand, 0, 0, 0, 0.84);
  const lobes = [
    lobe(radius, 1, rand, 0, 0, 0, 0.82),
    lobe(radius * 0.72, 1, rand, radius * 0.55, radius * 0.22, -radius * 0.32, 0.86),
    lobe(radius * 0.64, 1, rand, -radius * 0.5, radius * 0.38, radius * 0.36, 0.86),
  ];
  const merged = mergeGeometries(lobes);
  for (const l of lobes) l.dispose();
  if (!merged) throw new Error("crown lobes could not be merged");
  return merged;
}

export function useCrownGeometry(radius: number, seed: number, quality: CrownQuality = "near") {
  const geo = useMemo(() => makeCrownGeometry(radius, seed, quality), [radius, seed, quality]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}
