import { useEffect, useLayoutEffect, useMemo, type RefObject } from "react";
import { BoxGeometry, BufferAttribute, DynamicDrawUsage, Matrix4, Object3D } from "three";
import type { BufferGeometry, Color, InstancedMesh, MeshStandardMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type PlaceInstance = (i: number, d: Object3D) => void;

const scratch = new Object3D();

export function fillInstances(mesh: InstancedMesh | null, count: number, place: PlaceInstance) {
  if (!mesh) return;
  for (let i = 0; i < count; i++) {
    scratch.position.set(0, 0, 0);
    scratch.rotation.set(0, 0, 0);
    scratch.scale.set(1, 1, 1);
    place(i, scratch);
    scratch.updateMatrix();
    mesh.setMatrixAt(i, scratch.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export interface Placement {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  rx?: number;
  color?: Color;
}

export function fillPlacements(mesh: InstancedMesh | null, items: Placement[]) {
  if (!mesh) return;
  fillInstances(mesh, items.length, (i, d) => {
    const it = items[i];
    d.position.set(it.x, it.y, it.z);
    d.rotation.set(it.rx ?? 0, it.ry, 0);
    d.scale.set(it.sx, it.sy, it.sz);
  });
  fillColors(mesh, items.length, (i) => items[i].color);
}

export function fillColors(mesh: InstancedMesh | null, count: number, colorAt: (i: number) => Color | undefined) {
  if (!mesh) return;
  for (let i = 0; i < count; i++) {
    const color = colorAt(i);
    if (color) mesh.setColorAt(i, color);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function dynamicInstances(mesh: InstancedMesh | null) {
  mesh?.instanceMatrix.setUsage(DynamicDrawUsage);
}

export function dynamicColors(mesh: InstancedMesh | null) {
  mesh?.instanceColor?.setUsage(DynamicDrawUsage);
}

export function useDynamicInstances(ref: RefObject<InstancedMesh | null>) {
  useLayoutEffect(() => dynamicInstances(ref.current), [ref]);
}

export function baseBoxGeometry() {
  return new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
}

export function useBaseBoxGeometry() {
  const geo = useMemo(() => baseBoxGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

export function mergeParts(parts: BufferGeometry[], label: string) {
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(flat);
  for (const g of new Set([...parts, ...flat])) g.dispose();
  if (!merged) throw new Error(`${label} parts could not be merged`);
  return merged;
}

export function cachedByKey<K, V>(make: (key: K) => V) {
  const cache = new Map<K, V>();
  return (key: K) => {
    let value = cache.get(key);
    if (value === undefined) {
      value = make(key);
      cache.set(key, value);
    }
    return value;
  };
}

export const HIDDEN_MATRIX = new Matrix4().makeScale(0, 0, 0);

export function setEmissiveIntensity(mat: MeshStandardMaterial, value: number) {
  mat.emissiveIntensity = value;
}

export function gradientColors<T extends BufferGeometry>(geo: T, axis: "y" | "z", from: number, length: number, exponent = 1) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, ((axis === "y" ? pos.getY(i) : pos.getZ(i)) - from) / length));
    colors.fill(Math.pow(t, exponent), i * 3, i * 3 + 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}
