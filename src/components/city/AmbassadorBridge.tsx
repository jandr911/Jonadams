"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CatmullRomCurve3, Color, InstancedMesh, MeshStandardMaterial, Object3D, TubeGeometry, Vector3 } from "three";
import { useDayNight } from "./DayNightContext";
import { fillInstances } from "./instancing";
import { AMBASSADOR_RAMP_Z, AMBASSADOR_X, RIVER_FAR, RIVER_NEAR, blockCenter } from "./layout";
import { mulberry32, pick, range } from "./rng";
import { makeAsphaltTexture } from "./textures";
import VehicleFleet, { type FleetItem, type PoseFn, type VehiclePose } from "./VehicleFleet";
import { FLEET_COLORS, type VehicleKind } from "./vehicles";

const X = AMBASSADOR_X;
const TOWER_Z = [RIVER_NEAR - 1, RIVER_FAR - 2];
const ANCHOR_Z = [TOWER_Z[0] - 30, TOWER_Z[1] + 30];
const [RAMP_Z0, RAMP_Z1] = AMBASSADOR_RAMP_Z;
const TOWER_H = 50;
const PIER_TOP = 4;
const DECK_Y = 19;
const DECK_W = 11;
const CABLE_X = 5.6;
const LEG_X = 6.4;
const SAG = 3;
const ABUTMENT_Y = 2.6;
const SEG = 4;
const TRUSS_DEPTH = 2.6;
const TRUSS_X = 5.1;
const TRUSS_BAYS = 32;
const HANGER_STEP = 3;
const CITY_PIERS = [4, 3].map((r) => blockCenter(-3, r)[1]);
const WINDSOR_PIERS = [23, 43, 63, 83].map((d) => ANCHOR_Z[1] + d);
const STEEL = "#5a8799";
const STEEL_DARK = "#43687a";
const CONCRETE = "#8d8a84";
const LINE_YELLOW = new Color("#e6d98a");
const LINE_WHITE = new Color("#d8d8d2");
const LANES = [-4.0, -1.4, 1.4, 4.0];
const LANE_SPEED = [12, 16, 16, 12];
const PER_LANE = 11;
const FLEET_Z0 = RAMP_Z0 + 1;
const FLEET_Z1 = RAMP_Z1 - 1;
const SEMI_COLORS = ["#f4f1ea", "#c8102e", "#1d2a6a", "#2f4f3a", "#15151c", "#d6b56e"];

const HANGER_Z: number[] = [];
for (let z = ANCHOR_Z[0] + 3; z <= ANCHOR_Z[1] - 3; z += HANGER_STEP) HANGER_Z.push(z);

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function deckY(z: number) {
  const rise = DECK_Y - ABUTMENT_Y;
  const a0 = ANCHOR_Z[0] - 3;
  const a1 = ANCHOR_Z[1] + 3;
  if (z < a0) return ABUTMENT_Y + rise * smooth((z - RAMP_Z0) / (a0 - RAMP_Z0));
  if (z > a1) return ABUTMENT_Y + rise * smooth((RAMP_Z1 - z) / (RAMP_Z1 - a1));
  return DECK_Y;
}

function cableY(z: number) {
  const low = DECK_Y + SAG;
  const end = DECK_Y + 1;
  const side = (t: number) => end + (TOWER_H - end) * (0.5 * t + 0.5 * t * t);
  if (z <= TOWER_Z[0]) return side((z - ANCHOR_Z[0]) / (TOWER_Z[0] - ANCHOR_Z[0]));
  if (z >= TOWER_Z[1]) return side((ANCHOR_Z[1] - z) / (ANCHOR_Z[1] - TOWER_Z[1]));
  const u = (z - (TOWER_Z[0] + TOWER_Z[1]) / 2) / ((TOWER_Z[1] - TOWER_Z[0]) / 2);
  return low + (TOWER_H - low) * u * u;
}

interface Segment {
  z: number;
  y: number;
  len: number;
  pitch: number;
}

function buildSegments(): Segment[] {
  const out: Segment[] = [];
  for (let z = RAMP_Z0; z < RAMP_Z1; z += SEG) {
    const y0 = deckY(z);
    const y1 = deckY(z + SEG);
    out.push({ z: z + SEG / 2, y: (y0 + y1) / 2, len: Math.hypot(SEG, y1 - y0) + 0.12, pitch: -Math.atan2(y1 - y0, SEG) });
  }
  return out;
}

interface Member {
  x: number;
  y: number;
  z: number;
  rx: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
}

function buildTruss(): Member[] {
  const out: Member[] = [];
  const bay = (ANCHOR_Z[1] - ANCHOR_Z[0]) / TRUSS_BAYS;
  const top = DECK_Y - 0.5;
  const mid = top - TRUSS_DEPTH / 2;
  const diag = Math.hypot(bay, TRUSS_DEPTH);
  for (const sx of [-TRUSS_X, TRUSS_X]) {
    for (let i = 0; i <= TRUSS_BAYS; i++) {
      const z = ANCHOR_Z[0] + i * bay;
      out.push({ x: X + sx, y: mid, z, rx: 0, rz: 0, sx: 0.32, sy: TRUSS_DEPTH, sz: 0.32 });
      if (i < TRUSS_BAYS) out.push({ x: X + sx, y: mid, z: z + bay / 2, rx: (i % 2 ? 1 : -1) * Math.atan2(bay, TRUSS_DEPTH), rz: 0, sx: 0.26, sy: diag, sz: 0.26 });
    }
  }
  for (let i = 0; i <= TRUSS_BAYS; i += 2) out.push({ x: X, y: top - TRUSS_DEPTH, z: ANCHOR_Z[0] + i * bay, rx: 0, rz: Math.PI / 2, sx: 0.3, sy: TRUSS_X * 2, sz: 0.3 });
  return out;
}

function buildTowerMembers(): Member[] {
  const out: Member[] = [];
  const panels: [number, number][] = [
    [PIER_TOP + 2.5, 11.5],
    [20.5, 28],
    [28, 36],
  ];
  for (const z of TOWER_Z) {
    for (const y of [36, 28, 20.5, 11.5, PIER_TOP + 2.5]) out.push({ x: X, y, z, rx: 0, rz: 0, sx: LEG_X * 2 - 0.4, sy: 1.5, sz: 2.2 });
    out.push({ x: X, y: TOWER_H - 0.7, z, rx: 0, rz: 0, sx: LEG_X * 2 + 2.4, sy: 1.6, sz: 2.8 });
    for (const [y0, y1] of panels) {
      const len = Math.hypot(LEG_X * 2, y1 - y0);
      const a = Math.atan2(y1 - y0, LEG_X * 2);
      for (const s of [-1, 1]) out.push({ x: X, y: (y0 + y1) / 2, z, rx: 0, rz: s * a, sx: len, sy: 0.55, sz: 1.3 });
    }
    for (const s of [-1, 1]) out.push({ x: X + s * CABLE_X, y: TOWER_H + 0.6, z, rx: 0, rz: 0, sx: 1.3, sy: 1.4, sz: 2.4 });
  }
  return out;
}

function buildConcrete(): Member[] {
  const out: Member[] = [];
  const block = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => out.push({ x, y, z, rx: 0, rz: 0, sx, sy, sz });
  for (const z of [...CITY_PIERS, ...WINDSOR_PIERS]) {
    const h = deckY(z) - 0.9;
    block(X, h / 2, z, 6, h, 1.8);
    block(X, h - 0.6, z, DECK_W, 1.2, 2.2);
  }
  for (const z of ANCHOR_Z) {
    block(X, (DECK_Y - 1) / 2, z, 15, DECK_Y - 1, 7);
    for (const s of [-1, 1]) block(X + s * 6.25, DECK_Y + 1.5, z, 2.5, 5, 7);
  }
  for (const z of TOWER_Z) block(X, (PIER_TOP - 1.5) / 2, z, LEG_X * 2 + 5, PIER_TOP + 1.5, 9);
  for (const z of [RAMP_Z0 + 3, RAMP_Z1 - 3]) block(X, (ABUTMENT_Y - 0.5) / 2, z, DECK_W + 1, ABUTMENT_Y - 0.5, 6);
  return out;
}

const member = (list: Member[]) => (i: number, d: Object3D) => {
  const k = list[i];
  d.position.set(k.x, k.y, k.z);
  d.rotation.set(k.rx, 0, k.rz);
  d.scale.set(k.sx, k.sy, k.sz);
};

interface Car {
  lane: number;
  speed: number;
  z: number;
  spin: number;
}

interface Fleet {
  cars: Car[];
  items: FleetItem[];
  last: number;
}

function buildFleet(): Fleet {
  const rand = mulberry32(1929);
  const cars: Car[] = [];
  const items: FleetItem[] = [];
  const spacing = (FLEET_Z1 - FLEET_Z0) / PER_LANE;
  LANES.forEach((lane, li) => {
    const outer = Math.abs(lane) > 3;
    const kinds: VehicleKind[] = outer ? ["semi", "semi", "semi", "pickup"] : ["sedan", "sedan", "suv", "pickup", "semi"];
    for (let k = 0; k < PER_LANE; k++) {
      const kind = pick(rand, kinds);
      cars.push({ lane, speed: LANE_SPEED[li], z: FLEET_Z0 + k * spacing + range(rand, -3, 3), spin: rand() * 6 });
      items.push({ kind, color: new Color(pick(rand, kind === "semi" ? SEMI_COLORS : FLEET_COLORS)) });
    }
  });
  return { cars, items, last: -1 };
}

function poseCar(f: Fleet, i: number, out: VehiclePose, time: number) {
  if (i === 0) {
    const dt = f.last < 0 ? 0 : Math.min(time - f.last, 0.05);
    f.last = time;
    for (const c of f.cars) {
      const dir = c.lane < 0 ? 1 : -1;
      c.z += c.speed * dt * dir;
      c.spin += (c.speed * dt) / 0.45;
      if (c.z > FLEET_Z1) c.z = FLEET_Z0;
      if (c.z < FLEET_Z0) c.z = FLEET_Z1;
    }
  }
  const c = f.cars[i];
  const dir = c.lane < 0 ? 1 : -1;
  out.x = X + c.lane;
  out.y = deckY(c.z) + 0.5;
  out.z = c.z;
  out.yaw = dir > 0 ? 0 : Math.PI;
  out.pitch = -dir * Math.atan((deckY(c.z + 1) - deckY(c.z - 1)) / 2);
  out.spin = c.spin;
}

export default function AmbassadorBridge() {
  const dn = useDayNight();
  const dummy = useMemo(() => new Object3D(), []);
  const segments = useMemo(() => buildSegments(), []);
  const truss = useMemo(() => buildTruss(), []);
  const towerMembers = useMemo(() => buildTowerMembers(), []);
  const concrete = useMemo(() => buildConcrete(), []);
  const cableGeo = useMemo(() => {
    const pts: Vector3[] = [];
    for (let z = ANCHOR_Z[0]; z <= ANCHOR_Z[1]; z += 2) pts.push(new Vector3(0, cableY(z), z));
    return new TubeGeometry(new CatmullRomCurve3(pts), 160, 0.32, 6, false);
  }, []);
  const asphalt = useMemo(() => {
    const t = makeAsphaltTexture();
    t.repeat.set(3, 1);
    return t;
  }, []);
  useEffect(
    () => () => {
      cableGeo.dispose();
      asphalt.dispose();
    },
    [cableGeo, asphalt],
  );

  const deck = useRef<InstancedMesh>(null);
  const parapets = useRef<InstancedMesh>(null);
  const markings = useRef<InstancedMesh>(null);
  const trussRef = useRef<InstancedMesh>(null);
  const towerRef = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const concreteRef = useRef<InstancedMesh>(null);
  const hangers = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const beacons = useRef<InstancedMesh>(null);
  const lampMat = useRef<MeshStandardMaterial>(null);
  const beaconMat = useRef<MeshStandardMaterial>(null);
  const [fleet] = useState(buildFleet);
  const pose = useCallback<PoseFn>((i, out, time) => poseCar(fleet, i, out, time), [fleet]);

  useEffect(() => {
    fillInstances(deck.current, dummy, segments.length, (i, d) => {
      const s = segments[i];
      d.position.set(X, s.y, s.z);
      d.rotation.x = s.pitch;
      d.scale.set(DECK_W, 1, s.len);
    });
    fillInstances(parapets.current, dummy, segments.length * 2, (i, d) => {
      const s = segments[i >> 1];
      d.position.set(X, s.y, s.z);
      d.rotation.x = s.pitch;
      d.translateX((i & 1 ? 1 : -1) * (DECK_W / 2 - 0.15));
      d.translateY(0.95);
      d.scale.set(0.3, 0.9, s.len);
    });
    const m = markings.current;
    fillInstances(m, dummy, segments.length * 3, (i, d) => {
      const s = segments[Math.floor(i / 3)];
      const k = i % 3;
      d.position.set(X, s.y, s.z);
      d.rotation.x = s.pitch;
      d.translateX(k === 0 ? 0 : k === 1 ? -4.9 : 4.9);
      d.translateY(0.52);
      d.scale.set(k === 0 ? 0.22 : 0.18, 0.04, s.len);
    });
    if (m) {
      for (let i = 0; i < segments.length * 3; i++) m.setColorAt(i, i % 3 === 0 ? LINE_YELLOW : LINE_WHITE);
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    fillInstances(trussRef.current, dummy, truss.length, member(truss));
    fillInstances(towerRef.current, dummy, towerMembers.length, member(towerMembers));
    fillInstances(concreteRef.current, dummy, concrete.length, member(concrete));
    fillInstances(legs.current, dummy, 4, (i, d) => {
      d.position.set(X + (i & 1 ? LEG_X : -LEG_X), PIER_TOP + (TOWER_H - PIER_TOP) / 2, TOWER_Z[i >> 1]);
      d.rotation.y = Math.PI / 4;
    });
    fillInstances(beacons.current, dummy, 4, (i, d) => d.position.set(X + (i & 1 ? LEG_X : -LEG_X), TOWER_H + 1.3, TOWER_Z[i >> 1]));
    fillInstances(hangers.current, dummy, HANGER_Z.length * 2, (i, d) => {
      const z = HANGER_Z[i >> 1];
      const len = cableY(z) - DECK_Y - 0.5;
      d.position.set(X + (i & 1 ? CABLE_X : -CABLE_X), DECK_Y + 0.5 + len / 2, z);
      d.scale.set(1, len, 1);
    });
    fillInstances(lamps.current, dummy, HANGER_Z.length * 2, (i, d) => {
      const z = HANGER_Z[i >> 1];
      d.position.set(X + (i & 1 ? CABLE_X : -CABLE_X), cableY(z) + 0.35, z);
    });
  }, [dummy, segments, truss, towerMembers, concrete]);

  useEffect(() => {
    if (lampMat.current) lampMat.current.emissiveIntensity = 0.3 + dn.night * 3;
  }, [dn]);

  useFrame(({ clock }) => {
    if (!beaconMat.current) return;
    const on = Math.sin(clock.elapsedTime * 0.9 * Math.PI) > 0 ? 1 : 0;
    beaconMat.current.emissiveIntensity = 0.4 + on * 5;
  });

  const chordY = DECK_Y - 0.5 - TRUSS_DEPTH;
  const chordZ = (ANCHOR_Z[0] + ANCHOR_Z[1]) / 2;
  const chordLen = ANCHOR_Z[1] - ANCHOR_Z[0];
  return (
    <group>
      <instancedMesh ref={deck} args={[undefined, undefined, segments.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#9a9aa2" map={asphalt} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={parapets} args={[undefined, undefined, segments.length * 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={STEEL} roughness={0.55} metalness={0.25} />
      </instancedMesh>
      <instancedMesh ref={markings} args={[undefined, undefined, segments.length * 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={trussRef} args={[undefined, undefined, truss.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.3} />
      </instancedMesh>
      {[-TRUSS_X, TRUSS_X].map((ox) => (
        <mesh key={ox} position={[X + ox, chordY, chordZ]}>
          <boxGeometry args={[0.5, 0.5, chordLen]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      <instancedMesh ref={towerRef} args={[undefined, undefined, towerMembers.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, 4]}>
        <cylinderGeometry args={[1.3, 1.9, TOWER_H - PIER_TOP, 4, 1]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={concreteRef} args={[undefined, undefined, concrete.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={CONCRETE} roughness={1} />
      </instancedMesh>
      {[-CABLE_X, CABLE_X].map((ox) => (
        <mesh key={ox} geometry={cableGeo} position={[X + ox, 0, 0]}>
          <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.35} />
        </mesh>
      ))}
      <instancedMesh ref={hangers} args={[undefined, undefined, HANGER_Z.length * 2]}>
        <cylinderGeometry args={[0.07, 0.07, 1, 4, 1]} />
        <meshStandardMaterial color="#9fb8c2" roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, HANGER_Z.length * 2]}>
        <sphereGeometry args={[0.28, 8, 6]} />
        <meshStandardMaterial ref={lampMat} color="#dff2ff" emissive="#bfe6ff" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={beacons} args={[undefined, undefined, 4]}>
        <sphereGeometry args={[0.55, 10, 8]} />
        <meshStandardMaterial ref={beaconMat} color="#ff2244" emissive="#ff2244" emissiveIntensity={4} toneMapped={false} />
      </instancedMesh>
      <VehicleFleet items={fleet.items} pose={pose} dynamic />
    </group>
  );
}
