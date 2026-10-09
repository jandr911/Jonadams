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
import { fillInstances } from "./instancing";
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
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
      <cylinderGeometry args={[0.55, 0.8, TRACK_Y - 0.6, 10]} />
      <meshStandardMaterial color="#4a4a68" roughness={0.8} />
    </instancedMesh>
  );
}

const GUIDEWAY_SEGMENTS = 160;

function Guideway({ curve }: { curve: CatmullRomCurve3 }) {
  const joints = useRef<InstancedMesh>(null);
  const walkway = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const segLen = useMemo(() => curve.getLength() / GUIDEWAY_SEGMENTS, [curve]);
  useEffect(() => {
    const p = new Vector3();
    const t = new Vector3();
    fillInstances(joints.current, dummy, GUIDEWAY_SEGMENTS, (i, d) => {
      const u = i / GUIDEWAY_SEGMENTS;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      d.position.copy(p);
      d.rotation.y = Math.atan2(t.x, t.z);
    });
    fillInstances(walkway.current, dummy, GUIDEWAY_SEGMENTS, (i, d) => {
      const u = (i + 0.5) / GUIDEWAY_SEGMENTS;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      d.position.set(p.x + t.z * 1.08, p.y + 0.5, p.z - t.x * 1.08);
      d.rotation.y = Math.atan2(t.x, t.z);
      d.scale.z = segLen * 1.06;
    });
  }, [curve, dummy, segLen]);
  return (
    <group>
      <instancedMesh ref={joints} args={[undefined, undefined, GUIDEWAY_SEGMENTS]}>
        <boxGeometry args={[1.9, 1.7, 0.5]} />
        <meshStandardMaterial color="#6a6a72" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={walkway} args={[undefined, undefined, GUIDEWAY_SEGMENTS]}>
        <boxGeometry args={[0.7, 0.1, 1]} />
        <meshStandardMaterial color="#8a8a90" roughness={1} />
      </instancedMesh>
    </group>
  );
}

function TrainCar({ index, winMat, stripeMat, headMat }: { index: number; winMat?: React.Ref<MeshStandardMaterial>; stripeMat?: React.Ref<MeshStandardMaterial>; headMat?: React.Ref<MeshStandardMaterial> }) {
  const windows = [-3.2, -1.9, -0.6, 0.7, 2.0, 3.3];
  const seats = [-2.9, -1.6, -0.3, 1.0, 2.3];
  return (
    <group>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[2.4, 2.6, 8.4]} />
        <meshStandardMaterial color="#e8e8f2" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <boxGeometry args={[2.2, 0.16, 8.2]} />
        <meshStandardMaterial color="#c3c7d2" roughness={0.5} metalness={0.5} />
      </mesh>
      {[-2.4, 0.4, 3.0].map((z) => (
        <mesh key={z} position={[0, 3.12, z]}>
          <boxGeometry args={[1.4, 0.26, 1.6]} />
          <meshStandardMaterial color="#9a95a8" roughness={0.7} />
        </mesh>
      ))}
      {[-1, 1].map((s) =>
        windows.map((z) => (
          <mesh key={`${s}${z}`} position={[s * 1.21, 2.0, z]}>
            <boxGeometry args={[0.04, 0.9, 1.0]} />
            <meshStandardMaterial ref={index === 0 && s === 1 && z === windows[0] ? winMat : undefined} color="#2a4a6a" emissive="#9fd8ff" emissiveIntensity={1.0} roughness={0.08} metalness={0.6} toneMapped={false} />
          </mesh>
        )),
      )}
      {[-1, 1].map((s) =>
        [-2.6, 2.6].map((z) => (
          <group key={`d${s}${z}`} position={[s * 1.215, 1.35, z]}>
            <mesh>
              <boxGeometry args={[0.03, 2.0, 1.3]} />
              <meshStandardMaterial color="#1d1d3f" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[0.04, 0.7, 1.0]} />
              <meshStandardMaterial color="#2a4a6a" emissive="#9fd8ff" emissiveIntensity={1.0} roughness={0.08} metalness={0.6} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.05, 2.0, 0.03]} />
              <meshStandardMaterial color="#9a95a8" />
            </mesh>
          </group>
        )),
      )}
      {seats.map((z, k) =>
        [-0.7, 0.7].map((x) => (
          <group key={`${z}${x}`} position={[x, 1.55, z]}>
            <mesh position={[0, -0.15, 0]}>
              <boxGeometry args={[0.5, 0.1, 0.5]} />
              <meshStandardMaterial color="#2a3a7a" />
            </mesh>
            {(k + (x > 0 ? 1 : 0) + index) % 3 !== 0 && (
              <>
                <mesh position={[0, 0.15, 0]}>
                  <boxGeometry args={[0.36, 0.5, 0.22]} />
                  <meshStandardMaterial color={["#ff4fa3", "#49d2f2", "#d6b56e", "#f4f1ea", "#c8102e"][(k + index) % 5]} roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.55, 0]}>
                  <sphereGeometry args={[0.14, 7, 6]} />
                  <meshStandardMaterial color={["#e0ac7e", "#8d5524", "#f1c9a5", "#5c3a1e"][(k + x > 0 ? 1 : 0) % 4]} roughness={0.7} />
                </mesh>
              </>
            )}
          </group>
        )),
      )}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.5, 0.28, 8.2]} />
        <meshStandardMaterial ref={index === 0 ? stripeMat : undefined} color="#ff4fa3" emissive="#ff4fa3" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.4, 0.5, 7.6]} />
        <meshStandardMaterial color="#2a2a44" roughness={0.9} />
      </mesh>
      {[-2.6, 2.6].map((z) => (
        <group key={z} position={[0, 0.05, z]}>
          <mesh>
            <boxGeometry args={[2.0, 0.4, 1.8]} />
            <meshStandardMaterial color="#15151c" roughness={0.9} />
          </mesh>
          {[-1, 1].map((s) =>
            [-0.6, 0.6].map((wz) => (
              <mesh key={`${s}${wz}`} position={[s * 0.95, -0.1, wz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.32, 0.32, 0.22, 12]} />
                <meshStandardMaterial color="#3a3a46" metalness={0.6} roughness={0.4} />
              </mesh>
            )),
          )}
        </group>
      ))}
      {index === 0 && (
        <>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x, 1.2, 4.22]}>
              <boxGeometry args={[0.4, 0.22, 0.06]} />
              <meshStandardMaterial ref={x < 0 ? headMat : undefined} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={2} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0, 2.4, 4.22]}>
            <boxGeometry args={[1.6, 0.9, 0.06]} />
            <meshStandardMaterial color="#2a4a6a" emissive="#9fd8ff" emissiveIntensity={0.8} roughness={0.08} metalness={0.6} toneMapped={false} />
          </mesh>
          <mesh position={[0, 2.78, 4.23]}>
            <boxGeometry args={[1.4, 0.26, 0.04]} />
            <meshStandardMaterial color="#ffb02e" emissive="#ffb02e" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </>
      )}
      {index === 2 &&
        [-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, 1.2, -4.22]}>
            <boxGeometry args={[0.4, 0.22, 0.06]} />
            <meshStandardMaterial color="#ff3344" emissive="#ff2a3c" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        ))}
    </group>
  );
}

function Train({ curve }: { curve: CatmullRomCurve3 }) {
  const dn = useDayNight();
  const cars = useRef<(Group | null)[]>([]);
  const winMat = useRef<MeshStandardMaterial>(null);
  const stripeMat = useRef<MeshStandardMaterial>(null);
  const headMat = useRef<MeshStandardMaterial>(null);
  const len = useMemo(() => curve.getLength(), [curve]);
  const spacing = 9.2 / len;
  const tmp = useMemo(() => ({ p: new Vector3(), t: new Vector3(), look: new Vector3() }), []);
  useEffect(() => {
    if (winMat.current) winMat.current.emissiveIntensity = 0.3 + dn.night * 1.8;
    if (stripeMat.current) stripeMat.current.emissiveIntensity = 1.2 + dn.night * 2.2;
    if (headMat.current) headMat.current.emissiveIntensity = 0.4 + dn.night * 3;
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
          <TrainCar index={i} winMat={winMat} stripeMat={stripeMat} headMat={headMat} />
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
      <Guideway curve={curve} />
      <Pylons curve={curve} />
      <Train curve={curve} />
    </group>
  );
}
