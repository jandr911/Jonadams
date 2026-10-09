import type { Object3D } from "three";

export const REFLECT_LAYER = 1;

export function enableReflection(root: Object3D | null) {
  if (!root) return;
  root.traverse((o) => o.layers.enable(REFLECT_LAYER));
}
