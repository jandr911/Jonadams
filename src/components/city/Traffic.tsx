"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useDayNight } from "./DayNightContext";
import { CITY_HALF_Z, OUTER_HALF_X, OUTER_MIN_Z, lightIsGreen, outerRoadLinesX, outerRoadLinesZ } from "./layout";
import { mulberry32, pick, range } from "./rng";

const CAR_COLORS = ["#ffb02e", "#49d2f2", "#ff4d6d", "#e8e8f2", "#9dff57", "#c9a6ff", "#ff7a59", "#2f6ea8"];

interface Car {
  axis: "x" | "z";
  line: number;
  lineIndex: number;
  lane: number;
  dir: 1 | -1;
  along: number;
  speed: number;
  vel: number;
  len: number;
  color: Color;
  bus: boolean;
}

function buildCars(): Car[] {
  const rand = mulberry32(77);
  const cars: Car[] = [];
  const xs = outerRoadLinesX();
  const zs = outerRoadLinesZ();
  for (let i = 0; i < 260; i++) {
    const axis: "x" | "z" = rand() < 0.5 ? "x" : "z";
    const lineIndex = Math.floor(rand() * (axis === "z" ? xs.length : zs.length));
    const line = axis === "z" ? xs[lineIndex] : zs[lineIndex];
    const dir: 1 | -1 = rand() < 0.5 ? 1 : -1;
    const bus = rand() < 0.1;
    const min = axis === "z" ? OUTER_MIN_Z - 20 : -OUTER_HALF_X - 30;
    const max = axis === "z" ? CITY_HALF_Z + 3 : OUTER_HALF_X + 30;
    cars.push({
      axis,
      line,
      lineIndex,
      lane: dir * 1.7,
      dir,
      along: range(rand, min, max),
      speed: bus ? range(rand, 5, 7) : range(rand, 7, 13),
      vel: 0,
      len: bus ? 1.9 : 1,
      color: new Color(pick(rand, CAR_COLORS)),
      bus,
    });
  }
  return cars;
}

export default function Traffic() {
  const dn = useDayNight();
  const cars = useMemo(() => buildCars(), []);
  const bodies = useRef<InstancedMesh>(null);
  const cabins = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const tails = useRef<InstancedMesh>(null);
  const wheels = useRef<InstancedMesh>(null);
  const headMat = useRef<MeshStandardMaterial>(null);
  const tailMat = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const b = bodies.current;
    if (!b) return;
    cars.forEach((c, i) => b.setColorAt(i, c.color));
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  }, [cars]);

  useEffect(() => {
    if (headMat.current) headMat.current.emissiveIntensity = 0.4 + dn.night * 3.2;
    if (tailMat.current) tailMat.current.emissiveIntensity = 0.5 + dn.night * 2.6;
  }, [dn]);

  const lines = useMemo(() => ({ xs: outerRoadLinesX(), zs: outerRoadLinesZ() }), []);
  const lanes = useMemo(() => {
    const map = new Map<string, Car[]>();
    cars.forEach((c) => {
      const key = `${c.axis}|${c.line}|${c.dir}`;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    });
    return cars.map((c) => map.get(`${c.axis}|${c.line}|${c.dir}`)!);
  }, [cars]);

  useFrame(({ clock }, dt) => {
    const b = bodies.current;
    const cb = cabins.current;
    const h = heads.current;
    const t = tails.current;
    const w = wheels.current;
    if (!b || !cb || !h || !t || !w) return;
    const step = Math.min(dt, 0.05);
    const time = clock.elapsedTime;
    cars.forEach((c, i) => {
      const min = c.axis === "z" ? OUTER_MIN_Z - 20 : -OUTER_HALF_X - 30;
      const max = c.axis === "z" ? CITY_HALF_Z + 3 : OUTER_HALF_X + 30;
      const cross = c.axis === "z" ? lines.zs : lines.xs;
      let target = c.speed;
      for (let k = 0; k < cross.length; k++) {
        const gap = (cross[k] - c.along) * c.dir;
        if (gap > 3.2 && gap < 9) {
          const ix = c.axis === "z" ? c.lineIndex : k;
          const iz = c.axis === "z" ? k : c.lineIndex;
          if (!lightIsGreen(c.axis, ix, iz, time)) target = 0;
          break;
        }
      }
      const lane = lanes[i];
      for (let j = 0; j < lane.length; j++) {
        const o = lane[j];
        if (o === c) continue;
        const gap = (o.along - c.along) * c.dir;
        if (gap > 0 && gap < 5.5 + c.len * 2) {
          target = Math.min(target, o.vel * 0.9);
          break;
        }
      }
      c.vel += (target - c.vel) * Math.min(1, step * (target < c.vel ? 6 : 2.5));
      c.along += c.vel * step * c.dir;
      if (c.along > max) c.along = min;
      if (c.along < min) c.along = max;
      const along = c.along;
      const x = c.axis === "z" ? c.line + c.lane : along;
      const z = c.axis === "z" ? along : c.line - c.lane;
      const yaw = c.axis === "z" ? (c.dir === 1 ? 0 : Math.PI) : c.dir === 1 ? Math.PI / 2 : -Math.PI / 2;

      dummy.position.set(x, 0.75, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, c.len);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, 1.32, z);
      dummy.scale.set(1, c.bus ? 1.3 : 1, c.bus ? 3.1 : 1);
      dummy.updateMatrix();
      cb.setMatrixAt(i, dummy.matrix);

      dummy.scale.set(1, 1, 1);
      const fz = 2.05 * c.len;
      dummy.position.set(x, 0.8, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.translateZ(fz);
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, 0.85, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.translateZ(-fz);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);

      const wz = 1.3 * c.len;
      [
        [-1, wz],
        [1, wz],
        [-1, -wz],
        [1, -wz],
      ].forEach(([sx, sz], k) => {
        dummy.position.set(x, 0.42, z);
        dummy.rotation.set(0, yaw, 0);
        dummy.translateX(sx * 0.95);
        dummy.translateZ(sz);
        dummy.rotateY(Math.PI / 2);
        dummy.updateMatrix();
        w.setMatrixAt(i * 4 + k, dummy.matrix);
      });
    });
    b.instanceMatrix.needsUpdate = true;
    cb.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    t.instanceMatrix.needsUpdate = true;
    w.instanceMatrix.needsUpdate = true;
  });

  const n = cars.length;
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, n]} castShadow>
        <boxGeometry args={[1.9, 0.7, 4.1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={cabins} args={[undefined, undefined, n]}>
        <boxGeometry args={[1.6, 0.6, 2]} />
        <meshStandardMaterial color="#1b2040" roughness={0.2} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, n]}>
        <boxGeometry args={[1.7, 0.22, 0.12]} />
        <meshStandardMaterial
          ref={headMat}
          color="#fff6d8"
          emissive="#fff2c0"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={wheels} args={[undefined, undefined, n * 4]}>
        <cylinderGeometry args={[0.42, 0.42, 0.32, 10]} onUpdate={(g) => g.rotateZ(Math.PI / 2)} />
        <meshStandardMaterial color="#141418" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={tails} args={[undefined, undefined, n]}>
        <boxGeometry args={[1.7, 0.22, 0.12]} />
        <meshStandardMaterial
          ref={tailMat}
          color="#ff3344"
          emissive="#ff2a3c"
          emissiveIntensity={2.6}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
