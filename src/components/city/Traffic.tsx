"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, BoxGeometry, Color, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";
import { gradientColors } from "./instancing";
import { CITY_HALF_Z, CROSSWALK_OFFSET, LANE_OFFSET, MEDIAN_LANE_OFFSET, OUTER_COLS, OUTER_HALF_X, PITCH, ROAD_HALF, WOODWARD_INDEX, isMedianLine, lightIsAmber, lightIsGreen, outerRoadLinesX, TRAFFIC_CLOCK, outerRoadLinesZ } from "./layout";
import { mulberry32, pick, range } from "./rng";
import VehicleFleet, { type FleetItem, type PoseFn, type VehiclePose } from "./VehicleFleet";
import { VEHICLE_SPECS, type VehicleKind } from "./vehicles";

type Axis = "x" | "z";
type Dir = 1 | -1;

const CAR_COLORS = ["#f4f1ea", "#1d1d3f", "#c8102e", "#2a3a7a", "#9a95a8", "#d6b56e", "#3f3f4f", "#ffb02e", "#49d2f2", "#ff4d6d", "#2f6ea8", "#e8e8f2", "#4a2c3a", "#7a8c3a"];
const CAR_Y = 0.4;
const ROAD_OVERRUN = 16;
const X_ROAD_MIN = -OUTER_HALF_X - ROAD_OVERRUN;
const X_ROAD_MAX = OUTER_HALF_X + ROAD_OVERRUN;
const BOX_HALF = ROAD_HALF;
const AXIS_Z = 1;
const AXIS_X = 2;

const STANDSTILL_GAP = 2;
const HEADWAY = 0.9;
const COMFORT_BRAKE = 3;
const STOP_BRAKE = 3.4;
const HARD_BRAKE = 7;
const SPEED_GAIN = 2.5;
const JERK_RATE = 6;
const STOP_LINE_BACK = CROSSWALK_OFFSET + 1.4;
const STOP_LINE_MARGIN = 1;
const LIGHT_LOOKAHEAD = 60;
const BLOCK_LOOKAHEAD = 12;
const TURN_R = 4;
const TURN_ARC = (Math.PI / 2) * TURN_R;
const TURN_SPEED = 4.5;
const DIVE_PER_ACCEL = 0.0035;
const REENTRY_SPEED = 5;
const SIM_STEP = 0.05;
const MAX_CATCH_UP = 0.25;
const CRAWL_SPEED = 4;

const WOODWARD_OUTER = WOODWARD_INDEX + OUTER_COLS;
const TRAM_SPEED = 4.5;
const TRAM_LEN = 11;
const TRAM_LANE = LANE_OFFSET;
const TRAM_DWELL = 4;
const TRAM_CROSSOVER = 10;
const TRAM_END = CITY_HALF_Z - 11;
const TRAM_GATE = TRAM_END - (CITY_HALF_Z - PITCH - STOP_LINE_BACK - TRAM_LEN / 2);
const TRAM_ACCEL = 1;
const TRAM_BRAKE = 1.3;
const TRAM_HARD_BRAKE = 2.5;

interface Car {
  kind: VehicleKind;
  axis: Axis;
  line: number;
  lineIndex: number;
  lane: number;
  dir: Dir;
  along: number;
  speed: number;
  accel: number;
  vel: number;
  acc: number;
  len: number;
  spin: number;
  brake: boolean;
  onWoodward: boolean;
  loop: number;
  turnCross: number;
  turnAt: number;
  nextAxis: Axis;
  nextIndex: number;
  nextDir: Dir;
  cx: number;
  cz: number;
  turning: boolean;
  arc: number;
  x: number;
  z: number;
  yaw: number;
}

interface Tram {
  along: number;
  dir: Dir;
  vel: number;
  acc: number;
  dwell: number;
  lane: number;
  slope: number;
}

interface World {
  cars: Car[];
  items: FleetItem[];
  zLanes: Car[][];
  xLanes: Car[][];
  trams: Tram[];
  xs: number[];
  zs: number[];
  occupied: Uint8Array;
  last: number;
}

interface Frame {
  x: number;
  z: number;
  yaw: number;
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

function laneOffset(axis: Axis, line: number) {
  return isMedianLine(axis === "z" ? "x" : "z", line) ? MEDIAN_LANE_OFFSET : LANE_OFFSET;
}

function laneList(w: World, axis: Axis, lineIndex: number, dir: Dir) {
  return (axis === "z" ? w.zLanes : w.xLanes)[lineIndex * 2 + (dir === 1 ? 1 : 0)];
}

function lateral(w: World, axis: Axis, lineIndex: number, dir: Dir) {
  if (axis === "z") {
    const line = w.xs[lineIndex];
    return line - dir * laneOffset("z", line);
  }
  const line = w.zs[lineIndex];
  return line + dir * laneOffset("x", line);
}

function turnEnd(c: Car) {
  return (c.nextAxis === "z" ? c.cz : c.cx) + c.nextDir * TURN_R;
}

function setLeg(w: World, c: Car, axis: Axis, lineIndex: number, dir: Dir) {
  c.axis = axis;
  c.lineIndex = lineIndex;
  c.line = axis === "z" ? w.xs[lineIndex] : w.zs[lineIndex];
  c.dir = dir;
  c.lane = -dir * laneOffset(axis, c.line);
  c.onWoodward = axis === "z" && lineIndex === WOODWARD_OUTER;
  c.turnCross = -1;
  if (c.loop < 0) return;
  if (axis === "z") {
    c.nextAxis = "x";
    c.nextIndex = dir === 1 ? w.zs.length - 1 : 0;
    c.nextDir = dir === 1 ? -1 : 1;
    c.cx = lateral(w, "z", lineIndex, dir);
    c.cz = lateral(w, "x", c.nextIndex, c.nextDir);
    c.turnAt = c.cz - dir * TURN_R;
  } else {
    c.nextAxis = "z";
    c.nextIndex = dir === -1 ? c.loop : c.loop + 1;
    c.nextDir = dir;
    c.cz = lateral(w, "x", lineIndex, dir);
    c.cx = lateral(w, "z", c.nextIndex, c.nextDir);
    c.turnAt = c.cx - dir * TURN_R;
  }
  c.turnCross = c.nextIndex;
}

function spreadLane(list: Car[], cross: number[], lo: number, hi: number) {
  list.sort((a, b) => a.along - b.along);
  const step = (hi - lo) / list.length;
  for (let k = 0; k < list.length; k++) {
    const c = list[k];
    let along = lo + (k + 0.5) * step;
    const near = Math.round((along - cross[0]) / PITCH);
    const clear = STOP_LINE_BACK + c.len / 2 + 1;
    if (near >= 0 && near < cross.length && Math.abs(along - cross[near]) < clear) along = cross[near] - c.dir * clear;
    c.along = along;
  }
}

function buildWorld(): World {
  const rand = mulberry32(77);
  const cars: Car[] = [];
  const items: FleetItem[] = [];
  const xs = outerRoadLinesX();
  const zs = outerRoadLinesZ();
  const zLanes = Array.from({ length: xs.length * 2 }, () => [] as Car[]);
  const xLanes = Array.from({ length: zs.length * 2 }, () => [] as Car[]);
  const w: World = { cars, items, zLanes, xLanes, trams: [], xs, zs, occupied: new Uint8Array(xs.length * zs.length), last: -1 };
  for (let i = 0; i < 260; i++) {
    const axis: Axis = rand() < 0.5 ? "x" : "z";
    const lineIndex = Math.floor(rand() * (axis === "z" ? xs.length : zs.length));
    let dir: Dir = rand() < 0.5 ? 1 : -1;
    const kind = pickKind(rand);
    if (axis === "z" && dir === 1 && lineIndex === 0) dir = -1;
    if (axis === "z" && dir === -1 && lineIndex === xs.length - 1) dir = 1;
    const along = axis === "z" ? range(rand, zs[0] + 10, zs[zs.length - 1] - 10) : range(rand, X_ROAD_MIN, X_ROAD_MAX);
    const c: Car = {
      kind,
      axis,
      line: 0,
      lineIndex,
      lane: 0,
      dir,
      along,
      speed: kind === "bus" ? range(rand, 5, 7) : kind === "police" ? range(rand, 9, 14) : range(rand, 7, 13),
      accel: kind === "bus" ? 1.3 : kind === "police" ? 2.8 : range(rand, 2, 2.6),
      vel: 0,
      acc: 0,
      len: VEHICLE_SPECS[kind].length,
      spin: rand() * 6,
      brake: false,
      onWoodward: false,
      loop: axis === "z" ? (dir === 1 ? lineIndex - 1 : lineIndex) : -1,
      turnCross: -1,
      turnAt: 0,
      nextAxis: "x",
      nextIndex: 0,
      nextDir: 1,
      cx: 0,
      cz: 0,
      turning: false,
      arc: 0,
      x: 0,
      z: 0,
      yaw: 0,
    };
    setLeg(w, c, axis, lineIndex, dir);
    cars.push(c);
    items.push({ kind, color: colorFor(kind, rand) });
  }
  for (const c of cars) laneList(w, c.axis, c.lineIndex, c.dir).push(c);
  for (const list of zLanes) spreadLane(list, zs, zs[0] + 10, zs[zs.length - 1] - 10);
  for (const list of xLanes) spreadLane(list, xs, X_ROAD_MIN, X_ROAD_MAX);
  w.trams = [
    { along: -TRAM_END * 0.6, dir: 1, vel: 0, acc: 0, dwell: 0, lane: -TRAM_LANE, slope: 0 },
    { along: TRAM_END * 0.6, dir: -1, vel: 0, acc: 0, dwell: 0, lane: TRAM_LANE, slope: 0 },
  ];
  for (const c of cars) {
    if (!c.onWoodward) continue;
    for (const t of w.trams) if (Math.abs(c.along - t.along) < TRAM_LEN) c.along += TRAM_LEN * 1.5;
  }
  return w;
}

function crossKey(w: World, axis: Axis, lineIndex: number, k: number) {
  const ix = axis === "z" ? lineIndex : k;
  const iz = axis === "z" ? k : lineIndex;
  return ix * w.zs.length + iz;
}

function markOccupied(w: World, axis: Axis, lineIndex: number, along: number, dir: Dir, len: number, vel: number, reach = Infinity) {
  const cross = axis === "z" ? w.zs : w.xs;
  const probe = (along - dir * (BOX_HALF + len / 2) - cross[0]) / PITCH;
  const k = dir === 1 ? Math.ceil(probe) : Math.floor(probe);
  if (k < 0 || k >= cross.length || Math.abs(cross[k]) > reach) return;
  const ahead = (cross[k] - along) * dir;
  const committed = STOP_LINE_BACK + len / 2 - 0.5 + (vel * vel) / (2 * STOP_BRAKE);
  if (ahead < committed) w.occupied[crossKey(w, axis, lineIndex, k)] |= axis === "z" ? AXIS_Z : AXIS_X;
}

function followSpeed(clear: number, leadVel: number, vel: number, brake: number) {
  return Math.sqrt(leadVel * leadVel + 2 * brake * Math.max(0, clear - STANDSTILL_GAP - HEADWAY * vel));
}

function stopSpeed(distance: number, brake: number) {
  return Math.sqrt(2 * brake * Math.max(0, distance - STOP_LINE_MARGIN));
}

function laneLeaderLimit(lane: Car[], self: Car | null, along: number, dir: Dir, len: number, vel: number, brake: number) {
  let best = Infinity;
  let lead: Car | null = null;
  for (let j = 0; j < lane.length; j++) {
    const o = lane[j];
    if (o === self) continue;
    const gap = (o.along - along) * dir;
    if (gap > 0 && gap < best) {
      best = gap;
      lead = o;
    }
  }
  if (!lead) return Infinity;
  return followSpeed(best - len / 2 - lead.len / 2, lead.vel, vel, brake);
}

function blockHasRoom(w: World, axis: Axis, lineIndex: number, dir: Dir, from: number, junction: number, len: number, self: Car | Tram | null, source: Car[] | null) {
  const cross = axis === "z" ? w.zs : w.xs;
  const probe = (from - cross[0]) / PITCH;
  const k = dir === 1 ? Math.floor(probe) + 1 : Math.ceil(probe) - 1;
  if (k < 0 || k >= cross.length) return true;
  const length = (cross[k] - from) * dir - STOP_LINE_BACK;
  const committedFrom = -(2 * BOX_HALF + STOP_LINE_BACK);
  let used = len;
  const lane = laneList(w, axis, lineIndex, dir);
  for (let j = 0; j < lane.length; j++) {
    const o = lane[j];
    if (o === self || o.turnCross === junction) continue;
    const g = (o.along - from) * dir;
    if (g + o.len / 2 > committedFrom && g - o.len / 2 < length) used += o.len + STANDSTILL_GAP;
  }
  if (source) {
    for (let j = 0; j < source.length; j++) {
      const o = source[j];
      if (o !== self && o.turning && o.nextAxis === axis && o.nextIndex === lineIndex && o.nextDir === dir) used += o.len + STANDSTILL_GAP;
    }
  }
  if (axis === "z" && lineIndex === WOODWARD_OUTER) {
    for (const t of w.trams) {
      if (t === self) continue;
      const g = (t.along - from) * dir;
      if (Math.abs(t.lane + dir * TRAM_LANE) < 1.6 && g + TRAM_LEN / 2 > committedFrom && g - TRAM_LEN / 2 < length) used += TRAM_LEN + STANDSTILL_GAP;
    }
  }
  return used <= length;
}

function tramBlocksTurn(w: World, c: Car, endAlong: number) {
  if (c.nextAxis !== "z" || c.nextIndex !== WOODWARD_OUTER) return false;
  const lane = -c.nextDir * TRAM_LANE;
  for (const t of w.trams) {
    const terminusNear = Math.abs(t.dir * TRAM_END - endAlong) < TRAM_LEN + c.len;
    if (t.dir === -c.nextDir && terminusNear && (t.dwell > 0 || tramRemaining(t) < TRAM_GATE + 10)) return true;
    if (Math.abs(t.lane - lane) > 1.6) continue;
    const gap = (t.along - endAlong) * c.nextDir;
    if (gap > -(TRAM_LEN / 2 + c.len) && gap - TRAM_LEN / 2 < c.len + 1) return true;
  }
  return false;
}

function junctionStop(w: World, axis: Axis, lineIndex: number, along: number, dir: Dir, len: number, vel: number, self: Car | Tram | null, time: number, stopBrake: number, hardBrake: number) {
  const cross = axis === "z" ? w.zs : w.xs;
  const probe = (along + dir * (len / 2 + STOP_LINE_BACK - 0.5) - cross[0]) / PITCH;
  const k = dir === 1 ? Math.ceil(probe) : Math.floor(probe);
  if (k < 0 || k >= cross.length) return Infinity;
  const distance = (cross[k] - along) * dir - len / 2 - STOP_LINE_BACK;
  if (distance > LIGHT_LOOKAHEAD) return Infinity;
  const ix = axis === "z" ? lineIndex : k;
  const iz = axis === "z" ? k : lineIndex;
  const need = (vel * vel) / (2 * Math.max(distance, 0.05));
  if (!lightIsGreen(axis, ix, iz, time)) {
    const limit = lightIsAmber(axis, ix, iz, time) ? stopBrake : hardBrake;
    return need <= limit || vel < CRAWL_SPEED ? distance : Infinity;
  }
  if (distance > Math.max(BLOCK_LOOKAHEAD, (vel * vel) / (2 * stopBrake) + 2) || need > hardBrake) return Infinity;
  if (w.occupied[crossKey(w, axis, lineIndex, k)] & (axis === "z" ? AXIS_X : AXIS_Z)) return distance;
  if (self && "turnCross" in self && k === self.turnCross) {
    const endAlong = turnEnd(self);
    const room = blockHasRoom(w, self.nextAxis, self.nextIndex, self.nextDir, endAlong - self.nextDir * TURN_R, self.lineIndex, len, self, laneList(w, axis, lineIndex, dir));
    return room && !tramBlocksTurn(w, self, endAlong) ? Infinity : distance;
  }
  return blockHasRoom(w, axis, lineIndex, dir, cross[k] + dir * BOX_HALF, k, len, self, null) ? Infinity : distance;
}

function drive(c: { vel: number; acc: number }, limit: number, gain: number, accel: number, hardBrake: number, dt: number) {
  const want = Math.max(-hardBrake, Math.min(accel, (limit - c.vel) * gain));
  c.acc += (want - c.acc) * Math.min(1, dt * JERK_RATE);
  c.vel += c.acc * dt;
  if (c.vel <= 0) {
    c.vel = 0;
    if (c.acc < 0) c.acc = 0;
  }
}

function tramLane(t: Tram) {
  const remaining = tramRemaining(t);
  const u = Math.min(1, Math.max(0, 1 - remaining / TRAM_CROSSOVER));
  const s = u * u * (3 - 2 * u);
  t.slope = (12 * TRAM_LANE * u * (1 - u)) / TRAM_CROSSOVER;
  return -t.dir * TRAM_LANE * (1 - 2 * s);
}

function tramRemaining(t: Tram) {
  return t.dir === 1 ? TRAM_END - t.along : t.along + TRAM_END;
}

function tramCommitted(t: Tram) {
  return t.dwell > 0 || tramRemaining(t) < TRAM_GATE;
}

function crossoverOccupied(t: Tram, oncoming: Car[]) {
  const end = t.dir * TRAM_END;
  for (const o of oncoming) {
    const fromEnd = (o.along - end) * t.dir;
    const near = fromEnd + o.len / 2 > -(TRAM_CROSSOVER + TRAM_LEN / 2);
    const clearOfFootprint = fromEnd - o.len / 2 - TRAM_LEN / 2 - STANDSTILL_GAP;
    if (near && clearOfFootprint < (o.vel * o.vel) / (2 * COMFORT_BRAKE) + 1) return true;
  }
  return false;
}

function turnerCommitted(w: World, t: Tram) {
  for (const o of laneList(w, "x", w.zs.length - 1, -1)) {
    if (o.nextAxis !== "z" || o.nextIndex !== WOODWARD_OUTER || o.turnCross < 0 || o.nextDir !== -t.dir) continue;
    const endAlong = turnEnd(o);
    if (Math.abs(t.dir * TRAM_END - endAlong) > TRAM_LEN + o.len) continue;
    if (o.turning) return true;
    const toLine = (w.xs[o.turnCross] - o.along) * o.dir - o.len / 2 - STOP_LINE_BACK;
    if (toLine < -0.5 || (o.vel > 1 && toLine < (o.vel * o.vel) / (2 * STOP_BRAKE))) return true;
  }
  return false;
}

function tramLeaderLimit(w: World, t: Tram) {
  let limit = Infinity;
  for (const o of w.trams) {
    if (o === t || o.dir !== t.dir || Math.abs(o.lane - t.lane) > 1.6) continue;
    const gap = (o.along - t.along) * t.dir;
    if (gap > 0) limit = Math.min(limit, followSpeed(gap - TRAM_LEN, o.vel, t.vel, TRAM_BRAKE));
  }
  return limit;
}

function otherTramAtTerminus(w: World, t: Tram) {
  for (const o of w.trams) if (o !== t && Math.abs(o.along - t.dir * TRAM_END) < TRAM_CROSSOVER + TRAM_LEN * 1.5) return true;
  return false;
}

function stepTram(w: World, t: Tram, dt: number, time: number) {
  if (t.dwell > 0) {
    t.dwell -= dt;
    t.vel = 0;
    t.acc = 0;
    if (t.dwell <= 0) t.dir = t.dir === 1 ? -1 : 1;
    t.lane = tramLane(t);
    return;
  }
  const remaining = tramRemaining(t);
  const lane = laneList(w, "z", WOODWARD_OUTER, t.dir);
  let limit = Math.min(TRAM_SPEED, Math.sqrt(2 * TRAM_BRAKE * Math.max(0, remaining - 0.05)));
  const stop = junctionStop(w, "z", WOODWARD_OUTER, t.along, t.dir, TRAM_LEN, t.vel, t, time, TRAM_BRAKE * 1.5, TRAM_HARD_BRAKE);
  if (stop < Infinity) limit = Math.min(limit, stopSpeed(stop, TRAM_BRAKE));
  limit = Math.min(limit, laneLeaderLimit(lane, null, t.along, t.dir, TRAM_LEN, t.vel, TRAM_BRAKE), tramLeaderLimit(w, t));
  const oncoming = laneList(w, "z", WOODWARD_OUTER, t.dir === 1 ? -1 : 1);
  if (!tramCommitted(t) && (crossoverOccupied(t, oncoming) || turnerCommitted(w, t) || otherTramAtTerminus(w, t))) limit = Math.min(limit, stopSpeed(remaining - TRAM_GATE, TRAM_BRAKE));
  drive(t, limit, 2, TRAM_ACCEL, TRAM_HARD_BRAKE, dt);
  t.along += t.vel * dt * t.dir;
  if (tramRemaining(t) <= 0.12) {
    t.along = t.dir * TRAM_END;
    t.vel = 0;
    t.acc = 0;
    t.dwell = TRAM_DWELL;
  }
  t.lane = tramLane(t);
}

function tramLimit(c: Car, trams: Tram[]) {
  let limit = Infinity;
  for (const t of trams) {
    if (t.dir !== c.dir) {
      if (!tramCommitted(t)) continue;
      const toTerminus = (t.dir * TRAM_END - c.along) * c.dir;
      if (toTerminus > 0) limit = Math.min(limit, followSpeed(toTerminus - c.len / 2 - TRAM_LEN / 2, 0, c.vel, COMFORT_BRAKE));
      continue;
    }
    const crossing = Math.abs(t.lane) < TRAM_LANE - 0.02;
    if (!crossing && Math.sign(t.lane) !== Math.sign(c.lane)) continue;
    const gap = (t.along - c.along) * c.dir;
    if (gap > 0) limit = Math.min(limit, followSpeed(gap - c.len / 2 - TRAM_LEN / 2, t.vel, c.vel, COMFORT_BRAKE));
  }
  return limit;
}

function removeFrom(lane: Car[], c: Car) {
  const at = lane.indexOf(c);
  if (at < 0) return;
  lane[at] = lane[lane.length - 1];
  lane.pop();
}

function finishTurn(w: World, c: Car) {
  const past = c.arc - TURN_ARC;
  const endAlong = turnEnd(c);
  removeFrom(laneList(w, c.axis, c.lineIndex, c.dir), c);
  c.turning = false;
  c.arc = 0;
  setLeg(w, c, c.nextAxis, c.nextIndex, c.nextDir);
  c.along = endAlong + c.dir * past;
  laneList(w, c.axis, c.lineIndex, c.dir).push(c);
}

function turnLaneLimit(w: World, c: Car, before: number) {
  const endAlong = turnEnd(c);
  const lane = laneList(w, c.nextAxis, c.nextIndex, c.nextDir);
  let limit = Infinity;
  for (let j = 0; j < lane.length; j++) {
    const o = lane[j];
    const ahead = (o.along - endAlong) * c.nextDir;
    if (ahead < -o.len / 2) continue;
    limit = Math.min(limit, followSpeed(before + ahead - c.len / 2 - o.len / 2, o.vel, c.vel, COMFORT_BRAKE));
  }
  return limit;
}

function sameTurnLimit(lane: Car[], c: Car) {
  let limit = Infinity;
  for (let j = 0; j < lane.length; j++) {
    const o = lane[j];
    if (o === c || !o.turning || o.turnCross !== c.turnCross || o.nextIndex !== c.nextIndex) continue;
    const gap = o.arc - c.arc;
    if (gap > 0) limit = Math.min(limit, followSpeed(gap - c.len / 2 - o.len / 2, o.vel, c.vel, COMFORT_BRAKE));
  }
  return limit;
}

function stepCar(w: World, i: number, dt: number, time: number) {
  const c = w.cars[i];
  const lane = laneList(w, c.axis, c.lineIndex, c.dir);
  if (c.turning) {
    const limit = Math.min(TURN_SPEED, turnLaneLimit(w, c, TURN_ARC - c.arc), sameTurnLimit(lane, c));
    drive(c, limit, SPEED_GAIN, c.accel, HARD_BRAKE, dt);
    c.brake = c.acc < -0.6 || (c.vel < 0.3 && limit < 0.5);
    c.arc += c.vel * dt;
    c.along = c.turnAt + c.dir * c.arc;
    c.spin += (c.vel * dt) / VEHICLE_SPECS[c.kind].wheelR;
    if (c.arc >= TURN_ARC + c.len / 2) finishTurn(w, c);
    return;
  }
  let limit = Math.min(c.speed, laneLeaderLimit(lane, c, c.along, c.dir, c.len, c.vel, COMFORT_BRAKE));
  if (c.onWoodward) limit = Math.min(limit, tramLimit(c, w.trams));
  const stop = junctionStop(w, c.axis, c.lineIndex, c.along, c.dir, c.len, c.vel, c, time, STOP_BRAKE, HARD_BRAKE);
  if (stop < Infinity) limit = Math.min(limit, stopSpeed(stop, STOP_BRAKE));
  if (c.turnCross >= 0) {
    const toTurn = (c.turnAt - c.along) * c.dir - c.len / 2;
    limit = Math.min(limit, Math.sqrt(TURN_SPEED * TURN_SPEED + 2 * COMFORT_BRAKE * Math.max(0, toTurn)));
    if (toTurn < LIGHT_LOOKAHEAD) limit = Math.min(limit, turnLaneLimit(w, c, (c.turnAt - c.along) * c.dir + TURN_ARC));
  }
  drive(c, limit, SPEED_GAIN, c.accel, HARD_BRAKE, dt);
  c.brake = c.acc < -0.6 || (c.vel < 0.3 && limit < 0.5);
  c.along += c.vel * dt * c.dir;
  c.spin += (c.vel * dt) / VEHICLE_SPECS[c.kind].wheelR;
  if (c.turnCross >= 0 && (c.along - c.turnAt) * c.dir >= -c.len / 2) {
    c.turning = true;
    c.arc = (c.along - c.turnAt) * c.dir;
    return;
  }
  if (c.loop >= 0) return;
  if (c.along > X_ROAD_MAX || c.along < X_ROAD_MIN) {
    c.along = c.dir === 1 ? X_ROAD_MIN : X_ROAD_MAX;
    c.vel = Math.min(c.vel, REENTRY_SPEED);
    clearEntry(lane, c);
  }
}

function stepWorld(w: World, time: number) {
  let span = w.last < 0 ? 0 : Math.min(time - w.last, MAX_CATCH_UP);
  w.last = time;
  while (span > 1e-6) {
    const dt = Math.min(span, SIM_STEP);
    span -= dt;
    TRAFFIC_CLOCK.time += dt;
    stepOnce(w, dt, TRAFFIC_CLOCK.time);
  }
}

function stepOnce(w: World, dt: number, time: number) {
  w.occupied.fill(0);
  for (const c of w.cars) {
    if (c.turning) w.occupied[crossKey(w, c.axis, c.lineIndex, c.turnCross)] |= AXIS_Z | AXIS_X;
    else markOccupied(w, c.axis, c.lineIndex, c.along, c.dir, c.len, c.vel);
  }
  for (const t of w.trams) markOccupied(w, "z", WOODWARD_OUTER, t.along, t.dir, TRAM_LEN, t.vel, TRAM_END);
  for (const t of w.trams) stepTram(w, t, dt, time);
  for (let i = 0; i < w.cars.length; i++) stepCar(w, i, dt, time);
}

function clearEntry(lane: Car[], c: Car) {
  for (let j = 0; j < lane.length; j++) {
    const o = lane[j];
    if (o === c) continue;
    const gap = (o.along - c.along) * c.dir;
    const need = STANDSTILL_GAP + HEADWAY * c.vel + c.len / 2 + o.len / 2;
    if (gap > -need && gap < need) c.along = o.along - c.dir * need;
  }
}

const turnFront = { x: 0, z: 0 };
const turnRear = { x: 0, z: 0 };

function turnPoint(c: Car, u: number, out: { x: number; z: number }) {
  const d1x = c.axis === "x" ? c.dir : 0;
  const d1z = c.axis === "z" ? c.dir : 0;
  const d2x = c.nextAxis === "x" ? c.nextDir : 0;
  const d2z = c.nextAxis === "z" ? c.nextDir : 0;
  if (u <= 0) {
    out.x = c.cx + d1x * (u - TURN_R);
    out.z = c.cz + d1z * (u - TURN_R);
  } else if (u >= TURN_ARC) {
    out.x = c.cx + d2x * (TURN_R + u - TURN_ARC);
    out.z = c.cz + d2z * (TURN_R + u - TURN_ARC);
  } else {
    const phi = (u / TURN_ARC) * (Math.PI / 2);
    const s = Math.sin(phi);
    const k = Math.cos(phi);
    out.x = c.cx + d1x * TURN_R * (s - 1) + d2x * TURN_R * (1 - k);
    out.z = c.cz + d1z * TURN_R * (s - 1) + d2z * TURN_R * (1 - k);
  }
}

function carFrame(c: Car, out: Frame) {
  if (c.turning) {
    const half = c.len / 2;
    turnPoint(c, c.arc + half, turnFront);
    turnPoint(c, c.arc - half, turnRear);
    out.x = (turnFront.x + turnRear.x) / 2;
    out.z = (turnFront.z + turnRear.z) / 2;
    out.yaw = Math.atan2(turnFront.x - turnRear.x, turnFront.z - turnRear.z);
    return;
  }
  out.x = c.axis === "z" ? c.line + c.lane : c.along;
  out.z = c.axis === "z" ? c.along : c.line - c.lane;
  out.yaw = c.axis === "z" ? (c.dir === 1 ? 0 : Math.PI) : c.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
}

function poseCar(w: World, i: number, out: VehiclePose, time: number) {
  if (i === 0) stepWorld(w, time);
  const c = w.cars[i];
  carFrame(c, c);
  out.x = c.x;
  out.z = c.z;
  out.yaw = c.yaw;
  out.y = CAR_Y;
  out.spin = c.spin;
  out.brake = c.brake;
  out.pitch = Math.max(-0.012, Math.min(0.02, -c.acc * DIVE_PER_ACCEL));
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
      if (!g) continue;
      g.position.set(x + t.lane, 0.4, t.along);
      g.rotation.y = Math.atan(t.slope);
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

const TRAIL = gradientColors(new BoxGeometry(1, 1, 1).translate(0, 0, -0.5), "z", -1, 1);
const TRAIL_EXPOSURE_SECONDS = 0.8;
const TRAIL_MAX = 11;
const TRAIL_FROM_NIGHT = 0.15;
const HEAD_TRAIL = new Color(1, 0.86, 0.62).multiplyScalar(0.6);
const TAIL_TRAIL = new Color(1, 0.1, 0.06).multiplyScalar(1.8);

function placeTrail(m: InstancedMesh, d: Object3D, slot: number, frame: Frame, end: number, y: number, width: number, length: number) {
  d.position.set(frame.x + Math.sin(frame.yaw) * end, y, frame.z + Math.cos(frame.yaw) * end);
  d.rotation.set(0, frame.yaw, 0);
  d.scale.set(width, 0.12, Math.max(length, 0.001));
  d.updateMatrix();
  m.setMatrixAt(slot, d.matrix);
}

function placeTrails(m: InstancedMesh, d: Object3D, w: World) {
  for (let i = 0; i < w.cars.length; i++) {
    const c = w.cars[i];
    const length = Math.min(TRAIL_MAX, c.vel * TRAIL_EXPOSURE_SECONDS);
    const lampY = CAR_Y + VEHICLE_SPECS[c.kind].lamp.y;
    placeTrail(m, d, i * 2, c, c.len / 2, lampY, 0.5, length + c.len);
    placeTrail(m, d, i * 2 + 1, c, -c.len / 2, lampY + 0.04, 0.7, length);
  }
  m.instanceMatrix.needsUpdate = true;
}

function trailColors(count: number) {
  const colors = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    HEAD_TRAIL.toArray(colors, i * 6);
    TAIL_TRAIL.toArray(colors, i * 6 + 3);
  }
  return colors;
}

function LightTrails({ world }: { world: World }) {
  const dn = useDayNight();
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshBasicMaterial>(null);
  const [dummy] = useState(() => new Object3D());
  const count = world.cars.length;
  const [colors] = useState(() => trailColors(count));
  useEffect(() => {
    if (mat.current) mat.current.opacity = Math.max(0, dn.night - TRAIL_FROM_NIGHT) * 1.1;
  }, [dn.night]);
  const lit = dn.night > TRAIL_FROM_NIGHT;
  useFrame(() => {
    if (lit && ref.current) placeTrails(ref.current, dummy, world);
  });
  return (
    <instancedMesh ref={ref} args={[TRAIL, undefined, count * 2]} visible={lit} frustumCulled={false} name="light-trails">
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
      <meshBasicMaterial ref={mat} vertexColors transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

export default function Traffic() {
  const [world] = useState(() => buildWorld());
  const pose = useCallback<PoseFn>((i, out, time) => poseCar(world, i, out, time), [world]);
  const { quality } = useCity();
  return (
    <group>
      <VehicleFleet items={world.items} pose={pose} dynamic castShadow />
      <Streetcars world={world} />
      {quality === "high" && <LightTrails world={world} />}
    </group>
  );
}
