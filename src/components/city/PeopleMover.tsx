"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { useDayNight } from "./DayNightContext";
import { roadLinesX, roadLinesZ } from "./layout";
import { enableReflection } from "./layers";

const TRACK_Y = 9;

function buildLoop() {
  const xs = roadLinesX();
  const zs = roadLinesZ();
  const x0 = xs[2];
  const x1 = xs[7];
  const z0 = zs[1];
  const z1 = zs[5];
  const r = 7;
  const pts = [
    new Vector3(x0 + r, TRACK_Y, z0),
    new Vector3(x1 - r, TRACK_Y, z0),
    new Vector3(x1, TRACK_Y, z0 + r),
    new Vector3(x1, TRACK_Y, z1 - r),
    new Vector3(x1 - r, TRACK_Y, z1),
    new Vector3(x0 + r, TRACK_Y, z1),
    new Vector3(x0, TRACK_Y, z1 - r),
    new Vector3(x0, TRACK_Y, z0 + r),
  ];
  return new CatmullRomCurve3(pts, true, "catmullrom", 0.15);
}

function Pylons({ curve }: { curve: CatmullRomCurve3 }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const count = 64;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      const p = curve.getPointAt(i / count);
      dummy.position.set(p.x, TRACK_Y / 2 - 0.3, p.z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [curve, dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
      <cylinderGeometry args={[0.55, 0.8, TRACK_Y - 0.6, 10]} />
      <meshStandardMaterial color="#4a4a68" roughness={0.8} />
    </instancedMesh>
  );
}

function Train({ curve }: { curve: CatmullRomCurve3 }) {
  const dn = useDayNight();
  const cars = useRef<(Group | null)[]>([]);
  const winMat = useRef<MeshStandardMaterial>(null);
  const stripeMat = useRef<MeshStandardMaterial>(null);
  const len = useMemo(() => curve.getLength(), [curve]);
  const spacing = 9.2 / len;
  const tmp = useMemo(() => ({ p: new Vector3(), t: new Vector3(), look: new Vector3() }), []);
  useEffect(() => {
    if (winMat.current) winMat.current.emissiveIntensity = 0.3 + dn.night * 1.8;
    if (stripeMat.current) stripeMat.current.emissiveIntensity = 1.2 + dn.night * 2.2;
  }, [dn]);
  useFrame(({ clock }) => {
    const base = (clock.elapsedTime * 0.028) % 1;
    cars.current.forEach((g, i) => {
      if (!g) return;
      const u = ((base - i * spacing) % 1 + 1) % 1;
      curve.getPointAt(u, tmp.p);
      curve.getTangentAt(u, tmp.t);
      g.position.copy(tmp.p);
      tmp.look.copy(tmp.p).add(tmp.t);
      g.lookAt(tmp.look);
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(el) => {
            cars.current[i] = el;
          }}
        >
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[2.4, 2.6, 8.4]} />
            <meshStandardMaterial color="#e8e8f2" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1.9, 0]}>
            <boxGeometry args={[2.5, 0.9, 8.2]} />
            <meshStandardMaterial
              ref={i === 0 ? winMat : undefined}
              color="#49d2f2"
              emissive="#49d2f2"
              emissiveIntensity={1.4}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[2.5, 0.28, 8.2]} />
            <meshStandardMaterial
              ref={i === 0 ? stripeMat : undefined}
              color="#ff4fa3"
              emissive="#ff4fa3"
              emissiveIntensity={2.4}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[1.4, 0.5, 7.6]} />
            <meshStandardMaterial color="#2a2a44" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Stations({ curve }: { curve: CatmullRomCurve3 }) {
  const dn = useDayNight();
  const mat = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.3 + dn.night * 1.6;
  }, [dn]);
  const spots = useMemo(() => [0.08, 0.33, 0.58, 0.83].map((u) => ({ p: curve.getPointAt(u), t: curve.getTangentAt(u) })), [curve]);
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={[s.p.x, s.p.y, s.p.z]} rotation={[0, Math.atan2(s.t.x, s.t.z), 0]}>
          <mesh position={[2.6, -0.4, 0]}>
            <boxGeometry args={[3.2, 0.4, 12]} />
            <meshStandardMaterial color="#8a86a8" />
          </mesh>
          <mesh position={[2.6, 2.6, 0]}>
            <boxGeometry args={[3.6, 0.3, 12.4]} />
            <meshStandardMaterial color="#3a3a58" />
          </mesh>
          <mesh position={[2.6, 2.3, 0]}>
            <boxGeometry args={[3, 0.12, 11.6]} />
            <meshStandardMaterial ref={i === 0 ? mat : undefined} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {[-5, 5].map((z) => (
            <mesh key={z} position={[4, 1.2, z]}>
              <boxGeometry args={[0.2, 3.2, 0.2]} />
              <meshStandardMaterial color="#5a5a78" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export default function PeopleMover() {
  const curve = useMemo(() => buildLoop(), []);
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  return (
    <group ref={root}>
      <Stations curve={curve} />
      <mesh castShadow>
        <tubeGeometry args={[curve, 320, 0.7, 8, true]} />
        <meshStandardMaterial color="#5a5a7c" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <tubeGeometry args={[curve, 320, 0.16, 6, true]} />
        <meshStandardMaterial color="#bfc2d8" roughness={0.3} metalness={0.6} />
      </mesh>
      <Pylons curve={curve} />
      <Train curve={curve} />
    </group>
  );
}
