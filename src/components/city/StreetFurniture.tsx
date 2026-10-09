"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, InstancedMesh, Object3D, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useDayNight } from "./DayNightContext";
import { labelTexture } from "./labels";
import { BLOCK, COLS, ROWS, blockCenter, outerRoadLinesX, outerRoadLinesZ } from "./layout";
import { mulberry32, pick, range } from "./rng";

type Kind = "hydrant" | "bin" | "bench" | "rack" | "bike" | "paper" | "mailbox" | "cone" | "manhole" | "drain" | "ramp";

interface Item {
  kind: Kind;
  x: number;
  z: number;
  rot: number;
  y?: number;
  tilt?: number;
  color?: Color;
}

const RAMP_LENGTH = 1.4;
const CURB_HEIGHT = 0.4;
const BIKE_OUTWARD = 0.4;

function nonIdx<T extends BufferGeometry>(g: T) {
  return g.toNonIndexed();
}

function hydrantGeometry() {
  const body = nonIdx(new CylinderGeometry(0.14, 0.17, 0.7, 8));
  body.translate(0, 0.35, 0);
  const cap = nonIdx(new SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  cap.translate(0, 0.7, 0);
  const nozzleL = nonIdx(new CylinderGeometry(0.07, 0.07, 0.16, 6));
  nozzleL.rotateZ(Math.PI / 2);
  nozzleL.translate(-0.2, 0.42, 0);
  const nozzleR = nozzleL.clone();
  nozzleR.translate(0.4, 0, 0);
  const front = nonIdx(new CylinderGeometry(0.06, 0.06, 0.14, 6));
  front.rotateX(Math.PI / 2);
  front.translate(0, 0.5, 0.2);
  const base = nonIdx(new CylinderGeometry(0.2, 0.22, 0.08, 8));
  base.translate(0, 0.04, 0);
  return mergeGeometries([body, cap, nozzleL, nozzleR, front, base])!;
}
function binGeometry() {
  const body = nonIdx(new CylinderGeometry(0.34, 0.3, 0.95, 10));
  body.translate(0, 0.475, 0);
  const lid = nonIdx(new CylinderGeometry(0.37, 0.37, 0.08, 10));
  lid.translate(0, 0.99, 0);
  const band = nonIdx(new CylinderGeometry(0.355, 0.355, 0.06, 10));
  band.translate(0, 0.5, 0);
  return mergeGeometries([body, lid, band])!;
}
function benchGeometry() {
  const seat = nonIdx(new BoxGeometry(1.8, 0.07, 0.5));
  seat.translate(0, 0.46, 0);
  const back = nonIdx(new BoxGeometry(1.8, 0.4, 0.06));
  back.rotateX(-0.15);
  back.translate(0, 0.76, -0.24);
  const legs = [-0.75, 0.75].map((x) => {
    const l = nonIdx(new BoxGeometry(0.08, 0.46, 0.46));
    l.translate(x, 0.23, 0);
    return l;
  });
  const arm = [-0.88, 0.88].map((x) => {
    const a = nonIdx(new BoxGeometry(0.05, 0.05, 0.5));
    a.translate(x, 0.72, 0);
    return a;
  });
  return mergeGeometries([seat, back, ...legs, ...arm])!;
}
function rackGeometry() {
  const u = nonIdx(new TorusGeometry(0.4, 0.03, 6, 14, Math.PI));
  u.translate(0, 0.4, 0);
  return u;
}
function bikeGeometry() {
  const wheelA = nonIdx(new TorusGeometry(0.34, 0.025, 6, 16));
  wheelA.translate(-0.52, 0.34, 0);
  const wheelB = wheelA.clone();
  wheelB.translate(1.04, 0, 0);
  const down = nonIdx(new BoxGeometry(0.75, 0.04, 0.04));
  down.rotateZ(0.55);
  down.translate(-0.2, 0.55, 0);
  const top = nonIdx(new BoxGeometry(0.6, 0.04, 0.04));
  top.translate(0.0, 0.82, 0);
  const seatTube = nonIdx(new BoxGeometry(0.04, 0.5, 0.04));
  seatTube.rotateZ(-0.25);
  seatTube.translate(-0.28, 0.6, 0);
  const fork = nonIdx(new BoxGeometry(0.04, 0.55, 0.04));
  fork.rotateZ(0.3);
  fork.translate(0.42, 0.62, 0);
  const bars = nonIdx(new BoxGeometry(0.04, 0.03, 0.5));
  bars.translate(0.36, 0.95, 0);
  const seat = nonIdx(new BoxGeometry(0.24, 0.05, 0.12));
  seat.translate(-0.3, 0.92, 0);
  return mergeGeometries([wheelA, wheelB, down, top, seatTube, fork, bars, seat])!;
}
function paperGeometry() {
  const b = nonIdx(new BoxGeometry(0.5, 1.0, 0.5));
  b.translate(0, 0.5, 0);
  const w = nonIdx(new BoxGeometry(0.4, 0.4, 0.04));
  w.translate(0, 0.72, 0.26);
  return mergeGeometries([b, w])!;
}
function mailboxGeometry() {
  const b = nonIdx(new BoxGeometry(0.6, 0.7, 0.5));
  b.translate(0, 0.75, 0);
  const top = nonIdx(new CylinderGeometry(0.25, 0.25, 0.6, 10, 1, false, 0, Math.PI));
  top.rotateZ(Math.PI / 2);
  top.rotateY(Math.PI / 2);
  top.translate(0, 1.1, 0);
  const legs = [-0.2, 0.2].map((x) => {
    const l = nonIdx(new BoxGeometry(0.05, 0.4, 0.05));
    l.translate(x, 0.2, 0);
    return l;
  });
  return mergeGeometries([b, top, ...legs])!;
}
function coneGeometry() {
  const c = nonIdx(new CylinderGeometry(0.04, 0.18, 0.6, 8));
  c.translate(0, 0.3, 0);
  const base = nonIdx(new BoxGeometry(0.42, 0.04, 0.42));
  base.translate(0, 0.02, 0);
  return mergeGeometries([c, base])!;
}

function manholeGeometry() {
  const lid = nonIdx(new CylinderGeometry(0.45, 0.45, 0.05, 14));
  lid.translate(0, 0.025, 0);
  const rim = nonIdx(new CylinderGeometry(0.52, 0.52, 0.03, 14));
  rim.translate(0, 0.015, 0);
  return mergeGeometries([lid, rim])!;
}
function drainGeometry() {
  const frame = nonIdx(new BoxGeometry(0.9, 0.05, 0.42));
  frame.translate(0, 0.025, 0);
  const bars = [-0.3, -0.1, 0.1, 0.3].map((x) => {
    const b = nonIdx(new BoxGeometry(0.06, 0.08, 0.34));
    b.translate(x, 0.04, 0);
    return b;
  });
  return mergeGeometries([frame, ...bars])!;
}
function rampGeometry() {
  const r = nonIdx(new BoxGeometry(1.6, CURB_HEIGHT, RAMP_LENGTH));
  return r;
}

function buildItems(): Item[] {
  const rand = mulberry32(2024);
  const out: Item[] = [];
  const e = BLOCK / 2 + 0.9;
  const padEdge = BLOCK / 2 + 1.2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const [bx, bz] = blockCenter(c, r);
      const sides: [number, number, number][] = [
        [bx, bz + e, 0],
        [bx, bz - e, Math.PI],
        [bx + e, bz, -Math.PI / 2],
        [bx - e, bz, Math.PI / 2],
      ];
      for (const [sx, sz, rot] of sides) {
        const along = (t: number): [number, number] => (rot === 0 || rot === Math.PI ? [sx + t, sz] : [sx, sz + t]);
        const place = (kind: Kind, t: number, color?: Color) => {
          const [x, z] = along(t);
          out.push({ kind, x, z, rot, color });
        };
        if (rand() < 0.55) place("hydrant", range(rand, -8, 8));
        if (rand() < 0.7) place("bin", range(rand, -8, 8), new Color(pick(rand, ["#2f4a3a", "#3a3a46", "#1d1d3f"])));
        if (rand() < 0.4) place("bench", range(rand, -6, 6));
        if (rand() < 0.3) {
          const t0 = range(rand, -6, 4);
          for (let k = 0; k < 3; k++) {
            place("rack", t0 + k * 0.9);
            if (rand() < 0.6) place("bike", t0 + k * 0.9, new Color(pick(rand, ["#c8102e", "#1d1d3f", "#49d2f2", "#f4f1ea", "#d6b56e", "#3f8a6a"])));
          }
        }
        if (rand() < 0.35) place("paper", range(rand, -8, 8), new Color(pick(rand, ["#2a3a7a", "#c8102e", "#ffb02e", "#3f8a6a"])));
        if (rand() < 0.15) place("mailbox", range(rand, -8, 8));
        const nx = -Math.sin(rot);
        const nz = Math.cos(rot);
        const offRoad = (t: number, dist: number): [number, number] => {
          const [x, z] = along(t);
          return [x + nx * dist, z + nz * dist];
        };
        if (rand() < 0.5) {
          const [x, z] = offRoad(range(rand, -7, 7), BLOCK / 2 + 3.5 - e);
          out.push({ kind: "manhole", x, z, rot, y: 0 });
        }
        if (rand() < 0.6) {
          const [x, z] = offRoad(range(rand, -8, 8), padEdge + 0.45 - e);
          out.push({ kind: "drain", x, z, rot, y: 0 });
        }
        for (const t of [-8.9, 8.9]) {
          const [x, z] = offRoad(t, padEdge - e);
          out.push({ kind: "ramp", x, z, rot, y: CURB_HEIGHT / 2, tilt: Math.atan(CURB_HEIGHT / RAMP_LENGTH) });
        }
      }
    }
  }
  const xs = outerRoadLinesX();
  const zs = outerRoadLinesZ();
  const cx = xs[9] ?? 0;
  const cz = zs[4] ?? 0;
  for (let k = 0; k < 7; k++) out.push({ kind: "cone", x: cx + 1.2 + k * 0.9, z: cz - 3.2 + (k % 2) * 0.6, rot: 0 });
  return out;
}

function BusShelter({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const dn = useDayNight();
  const sign = useMemo(() => labelTexture("DDOT · WOODWARD", { width: 512, height: 128, bg: "#1d1d3f", fg: "#f4f1ea", border: "#d6b56e" }), []);
  const ad = useMemo(() => labelTexture("J. ADAMS · NEW SINGLE", { width: 256, height: 384, bg: "#07060f", fg: "#f3dfae", border: "#d6b56e", size: 44 }), []);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[4, 0.12, 1.8]} />
        <meshStandardMaterial color="#2a2a44" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.25, -0.85]}>
        <boxGeometry args={[4, 2.5, 0.05]} />
        <meshStandardMaterial color="#9fd8ff" roughness={0.05} metalness={0.3} transparent opacity={0.35} />
      </mesh>
      {[-1.95, 1.95].map((x) => (
        <mesh key={x} position={[x, 1.25, -0.4]}>
          <boxGeometry args={[0.05, 2.5, 0.9]} />
          <meshStandardMaterial color="#9fd8ff" roughness={0.05} metalness={0.3} transparent opacity={0.35} />
        </mesh>
      ))}
      {[-1.98, 1.98].map((x) =>
        [-0.85, 0.05].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 1.25, z]}>
            <boxGeometry args={[0.08, 2.5, 0.08]} />
            <meshStandardMaterial color="#2a2a44" metalness={0.5} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.45, -0.5]}>
        <boxGeometry args={[3.2, 0.08, 0.45]} />
        <meshStandardMaterial color="#5a4636" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.46, 0]}>
        <boxGeometry args={[3.6, 0.04, 1.2]} />
        <meshStandardMaterial color="#fff6d8" emissive="#fff2c0" emissiveIntensity={0.2 + dn.night * 1.6} toneMapped={false} />
      </mesh>
      <mesh position={[-1.5, 1.6, -0.82]}>
        <boxGeometry args={[0.9, 1.3, 0.03]} />
        <meshStandardMaterial map={ad} emissiveMap={ad} emissive="#ffffff" emissiveIntensity={dn.night * 0.8} />
      </mesh>
      <mesh position={[2.4, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3.2, 6]} />
        <meshStandardMaterial color="#5a5a78" />
      </mesh>
      <mesh position={[2.4, 3.0, 0]}>
        <boxGeometry args={[0.9, 0.3, 0.04]} />
        <meshStandardMaterial map={sign} />
      </mesh>
    </group>
  );
}

const KINDS: Kind[] = ["hydrant", "bin", "bench", "rack", "bike", "paper", "mailbox", "cone", "manhole", "drain", "ramp"];

export default function StreetFurniture() {
  const [items] = useState(() => buildItems());
  const refs = useRef(new Map<Kind, InstancedMesh>());
  const geos = useMemo<Record<Kind, BufferGeometry>>(
    () => ({ hydrant: hydrantGeometry(), bin: binGeometry(), bench: benchGeometry(), rack: rackGeometry(), bike: bikeGeometry(), paper: paperGeometry(), mailbox: mailboxGeometry(), cone: coneGeometry(), manhole: manholeGeometry(), drain: drainGeometry(), ramp: rampGeometry() }),
    [],
  );
  const counts = useMemo(() => {
    const c = {} as Record<Kind, number>;
    for (const k of KINDS) c[k] = items.filter((i) => i.kind === k).length;
    return c;
  }, [items]);
  useEffect(() => {
    const d = new Object3D();
    d.rotation.order = "YXZ";
    const idx = {} as Record<Kind, number>;
    for (const k of KINDS) idx[k] = 0;
    for (const it of items) {
      const m = refs.current.get(it.kind);
      if (!m) continue;
      const i = idx[it.kind]++;
      const bikeOut = it.kind === "bike" ? BIKE_OUTWARD : 0;
      d.position.set(it.x - Math.sin(it.rot) * bikeOut, it.y ?? CURB_HEIGHT, it.z + Math.cos(it.rot) * bikeOut);
      d.rotation.set(it.tilt ?? 0, it.rot + (it.kind === "bike" ? Math.PI / 2 : 0), 0);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      if (it.color) m.setColorAt(i, it.color);
    }
    for (const m of refs.current.values()) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, [items]);
  const colors: Record<Kind, string> = { hydrant: "#c8102e", bin: "#ffffff", bench: "#5a4636", rack: "#8a8f9c", bike: "#ffffff", paper: "#ffffff", mailbox: "#2a3a7a", cone: "#ff7a1a", manhole: "#3a3a40", drain: "#2a2a30", ramp: "#8a84a0" };
  const xs = outerRoadLinesX();
  const zs = outerRoadLinesZ();
  const shelters: { position: [number, number, number]; rotation: number }[] = [
    { position: [xs[10] + 6, 0.4, zs[12] + 2.4], rotation: 0 },
    { position: [xs[8] - 6, 0.4, zs[11] - 2.4], rotation: Math.PI },
    { position: [xs[12] + 2.4, 0.4, zs[10] + 6], rotation: Math.PI / 2 },
  ];
  return (
    <group>
      {KINDS.map((k) => (
        <instancedMesh
          key={k}
          ref={(m) => {
            if (m) refs.current.set(k, m);
            else refs.current.delete(k);
          }}
          args={[geos[k], undefined, Math.max(1, counts[k])]}
          frustumCulled={false}
        >
          <meshStandardMaterial color={colors[k]} roughness={k === "rack" || k === "bike" ? 0.35 : 0.8} metalness={k === "rack" || k === "bike" || k === "manhole" ? 0.7 : 0.1} />
        </instancedMesh>
      ))}
      {shelters.map((s, i) => (
        <BusShelter key={i} {...s} />
      ))}
    </group>
  );
}
