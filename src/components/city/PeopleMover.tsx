"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  type CanvasTexture,
  DoubleSide,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";
import { fillInstances } from "./instancing";
import { labelTexture } from "./labels";
import { PEOPLE_MOVER_X, PEOPLE_MOVER_Z, ROAD_HALF, roadLinesX, roadLinesZ } from "./layout";
import { enableReflection } from "./layers";
import { makeStainedConcreteTexture } from "./textures";

const TRACK_Y = 9;

function buildLoop() {
  const xs = roadLinesX();
  const zs = roadLinesZ();
  const [x0, x1] = PEOPLE_MOVER_X.map((i) => xs[i]);
  const [z0, z1] = PEOPLE_MOVER_Z.map((i) => zs[i]);
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

const PYLON_CANDIDATES = 64;
const INTERSECTION_CLEAR = ROAD_HALF + 1.5;

function distanceToNearest(v: number, lines: number[]) {
  let best = Infinity;
  for (const l of lines) best = Math.min(best, Math.abs(v - l));
  return best;
}

function pylonSpots(curve: CatmullRomCurve3) {
  const xs = roadLinesX();
  const zs = roadLinesZ();
  const spots: { u: number; p: Vector3 }[] = [];
  for (let i = 0; i < PYLON_CANDIDATES; i++) {
    const u = i / PYLON_CANDIDATES;
    const p = curve.getPointAt(u);
    const inIntersection = distanceToNearest(p.x, xs) < INTERSECTION_CLEAR && distanceToNearest(p.z, zs) < INTERSECTION_CLEAR;
    if (!inIntersection) spots.push({ u, p });
  }
  return spots;
}

function Pylons({ curve, concrete }: { curve: CatmullRomCurve3; concrete: CanvasTexture }) {
  const ref = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  const feet = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const spots = useMemo(() => pylonSpots(curve), [curve]);
  const count = spots.length;
  useEffect(() => {
    const t = new Vector3();
    fillInstances(ref.current, dummy, count, (i, d) => {
      d.position.set(spots[i].p.x, TRACK_Y / 2 - 0.3, spots[i].p.z);
    });
    fillInstances(caps.current, dummy, count, (i, d) => {
      curve.getTangentAt(spots[i].u, t);
      d.position.set(spots[i].p.x, TRACK_Y - 0.85, spots[i].p.z);
      d.rotation.y = Math.atan2(t.x, t.z);
    });
    fillInstances(feet.current, dummy, count, (i, d) => {
      d.position.set(spots[i].p.x, 0.55, spots[i].p.z);
    });
  }, [curve, dummy, spots, count]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.55, 0.8, TRACK_Y - 0.6, 10]} />
        <meshStandardMaterial color="#b5b0a6" map={concrete} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[2.6, 0.5, 1.6]} />
        <meshStandardMaterial color="#a9a59c" map={concrete} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={feet} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[1.1, 1.3, 0.3, 10]} />
        <meshStandardMaterial color="#9c988f" map={concrete} roughness={1} />
      </instancedMesh>
    </group>
  );
}

const GUIDEWAY_SEGMENTS = 160;
const LED_GOLD = "#f3c46e";
const LED_OFFSET = 0.77;
const MAGLEV_PULSE = new Color("#fff3d0").multiplyScalar(4);

function setLedGlow(mat: MeshStandardMaterial, night: number) {
  mat.emissiveIntensity = 0.8 + night * 1.6;
}

function Guideway({ curve, concrete }: { curve: CatmullRomCurve3; concrete: CanvasTexture }) {
  const joints = useRef<InstancedMesh>(null);
  const walkway = useRef<InstancedMesh>(null);
  const beam = useRef<InstancedMesh>(null);
  const railL = useRef<InstancedMesh>(null);
  const railR = useRef<InstancedMesh>(null);
  const tray = useRef<InstancedMesh>(null);
  const leds = useRef<InstancedMesh>(null);
  const dn = useDayNight();
  const [led] = useState(() => new MeshStandardMaterial({ color: "#2a2620", emissive: LED_GOLD, emissiveIntensity: 0, toneMapped: false }));
  useEffect(() => () => led.dispose(), [led]);
  useEffect(() => setLedGlow(led, dn.night), [led, dn.night]);
  const dummy = useMemo(() => new Object3D(), []);
  const segLen = useMemo(() => curve.getLength() / GUIDEWAY_SEGMENTS, [curve]);
  useEffect(() => {
    const p = new Vector3();
    const t = new Vector3();
    const along = (ref: InstancedMesh | null, ox: number, oy: number, stretch: number) =>
      fillInstances(ref, dummy, GUIDEWAY_SEGMENTS, (i, d) => {
        const u = (i + 0.5) / GUIDEWAY_SEGMENTS;
        curve.getPointAt(u, p);
        curve.getTangentAt(u, t);
        d.position.set(p.x + t.z * ox, p.y + oy, p.z - t.x * ox);
        d.rotation.y = Math.atan2(t.x, t.z);
        d.scale.z = segLen * stretch;
      });
    fillInstances(joints.current, dummy, GUIDEWAY_SEGMENTS, (i, d) => {
      const u = i / GUIDEWAY_SEGMENTS;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      d.position.copy(p);
      d.rotation.y = Math.atan2(t.x, t.z);
    });
    along(walkway.current, 1.08, 0.5, 1.06);
    along(beam.current, 0, 0, 1.08);
    along(railL.current, -0.55, 0.72, 1.08);
    along(railR.current, 0.55, 0.72, 1.08);
    along(tray.current, -1.05, -0.1, 1.06);
    fillInstances(leds.current, dummy, GUIDEWAY_SEGMENTS * 2, (i, d) => {
      const u = (Math.floor(i / 2) + 0.5) / GUIDEWAY_SEGMENTS;
      const side = i % 2 === 0 ? -LED_OFFSET : LED_OFFSET;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      d.position.set(p.x + t.z * side, p.y - 0.38, p.z - t.x * side);
      d.rotation.y = Math.atan2(t.x, t.z);
      d.scale.z = segLen * 1.08;
    });
  }, [curve, dummy, segLen]);
  return (
    <group>
      <instancedMesh ref={beam} args={[undefined, undefined, GUIDEWAY_SEGMENTS]} castShadow>
        <boxGeometry args={[1.5, 1.3, 1]} />
        <meshStandardMaterial color="#b0aca2" map={concrete} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={railL} args={[undefined, undefined, GUIDEWAY_SEGMENTS]}>
        <boxGeometry args={[0.14, 0.14, 1]} />
        <meshStandardMaterial color="#c7cadc" roughness={0.3} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={railR} args={[undefined, undefined, GUIDEWAY_SEGMENTS]}>
        <boxGeometry args={[0.14, 0.14, 1]} />
        <meshStandardMaterial color="#c7cadc" roughness={0.3} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={tray} args={[undefined, undefined, GUIDEWAY_SEGMENTS]}>
        <boxGeometry args={[0.36, 0.26, 1]} />
        <meshStandardMaterial color="#3a3833" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={joints} args={[undefined, undefined, GUIDEWAY_SEGMENTS]}>
        <boxGeometry args={[2.3, 1.7, 0.5]} />
        <meshStandardMaterial color="#a39f96" map={concrete} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={leds} args={[undefined, undefined, GUIDEWAY_SEGMENTS * 2]} material={led} name="people-mover-led">
        <boxGeometry args={[0.06, 0.12, 1]} />
      </instancedMesh>
      <instancedMesh ref={walkway} args={[undefined, undefined, GUIDEWAY_SEGMENTS]}>
        <boxGeometry args={[0.7, 0.1, 1]} />
        <meshStandardMaterial color="#8f8c86" roughness={1} />
      </instancedMesh>
    </group>
  );
}

function TrainCar({ index, winMat, headMat }: { index: number; winMat?: React.Ref<MeshStandardMaterial>; headMat?: React.Ref<MeshStandardMaterial> }) {
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
        <meshStandardMaterial color="#8f2a22" roughness={0.5} />
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
  const headMat = useRef<MeshStandardMaterial>(null);
  const len = useMemo(() => curve.getLength(), [curve]);
  const spacing = 9.2 / len;
  const tmp = useMemo(() => ({ p: new Vector3(), t: new Vector3(), look: new Vector3() }), []);
  useEffect(() => {
    if (winMat.current) winMat.current.emissiveIntensity = 0.3 + dn.night * 1.8;
    if (headMat.current) headMat.current.emissiveIntensity = 0.4 + dn.night * 3;
  }, [dn]);
  useFrame(({ clock }) => {
    const base = (clock.elapsedTime * 0.028) % 1;
    for (let i = 0; i < cars.current.length; i++) {
      const g = cars.current[i];
      if (!g) continue;
      const u = ((base - i * spacing) % 1 + 1) % 1;
      curve.getPointAt(u, tmp.p);
      curve.getTangentAt(u, tmp.t);
      g.position.copy(tmp.p);
      tmp.look.copy(tmp.p).add(tmp.t);
      g.lookAt(tmp.look);
    }
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
          <TrainCar index={i} winMat={winMat} headMat={headMat} />
        </group>
      ))}
    </group>
  );
}

const STATION_NAMES = ["TIMES SQUARE", "FINANCIAL DISTRICT", "RENAISSANCE CENTER", "GRAND CIRCUS PARK"];

function StationSign({ name }: { name: string }) {
  const tex = useMemo(() => labelTexture(name, { width: 512, height: 96, bg: "#1d1d3f", fg: "#f4f1ea", border: "#d6b56e", size: 56 }), [name]);
  return (
    <mesh position={[4.35, 2.9, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[6, 1.1]} />
      <meshStandardMaterial map={tex} side={DoubleSide} />
    </mesh>
  );
}

const STAIR_X = ROAD_HALF + 1.6;

function Stations({ curve }: { curve: CatmullRomCurve3 }) {
  const dn = useDayNight();
  const mat = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.3 + dn.night * 1.6;
  }, [dn]);
  const spots = useMemo(() => [0.08, 0.33, 0.58, 0.83].map((u) => ({ p: curve.getPointAt(u), t: curve.getTangentAt(u) })), [curve]);
  const stairDrop = TRACK_Y - 0.6;
  const stairRun = 7;
  const stairLen = Math.hypot(stairDrop, stairRun);
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={[s.p.x, s.p.y, s.p.z]} rotation={[0, Math.atan2(s.t.x, s.t.z), 0]}>
          <mesh position={[2.6, -0.4, 0]}>
            <boxGeometry args={[3.2, 0.4, 12]} />
            <meshStandardMaterial color="#8f8c86" />
          </mesh>
          <mesh position={[2.6, 2.6, 0]}>
            <boxGeometry args={[3.6, 0.3, 12.4]} />
            <meshStandardMaterial color="#3a3936" />
          </mesh>
          <mesh position={[2.6, 2.3, 0]}>
            <boxGeometry args={[3, 0.12, 11.6]} />
            <meshStandardMaterial ref={i === 0 ? mat : undefined} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <mesh position={[4.1, 0.4, 0]}>
            <boxGeometry args={[0.08, 1.0, 12]} />
            <meshStandardMaterial color="#9fd8ff" roughness={0.05} metalness={0.3} transparent opacity={0.35} />
          </mesh>
          {[-5, 5].map((z) => (
            <mesh key={z} position={[4, 1.2, z]}>
              <boxGeometry args={[0.2, 3.2, 0.2]} />
              <meshStandardMaterial color="#4d4f4f" />
            </mesh>
          ))}
          <StationSign name={STATION_NAMES[i]} />
          <mesh position={[(4.2 + STAIR_X - 1.1) / 2, -0.4, 5.6]}>
            <boxGeometry args={[STAIR_X - 1.1 - 4.2 + 0.4, 0.4, 2.4]} />
            <meshStandardMaterial color="#8f8c86" />
          </mesh>
          <group position={[STAIR_X, -0.6 - stairDrop / 2, 6.2 + stairRun / 2]} rotation={[Math.atan2(stairDrop, stairRun), 0, 0]}>
            <mesh>
              <boxGeometry args={[2.2, 0.5, stairLen]} />
              <meshStandardMaterial color="#7a776f" roughness={1} />
            </mesh>
            {[-1.15, 1.15].map((x) => (
              <mesh key={x} position={[x, 0.75, 0]}>
                <boxGeometry args={[0.08, 1.1, stairLen]} />
                <meshStandardMaterial color="#c7cadc" roughness={0.3} metalness={0.6} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

const PULSE_COUNT = 14;
const PULSE_SPEED = 0.045;
const PULSE = new BoxGeometry(0.09, 0.16, 3.2);
const PULSE_SAMPLES = 512;
const pulseAt = new Vector3();
const pulseHeading = new Vector3();

function sampleLoop(curve: CatmullRomCurve3) {
  const points = curve.getSpacedPoints(PULSE_SAMPLES);
  const tangents = points.map((_, i) => {
    const next = points[(i + 1) % PULSE_SAMPLES];
    const prev = points[(i - 1 + PULSE_SAMPLES) % PULSE_SAMPLES];
    return next.clone().sub(prev).normalize();
  });
  return { points, tangents };
}

function placePulses(m: InstancedMesh, d: Object3D, loop: ReturnType<typeof sampleLoop>, time: number) {
  for (let i = 0; i < PULSE_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const u = (((i / PULSE_COUNT + time * PULSE_SPEED * side) % 1) + 1) % 1;
    const f = u * PULSE_SAMPLES;
    const k = Math.floor(f) % PULSE_SAMPLES;
    const next = (k + 1) % PULSE_SAMPLES;
    const blend = f - Math.floor(f);
    const p = pulseAt.lerpVectors(loop.points[k], loop.points[next], blend);
    const t = pulseHeading.lerpVectors(loop.tangents[k], loop.tangents[next], blend).normalize();
    const offset = side * (LED_OFFSET + 0.03);
    d.position.set(p.x + t.z * offset, p.y - 0.38, p.z - t.x * offset);
    d.rotation.set(0, Math.atan2(t.x, t.z), 0);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
  }
  m.instanceMatrix.needsUpdate = true;
}

function MaglevPulses({ curve }: { curve: CatmullRomCurve3 }) {
  const ref = useRef<InstancedMesh>(null);
  const [dummy] = useState(() => new Object3D());
  const [loop] = useState(() => sampleLoop(curve));
  const { reducedMotion } = useCity();
  useFrame(({ clock }) => {
    if (ref.current) placePulses(ref.current, dummy, loop, reducedMotion ? 0 : clock.elapsedTime);
  });
  return (
    <instancedMesh ref={ref} args={[PULSE, undefined, PULSE_COUNT]} frustumCulled={false} name="maglev-pulses" userData={{ noReflect: true }}>
      <meshBasicMaterial color={MAGLEV_PULSE} toneMapped={false} />
    </instancedMesh>
  );
}

export default function PeopleMover() {
  const curve = useMemo(() => buildLoop(), []);
  const { quality } = useCity();
  const concrete = useMemo(() => makeStainedConcreteTexture(), []);
  useEffect(() => () => concrete.dispose(), [concrete]);
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  return (
    <group ref={root}>
      <Stations curve={curve} />
      <Guideway curve={curve} concrete={concrete} />
      <Pylons curve={curve} concrete={concrete} />
      <Train curve={curve} />
      {quality === "high" && <MaglevPulses curve={curve} />}
    </group>
  );
}
