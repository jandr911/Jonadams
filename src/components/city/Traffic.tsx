"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, Group, MeshStandardMaterial } from "three";
import { useDayNight } from "./DayNightContext";
import { CITY_HALF_Z, OUTER_COLS, OUTER_HALF_X, OUTER_MIN_Z, PITCH, WOODWARD_INDEX, lightIsGreen, outerRoadLinesX, outerRoadLinesZ } from "./layout";
import { mulberry32, pick, range } from "./rng";
import VehicleFleet, { type FleetItem, type PoseFn, type VehiclePose } from "./VehicleFleet";
import { VEHICLE_SPECS, type VehicleKind } from "./vehicles";

const CAR_COLORS = ["#f4f1ea", "#1d1d3f", "#c8102e", "#2a3a7a", "#9a95a8", "#d6b56e", "#3f3f4f", "#ffb02e", "#49d2f2", "#ff4d6d", "#2f6ea8", "#e8e8f2", "#4a2c3a", "#7a8c3a"];
const LANE_OFFSET = 1.75;
const FOLLOW_GAP = 3.5;
const BOX_HALF = 3.5;
const AXIS_Z = 1;
const AXIS_X = 2;

const WOODWARD_OUTER = WOODWARD_INDEX + OUTER_COLS;
const TRAM_SPEED = 4.5;
const TRAM_LEN = 11;
const TRAM_LANE = 1.6;
const TRAM_DWELL = 4;
const TRAM_CROSSOVER = 10;
const TRAM_HOLD = 12;
const TRAM_END = CITY_HALF_Z - 11;

interface Car {
  kind: VehicleKind;
  axis: "x" | "z";
  line: number;
  lineIndex: number;
  lane: number;
  dir: 1 | -1;
  along: number;
  speed: number;
  vel: number;
  len: number;
  spin: number;
  brake: boolean;
  onWoodward: boolean;
}

interface Tram {
  along: number;
  dir: 1 | -1;
  vel: number;
  dwell: number;
  lane: number;
}

interface World {
  cars: Car[];
  items: FleetItem[];
  lanes: Car[][];
  laneMap: Map<string, Car[]>;
  trams: Tram[];
  xs: number[];
  zs: number[];
  occupied: Uint8Array;
  last: number;
}

function pickKind(rand: () => number): VehicleKind {
  const r = rand();
  if (r < 0.08) return "bus";
  if (r < 0.16) return "taxi";
  if (r < 0.19) return "police";
  if (r < 0.34) return "suv";
  if (r < 0.44) return "pickup";
  if (r < 0.52) return "van";
  return "sedan";
}

function colorFor(kind: VehicleKind, rand: () => number) {
  if (kind === "taxi") return new Color("#ffb02e");
  if (kind === "police") return new Color("#f4f1ea");
  if (kind === "bus") return new Color(pick(rand, ["#f4f1ea", "#1d1d3f", "#e8e8f2"]));
  return new Color(pick(rand, CAR_COLORS));
}

function laneKey(axis: "x" | "z", line: number, dir: 1 | -1) {
  return `${axis}|${line}|${dir}`;
}

function buildWorld(): World {
  const rand = mulberry32(77);
  const cars: Car[] = [];
  const items: FleetItem[] = [];
  const xs = outerRoadLinesX();
  const zs = outerRoadLinesZ();
  for (let i = 0; i < 260; i++) {
    const axis: "x" | "z" = rand() < 0.5 ? "x" : "z";
    const lineIndex = Math.floor(rand() * (axis === "z" ? xs.length : zs.length));
    const line = axis === "z" ? xs[lineIndex] : zs[lineIndex];
    const dir: 1 | -1 = rand() < 0.5 ? 1 : -1;
    const kind = pickKind(rand);
    const min = axis === "z" ? OUTER_MIN_Z - 20 : -OUTER_HALF_X - 30;
    const max = axis === "z" ? CITY_HALF_Z + 3 : OUTER_HALF_X + 30;
    cars.push({
      kind,
      axis,
      line,
      lineIndex,
      lane: -dir * LANE_OFFSET,
      dir,
      along: range(rand, min, max),
      speed: kind === "bus" ? range(rand, 5, 7) : kind === "police" ? range(rand, 9, 14) : range(rand, 7, 13),
      vel: 0,
      len: VEHICLE_SPECS[kind].length,
      spin: rand() * 6,
      brake: false,
      onWoodward: axis === "z" && lineIndex === WOODWARD_OUTER,
    });
    items.push({ kind, color: colorFor(kind, rand) });
  }
  const laneMap = new Map<string, Car[]>();
  cars.forEach((c) => {
    const key = laneKey(c.axis, c.line, c.dir);
    const arr = laneMap.get(key) ?? [];
    arr.push(c);
    laneMap.set(key, arr);
  });
  const lanes = cars.map((c) => laneMap.get(laneKey(c.axis, c.line, c.dir))!);
  const trams: Tram[] = [
    { along: -TRAM_END * 0.6, dir: 1, vel: 0, dwell: 0, lane: -TRAM_LANE },
    { along: TRAM_END * 0.6, dir: -1, vel: 0, dwell: 0, lane: TRAM_LANE },
  ];
  for (const c of cars) {
    if (!c.onWoodward) continue;
    for (const t of trams) if (Math.abs(c.along - t.along) < TRAM_LEN) c.along += TRAM_LEN * 1.5;
  }
  return { cars, items, lanes, laneMap, trams, xs, zs, occupied: new Uint8Array(xs.length * zs.length), last: -1 };
}

function approachingCross(along: number, dir: 1 | -1, len: number, cross: number[]) {
  for (let k = 0; k < cross.length; k++) {
    const gap = (cross[k] - along) * dir;
    if (gap > 3.2 + len / 2 && gap < 9 + len / 2) return k;
  }
  return -1;
}

function crossKey(w: World, axis: "x" | "z", lineIndex: number, k: number) {
  const ix = axis === "z" ? lineIndex : k;
  const iz = axis === "z" ? k : lineIndex;
  return ix * w.zs.length + iz;
}

function markOccupied(w: World, axis: "x" | "z", lineIndex: number, along: number, len: number) {
  const cross = axis === "z" ? w.zs : w.xs;
  const k = Math.round((along - cross[0]) / PITCH);
  if (k < 0 || k >= cross.length) return;
  if (Math.abs(cross[k] - along) < BOX_HALF + len / 2) w.occupied[crossKey(w, axis, lineIndex, k)] |= axis === "z" ? AXIS_Z : AXIS_X;
}

function mayEnter(w: World, axis: "x" | "z", lineIndex: number, along: number, dir: 1 | -1, len: number, lane: Car[], self: Car | null, time: number) {
  const cross = axis === "z" ? w.zs : w.xs;
  const k = approachingCross(along, dir, len, cross);
  if (k < 0) return true;
  const ix = axis === "z" ? lineIndex : k;
  const iz = axis === "z" ? k : lineIndex;
  if (!lightIsGreen(axis, ix, iz, time)) return false;
  if (w.occupied[crossKey(w, axis, lineIndex, k)] & (axis === "z" ? AXIS_X : AXIS_Z)) return false;
  const farSide = (cross[k] - along) * dir + BOX_HALF + len + 1;
  for (let j = 0; j < lane.length; j++) {
    const o = lane[j];
    if (o === self) continue;
    const gap = (o.along - along) * dir;
    if (gap > 0 && gap < farSide + o.len / 2 && o.vel < 1) return false;
  }
  return true;
}

function followSpeed(lane: Car[], self: Car | null, along: number, dir: 1 | -1, len: number, target: number) {
  for (let j = 0; j < lane.length; j++) {
    const o = lane[j];
    if (o === self) continue;
    const gap = (o.along - along) * dir;
    if (gap > 0 && gap < FOLLOW_GAP + len / 2 + o.len / 2) return Math.min(target, o.vel * 0.9);
  }
  return target;
}

function tramLane(t: Tram) {
  const remaining = t.dir === 1 ? TRAM_END - t.along : t.along + TRAM_END;
  const u = Math.min(1, Math.max(0, 1 - remaining / TRAM_CROSSOVER));
  const s = u * u * (3 - 2 * u);
  return -t.dir * TRAM_LANE * (1 - 2 * s);
}

function oncomingInCrossover(t: Tram, oncoming: Car[]) {
  const end = t.dir * TRAM_END;
  for (const o of oncoming) {
    const pastTram = (o.along - t.along) * t.dir > -1;
    const beforeHold = (end - o.along) * t.dir > -TRAM_HOLD;
    if (pastTram && beforeHold) return true;
  }
  return false;
}

function stepTram(w: World, t: Tram, dt: number, time: number) {
  if (t.dwell > 0) {
    t.dwell -= dt;
    t.vel = 0;
    if (t.dwell <= 0) t.dir = t.dir === 1 ? -1 : 1;
    t.lane = tramLane(t);
    return;
  }
  const remaining = t.dir === 1 ? TRAM_END - t.along : t.along + TRAM_END;
  let target = Math.min(TRAM_SPEED, Math.max(0.8, remaining * 0.8));
  const line = w.xs[WOODWARD_OUTER];
  const lane = w.laneMap.get(laneKey("z", line, t.dir)) ?? NO_CARS;
  if (!mayEnter(w, "z", WOODWARD_OUTER, t.along, t.dir, TRAM_LEN, lane, null, time)) target = 0;
  target = followSpeed(lane, null, t.along, t.dir, TRAM_LEN, target);
  const atGate = remaining > TRAM_CROSSOVER - 1 && remaining <= TRAM_CROSSOVER + 3;
  const oncoming = w.laneMap.get(laneKey("z", line, t.dir === 1 ? -1 : 1));
  if (atGate && oncoming && oncomingInCrossover(t, oncoming)) target = 0;
  t.vel += (target - t.vel) * Math.min(1, dt * (target < t.vel ? 4 : 1.5));
  t.along += t.vel * dt * t.dir;
  if (remaining <= 0.05) {
    t.along = t.dir * TRAM_END;
    t.vel = 0;
    t.dwell = TRAM_DWELL;
  }
  t.lane = tramLane(t);
}

function tramAhead(c: Car, trams: Tram[], target: number) {
  for (const t of trams) {
    const crossing = Math.abs(t.lane) < TRAM_LANE - 0.02;
    const sameSide = Math.sign(t.lane) === Math.sign(c.lane);
    if (!crossing && !sameSide) continue;
    const gap = (t.along - c.along) * c.dir;
    if (gap <= 0) continue;
    const follow = FOLLOW_GAP + c.len / 2 + TRAM_LEN / 2;
    if (t.dir === c.dir) {
      if (gap < follow) return Math.min(target, t.vel * 0.9);
      continue;
    }
    const toTerminus = (t.dir * TRAM_END - c.along) * c.dir;
    if (toTerminus < follow) return 0;
  }
  return target;
}

const NO_CARS: Car[] = [];

function stepWorld(w: World, time: number) {
  const dt = w.last < 0 ? 0 : Math.min(time - w.last, 0.05);
  w.last = time;
  w.occupied.fill(0);
  for (const c of w.cars) markOccupied(w, c.axis, c.lineIndex, c.along, c.len);
  for (const t of w.trams) markOccupied(w, "z", WOODWARD_OUTER, t.along, TRAM_LEN);
  for (const t of w.trams) stepTram(w, t, dt, time);
  w.cars.forEach((c, i) => {
    const min = c.axis === "z" ? OUTER_MIN_Z - 20 : -OUTER_HALF_X - 30;
    const max = c.axis === "z" ? CITY_HALF_Z + 3 : OUTER_HALF_X + 30;
    let target = c.speed;
    if (!mayEnter(w, c.axis, c.lineIndex, c.along, c.dir, c.len, w.lanes[i], c, time)) target = 0;
    target = followSpeed(w.lanes[i], c, c.along, c.dir, c.len, target);
    if (c.onWoodward) target = tramAhead(c, w.trams, target);
    c.brake = target < c.vel - 0.3;
    c.vel += (target - c.vel) * Math.min(1, dt * (target < c.vel ? 6 : 2.5));
    c.along += c.vel * dt * c.dir;
    c.spin += (c.vel * dt) / VEHICLE_SPECS[c.kind].wheelR;
    if (c.along > max) c.along = min;
    if (c.along < min) c.along = max;
  });
}

function poseCar(w: World, i: number, out: VehiclePose, time: number) {
  if (i === 0) stepWorld(w, time);
  const c = w.cars[i];
  out.x = c.axis === "z" ? c.line + c.lane : c.along;
  out.z = c.axis === "z" ? c.along : c.line - c.lane;
  out.y = 0.4;
  out.yaw = c.axis === "z" ? (c.dir === 1 ? 0 : Math.PI) : c.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  out.spin = c.spin;
  out.brake = c.brake;
}

function setEmissiveIntensity(mat: MeshStandardMaterial, value: number) {
  mat.emissiveIntensity = value;
}

function Streetcars({ world }: { world: World }) {
  const dn = useDayNight();
  const x = world.xs[WOODWARD_OUTER];
  const cars = useRef<(Group | null)[]>([]);
  const winMat = useMemo(() => new MeshStandardMaterial({ color: "#9fc4e0", emissive: "#ffd9a0", emissiveIntensity: 0.6, toneMapped: false }), []);
  useEffect(() => () => winMat.dispose(), [winMat]);
  useEffect(() => {
    setEmissiveIntensity(winMat, 0.25 + dn.night * 0.7);
  }, [dn, winMat]);
  useFrame(() => {
    for (let i = 0; i < world.trams.length; i++) {
      const g = cars.current[i];
      const t = world.trams[i];
      if (g) g.position.set(x + t.lane, 0.4, t.along);
    }
  });
  return (
    <group>
      {world.trams.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            cars.current[i] = el;
          }}
        >
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[2, 0.6, 10.4]} />
            <meshStandardMaterial color="#1a1a22" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <boxGeometry args={[2.2, 2.4, 11]} />
            <meshStandardMaterial color="#c8102e" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[0, 2.2, 0]} material={winMat}>
            <boxGeometry args={[2.3, 0.9, 10.6]} />
          </mesh>
          <mesh position={[0, 3.1, 0]}>
            <boxGeometry args={[1.8, 0.2, 10.4]} />
            <meshStandardMaterial color="#e8e8f2" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Traffic() {
  const [world] = useState(() => buildWorld());
  const pose = useCallback<PoseFn>((i, out, time) => poseCar(world, i, out, time), [world]);
  return (
    <group>
      <VehicleFleet items={world.items} pose={pose} dynamic castShadow />
      <Streetcars world={world} />
    </group>
  );
}
