"use client";

import { useCallback, useState } from "react";
import { Color } from "three";
import { CITY_HALF_Z, OUTER_HALF_X, OUTER_MIN_Z, lightIsGreen, outerRoadLinesX, outerRoadLinesZ } from "./layout";
import { mulberry32, pick, range } from "./rng";
import VehicleFleet, { type FleetItem, type PoseFn, type VehiclePose } from "./VehicleFleet";
import { VEHICLE_SPECS, type VehicleKind } from "./vehicles";

const CAR_COLORS = ["#f4f1ea", "#1d1d3f", "#c8102e", "#2a3a7a", "#9a95a8", "#d6b56e", "#3f3f4f", "#ffb02e", "#49d2f2", "#ff4d6d", "#2f6ea8", "#e8e8f2", "#4a2c3a", "#7a8c3a"];

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
}

interface World {
  cars: Car[];
  items: FleetItem[];
  lanes: Car[][];
  xs: number[];
  zs: number[];
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
      lane: dir * 1.75,
      dir,
      along: range(rand, min, max),
      speed: kind === "bus" ? range(rand, 5, 7) : kind === "police" ? range(rand, 9, 14) : range(rand, 7, 13),
      vel: 0,
      len: VEHICLE_SPECS[kind].length,
      spin: rand() * 6,
      brake: false,
    });
    items.push({ kind, color: colorFor(kind, rand) });
  }
  const map = new Map<string, Car[]>();
  cars.forEach((c) => {
    const key = `${c.axis}|${c.line}|${c.dir}`;
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  });
  const lanes = cars.map((c) => map.get(`${c.axis}|${c.line}|${c.dir}`)!);
  return { cars, items, lanes, xs, zs, last: -1 };
}

function stepWorld(w: World, time: number) {
  const dt = w.last < 0 ? 0 : Math.min(time - w.last, 0.05);
  w.last = time;
  w.cars.forEach((c, i) => {
    const min = c.axis === "z" ? OUTER_MIN_Z - 20 : -OUTER_HALF_X - 30;
    const max = c.axis === "z" ? CITY_HALF_Z + 3 : OUTER_HALF_X + 30;
    const cross = c.axis === "z" ? w.zs : w.xs;
    let target = c.speed;
    for (let k = 0; k < cross.length; k++) {
      const gap = (cross[k] - c.along) * c.dir;
      if (gap > 3.2 + c.len / 2 && gap < 9 + c.len / 2) {
        const ix = c.axis === "z" ? c.lineIndex : k;
        const iz = c.axis === "z" ? k : c.lineIndex;
        if (!lightIsGreen(c.axis, ix, iz, time)) target = 0;
        break;
      }
    }
    const lane = w.lanes[i];
    for (let j = 0; j < lane.length; j++) {
      const o = lane[j];
      if (o === c) continue;
      const gap = (o.along - c.along) * c.dir;
      if (gap > 0 && gap < 3.5 + c.len / 2 + o.len / 2) {
        target = Math.min(target, o.vel * 0.9);
        break;
      }
    }
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

export default function Traffic() {
  const [world] = useState(() => buildWorld());
  const pose = useCallback<PoseFn>((i, out, time) => poseCar(world, i, out, time), [world]);
  return <VehicleFleet items={world.items} pose={pose} dynamic castShadow />;
}
