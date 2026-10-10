"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { BoxGeometry, type BufferGeometry, Color, CylinderGeometry, InstancedMesh, Matrix4, Object3D, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function merged(parts: BufferGeometry[], label: string) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  if (!g) throw new Error(`${label} parts could not be merged`);
  return g;
}

const DRONE = merged(
  [
    new BoxGeometry(1.2, 0.34, 1.2),
    new BoxGeometry(3.4, 0.12, 0.2).rotateY(Math.PI / 4),
    new BoxGeometry(3.4, 0.12, 0.2).rotateY(-Math.PI / 4),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new CylinderGeometry(0.62, 0.62, 0.05, 12).translate(sx * 1.2, 0.16, sz * 1.2))),
    new SphereGeometry(0.28, 8, 6).translate(0, -0.3, 0.2),
  ],
  "drone",
);

const AIR_TAXI = merged(
  [
    new SphereGeometry(1, 16, 10).scale(1.3, 0.75, 2.8),
    new BoxGeometry(6, 0.16, 1.1).translate(0, -0.1, -0.5),
    ...[-1, 1].map((s) => new CylinderGeometry(0.85, 0.85, 0.36, 16).translate(s * 3.1, -0.1, -0.5)),
    new BoxGeometry(0.14, 0.9, 1).translate(0, 0.55, -2.3),
  ],
  "air taxi",
);

const LIGHT = new BoxGeometry(1, 1, 1);

type Kind = "drone" | "taxi";
interface Lane {
  kind: Kind;
  count: number;
  y: number;
  speed: number;
  ring?: { cx: number; cz: number; rx: number; rz: number };
  line?: { z: number; half: number };
  dir: 1 | -1;
}

const LANES: Lane[] = [
  { kind: "drone", count: 8, y: 108, speed: 9, ring: { cx: 0, cz: -10, rx: 150, rz: 92 }, dir: 1 },
  { kind: "drone", count: 6, y: 124, speed: 8, ring: { cx: 10, cz: -20, rx: 90, rz: 60 }, dir: -1 },
  { kind: "drone", count: 5, y: 58, speed: 10, line: { z: 118, half: 700 }, dir: 1 },
  { kind: "taxi", count: 4, y: 36, speed: 20, line: { z: 138, half: 700 }, dir: 1 },
  { kind: "taxi", count: 4, y: 44, speed: 18, line: { z: 152, half: 700 }, dir: -1 },
  { kind: "taxi", count: 4, y: 132, speed: 16, ring: { cx: 0, cz: -10, rx: 210, rz: 135 }, dir: 1 },
];

interface Craft {
  lane: Lane;
  phase: number;
}

interface LightSpec {
  offset: Matrix4;
  color: Color;
  blink: boolean;
}

const CYAN = new Color("#49f2d6").multiplyScalar(3);
const MAGENTA = new Color("#ff4fa3").multiplyScalar(3);
const BLINK_RED = new Color("#ff2a3c").multiplyScalar(4);

function lightAt(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, sz));
}

const DRONE_LIGHTS: LightSpec[] = [
  { offset: lightAt(0, -0.22, 0, 1.6, 0.06, 1.6), color: CYAN, blink: false },
  { offset: lightAt(0, 0.24, 0, 0.18, 0.18, 0.18), color: BLINK_RED, blink: true },
];
const TAXI_LIGHTS: LightSpec[] = [
  { offset: lightAt(0, 0.05, 2.75, 1.6, 0.12, 0.12), color: CYAN, blink: false },
  { offset: lightAt(0, 0.1, -2.75, 1.4, 0.12, 0.12), color: MAGENTA, blink: false },
  { offset: lightAt(0, -0.72, 0, 1.6, 0.05, 3.2), color: CYAN, blink: false },
];

function buildFleet() {
  const drones: Craft[] = [];
  const taxis: Craft[] = [];
  for (const lane of LANES) {
    for (let k = 0; k < lane.count; k++) (lane.kind === "drone" ? drones : taxis).push({ lane, phase: k / lane.count });
  }
  const lightCount = drones.length * DRONE_LIGHTS.length + taxis.length * TAXI_LIGHTS.length;
  const colors = new Float32Array(lightCount * 3);
  let slot = 0;
  for (const specs of [...drones.map(() => DRONE_LIGHTS), ...taxis.map(() => TAXI_LIGHTS)]) {
    for (const s of specs) s.color.toArray(colors, slot++ * 3);
  }
  return { drones, taxis, lightCount, colors };
}

function poseCraft(c: Craft, time: number, d: Object3D) {
  const { lane } = c;
  if (lane.ring) {
    const r = lane.ring;
    const omega = lane.speed / ((r.rx + r.rz) / 2);
    const a = (c.phase * Math.PI * 2 + time * omega) * lane.dir;
    d.position.set(r.cx + Math.cos(a) * r.rx, lane.y + Math.sin(a * 3 + c.phase * 9) * 1.5, r.cz + Math.sin(a) * r.rz);
    const tx = -Math.sin(a) * r.rx * lane.dir;
    const tz = Math.cos(a) * r.rz * lane.dir;
    d.rotation.set(0, Math.atan2(tx, tz), lane.kind === "taxi" ? -0.12 * lane.dir : 0);
  } else if (lane.line) {
    const span = lane.line.half * 2;
    const along = ((c.phase * span + time * lane.speed) % span) - lane.line.half;
    d.position.set(along * lane.dir, lane.y + Math.sin(time * 0.8 + c.phase * 7) * 0.8, lane.line.z);
    d.rotation.set(0, lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
  }
  d.updateMatrix();
}

const lightMatrix = new Matrix4();
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

function placeFleet(crafts: Craft[], specs: LightSpec[], body: InstancedMesh, lights: InstancedMesh, firstLight: number, time: number, d: Object3D) {
  let slot = firstLight;
  for (let i = 0; i < crafts.length; i++) {
    poseCraft(crafts[i], time, d);
    body.setMatrixAt(i, d.matrix);
    for (const s of specs) {
      const on = !s.blink || Math.sin(time * 6 + i * 1.7) > 0.6;
      lights.setMatrixAt(slot++, on ? lightMatrix.multiplyMatrices(d.matrix, s.offset) : HIDDEN);
    }
  }
  body.instanceMatrix.needsUpdate = true;
  return slot;
}

export default function SkyTraffic() {
  const [fleet] = useState(buildFleet);
  const [dummy] = useState(() => new Object3D());
  const drones = useRef<InstancedMesh>(null);
  const taxis = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  useFrame(({ clock }) => {
    if (!drones.current || !taxis.current || !lights.current) return;
    const t = clock.elapsedTime;
    const next = placeFleet(fleet.drones, DRONE_LIGHTS, drones.current, lights.current, 0, t, dummy);
    placeFleet(fleet.taxis, TAXI_LIGHTS, taxis.current, lights.current, next, t, dummy);
    lights.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="sky-traffic">
      <instancedMesh ref={drones} args={[DRONE, undefined, fleet.drones.length]} frustumCulled={false}>
        <meshStandardMaterial color="#2b2d33" metalness={0.6} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={taxis} args={[AIR_TAXI, undefined, fleet.taxis.length]} frustumCulled={false}>
        <meshStandardMaterial color="#d9dde3" metalness={0.55} roughness={0.28} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[LIGHT, undefined, fleet.lightCount]} frustumCulled={false}>
        <instancedBufferAttribute attach="instanceColor" args={[fleet.colors, 3]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
