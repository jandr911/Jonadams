import { useEffect, useMemo } from "react";
import { BoxGeometry, BufferAttribute } from "three";
import type { BufferGeometry, InstancedMesh, Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function fillInstances(mesh: InstancedMesh | null, dummy: Object3D, count: number, place: (i: number, d: Object3D) => void) {
  if (!mesh) return;
  for (let i = 0; i < count; i++) {
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    place(i, dummy);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
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
