import type { InstancedMesh, Object3D } from "three";

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
