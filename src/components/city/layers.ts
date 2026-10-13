import { Layers, type Object3D } from "three";

export const REFLECT_LAYER = 1;

export const LIT_IN_REFLECTION = new Layers();
LIT_IN_REFLECTION.enable(REFLECT_LAYER);

export const REFLECTS = "reflects";

function markReflecting(o: Object3D) {
  if (o.userData.noReflect) return;
  o.layers.enable(REFLECT_LAYER);
  if ("isMesh" in o && !("isInstancedMesh" in o)) o.userData[REFLECTS] = true;
  for (const child of o.children) markReflecting(child);
}

export function enableReflection(root: Object3D | null) {
  if (!root) return;
  markReflecting(root);
}
