import { Layers, Mesh, Vector3, type Object3D } from "three";

export const REFLECT_LAYER = 1;

export const LIT_IN_REFLECTION = new Layers();
LIT_IN_REFLECTION.enable(REFLECT_LAYER);

const MIN_REFLECTED_RADIUS = 1.4;
const scale = new Vector3();

function tooSmallToReflect(o: Object3D) {
  if (!(o instanceof Mesh) || "isInstancedMesh" in o) return false;
  const geo = o.geometry;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const r = geo.boundingSphere?.radius ?? 0;
  if (!(r > 0)) return false;
  o.getWorldScale(scale);
  const s = Math.max(scale.x, scale.y, scale.z);
  if (!(s > 0)) return false;
  return r * s < MIN_REFLECTED_RADIUS;
}

export function enableReflection(root: Object3D | null) {
  if (!root) return;
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if (o.userData.noReflect || tooSmallToReflect(o)) return;
    o.layers.enable(REFLECT_LAYER);
  });
}
