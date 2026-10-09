"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { InstancedMesh, Mesh, PerspectiveCamera } from "three";

const HIDE_BELOW_PX = 1.1;
const SHOW_ABOVE_PX = 1.8;
const EVERY_FRAMES = 8;
const CULLED = "detailCulled";

function worldRadius(m: Mesh) {
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const e = m.matrixWorld.elements;
  const sx = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
  const sy = e[4] * e[4] + e[5] * e[5] + e[6] * e[6];
  const sz = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
  return (g.boundingSphere?.radius ?? 0) * Math.sqrt(Math.max(sx, sy, sz));
}

export default function DetailCull() {
  const scene = useThree((s) => s.scene);
  const frame = useRef(0);
  useFrame(({ camera, size }) => {
    frame.current += 1;
    if (frame.current % EVERY_FRAMES !== 0 || !(camera instanceof PerspectiveCamera)) return;
    const pxPerUnit = size.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;
    scene.traverse((o) => {
      if (!(o instanceof Mesh) || o instanceof InstancedMesh || o.userData.noCull) return;
      const culled = o.userData[CULLED] === true;
      if (!o.visible && !culled) return;
      const radius = worldRadius(o);
      const e = o.matrixWorld.elements;
      const dx = e[12] - cx;
      const dy = e[13] - cy;
      const dz = e[14] - cz;
      const px = radius > 0 ? (radius * pxPerUnit) / Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1) : Infinity;
      if (!culled && px < HIDE_BELOW_PX) {
        o.visible = false;
        o.userData[CULLED] = true;
      } else if (culled && px > SHOW_ABOVE_PX) {
        o.visible = true;
        o.userData[CULLED] = false;
      }
    });
  }, -3);
  return null;
}
