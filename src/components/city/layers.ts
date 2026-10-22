import type { Object3D } from "three";

export const REFLECT_LAYER = 1;
export const WARM_LAYER = 2;

export const reflectionRoot: { current: Object3D | null } = { current: null };

function markReflecting(o: Object3D) {
  if (o.userData.noReflect) return;
  o.layers.enable(REFLECT_LAYER);
  for (const child of o.children) markReflecting(child);
}

export function enableReflection(root: Object3D | null) {
  if (!root) return;
  markReflecting(root);
  reflectionRoot.current = root;
  return () => {
    if (reflectionRoot.current === root) reflectionRoot.current = null;
  };
}
