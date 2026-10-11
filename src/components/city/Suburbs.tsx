"use client";

import { useFrame } from "@react-three/fiber";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, MeshStandardMaterial, PlaneGeometry, Texture } from "three";
import { labelTexture } from "./labels";
import { fillInstances, fillPlacements, mergeParts, useBaseBoxGeometry, type Placement } from "./instancing";
import { useWindowMaterial } from "./useWindowMaterial";
import { useDayNight } from "./DayNightContext";
import { AMBASSADOR_CLEAR_HALF, AMBASSADOR_RAMP_Z, AMBASSADOR_X, CITY_HALF_Z, OUTER_HALF_X, OUTER_MIN_Z, RIVER_FAR, RIVER_NEAR, RIVERWALK_HALF, ROAD } from "./layout";
import { mulberry32, pick, range } from "./rng";
import { makeConcreteTexture, makeLawnTexture, makeRoadTexture, makeShingleTexture } from "./textures";
import TreeStand, { plantTrees, type TreePlace } from "./TreeStand";
import VehicleFleet, { fleetStep, type FleetItem, type PoseFn, type VehiclePose } from "./VehicleFleet";
import { FLEET_COLORS, type VehicleKind } from "./vehicles";

const EXTENT = 1650;
const LOT = 11;
const STREET = 62;
const RING = 400;
const GROUND = 0.25;
const LOT_PAD = STREET - 7;
const DETAIL_REACH = 560;
const LIGHT_REACH = 1500;
const VACANT_SHARE = 0.12;
const BOARDED_SHARE = 0.08;
const TWO_STOREY_SHARE = 0.2;
const WINDOW_SLOTS: [number, number, number, number][] = [
  [-1.7, 1.6, 3.5, 0],
  [1.7, 1.6, 3.5, 0],
  [3.0, 1.6, -0.4, Math.PI / 2],
];
const HOUSE_COLORS = ["#8a4a3a", "#b07a5a", "#c9b48c", "#9a95a8", "#5a6a7a", "#7c6a5c", "#a3563f", "#e8e2d2", "#6e5a4a", "#3f4e66"];
const ROOF_COLORS = ["#3a3230", "#4a3a38", "#2c3038", "#5a4a3a"];
const MID_COLORS = ["#8a4a3a", "#a3563f", "#b89a7a", "#9c8468", "#5e4a3e", "#c0603a", "#7c6a5c", "#bfa57c", "#c9b48c"];
const LOFT_COLORS = ["#8a4a3a", "#a3563f", "#7c6a5c", "#6e5a4a", "#9c8468", "#4e4038", "#c9b48c"];
const LAWN = new Color("#3f6a42");
const PATH = new Color("#77736b");
const DOWNTOWN_MARGIN = 24;
const LOFT_REACH = 900;

interface House {
  x: number;
  z: number;
  rot: number;
  s: number;
  h: number;
  color: Color;
  roof: Color;
  litMask: number;
  detail: boolean;
  porch: boolean;
  chimney: boolean;
  garage: boolean;
  fence: boolean;
  boarded: boolean;
}

type BlockKind = "houses" | "park" | "church" | "school" | "store" | "apartments" | "industrial";

interface SignSpot {
  text: string;
  placements: Placement[];
}

interface Features {
  boxes: Placement[];
  roofs: Placement[];
  lots: Placement[];
  fields: Placement[];
  lawns: Placement[];
  weeds: Placement[];
  towers: Placement[];
  signs: SignSpot[];
}

const STORE_SIGNS = ["PARTY STORE · LOTTO", "CONEY ISLAND", "LIQUOR · BEER · WINE", "LAUNDROMAT", "AUTO PARTS · TIRES"];
const BOX_COLORS = { church: ["#e8e2d2", "#8a4a3a", "#c9b48c"], school: ["#b89a7a", "#9c8468", "#c9b48c"], store: ["#8a4a3a", "#5a6a7a", "#e8e2d2", "#a3563f"], shed: ["#9a95a8", "#7c6a5c", "#5a6a7a"] };

function rollBlockKind(rand: () => number): BlockKind {
  const r = rand();
  if (r < 0.06) return "park";
  if (r < 0.1) return "church";
  if (r < 0.13) return "school";
  if (r < 0.19) return "store";
  if (r < 0.24) return "apartments";
  if (r < 0.28) return "industrial";
  return "houses";
}

function placed(x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, color?: Color): Placement {
  return { x, y: GROUND + y, z, ry, sx, sy, sz, color };
}

function placeFeatureBlock(kind: BlockKind, cx: number, cz: number, rand: () => number, f: Features, trees: TreePlace[], midrise: MidLot[]) {
  const half = LOT_PAD / 2;
  if (kind === "park") {
    f.lawns.push(placed(cx, 0.02, cz, LOT_PAD - 2, 1, LOT_PAD - 2));
    f.fields.push(placed(cx + 9, 0.04, cz + 9, 9, 1, 9));
    f.boxes.push(placed(cx - 12, 1.5, cz - 12, 6, 3, 6, 0, new Color("#5a4636")));
    f.roofs.push(placed(cx - 12, 3, cz - 12, 1.3, 0.8, 1.3, 0, new Color("#3a3230")));
    for (let k = 0; k < 16; k++) trees.push({ x: cx + range(rand, -half + 4, half - 4), z: cz + range(rand, -half + 4, half - 4), s: range(rand, 1.1, 1.9) });
    return;
  }
  if (kind === "church") {
    const body = new Color(pick(rand, BOX_COLORS.church));
    f.lawns.push(placed(cx, 0.02, cz, LOT_PAD - 2, 1, LOT_PAD - 2));
    f.boxes.push(placed(cx - 6, 4.5, cz, 14, 9, 24, 0, body));
    f.roofs.push(placed(cx - 6, 9, cz, 2.05, 1.6, 3.5, 0, new Color("#3a3230")));
    f.boxes.push(placed(cx - 6, 8, cz + 10.5, 3.2, 16, 3.2, 0, body));
    f.roofs.push(placed(cx - 6, 16, cz + 10.5, 0.5, 2.4, 0.5, 0, new Color("#2c3038")));
    f.lots.push(placed(cx + 13, 0.03, cz, 22, 1, 30));
    for (let k = 0; k < 5; k++) trees.push({ x: cx + range(rand, -half + 3, -14), z: cz + range(rand, -half + 3, half - 3), s: range(rand, 1, 1.6) });
    return;
  }
  if (kind === "school") {
    const body = new Color(pick(rand, BOX_COLORS.school));
    f.lawns.push(placed(cx, 0.02, cz, LOT_PAD - 2, 1, LOT_PAD - 2));
    f.boxes.push(placed(cx, 4, cz - 14, 42, 8, 14, 0, body));
    f.boxes.push(placed(cx - 16, 2.5, cz - 2, 10, 5, 10, 0, body));
    f.lots.push(placed(cx + 12, 0.03, cz - 1, 22, 1, 12));
    f.fields.push(placed(cx, 0.04, cz + 14, 14, 1, 10));
    for (let k = 0; k < 6; k++) trees.push({ x: cx + range(rand, -half + 3, half - 3), z: cz + range(rand, 8, half - 3), s: range(rand, 0.9, 1.4) });
    return;
  }
  if (kind === "store") {
    const body = new Color(pick(rand, BOX_COLORS.store));
    f.boxes.push(placed(cx, 2.6, cz - 19, 44, 5.2, 14, 0, body));
    f.boxes.push(placed(cx, 5.4, cz - 19, 45, 0.6, 15, 0, new Color("#2b2b3a")));
    f.lots.push(placed(cx, 0.03, cz - 2, 46, 1, 20));
    const sign = pick(rand, STORE_SIGNS);
    let spot = f.signs.find((sg) => sg.text === sign);
    if (!spot) {
      spot = { text: sign, placements: [] };
      f.signs.push(spot);
    }
    spot.placements.push(placed(cx, 4.2, cz - 11.9, 16, 3.2, 1, 0));
    f.boxes.push(placed(cx + 20, 4, cz + 8, 0.5, 8, 0.5, 0, new Color("#5a5a78")));
    spot.placements.push(placed(cx + 20, 9, cz + 8, 8, 2, 1, Math.PI / 2));
    f.lawns.push(placed(cx, 0.02, cz + 18, LOT_PAD - 2, 1, 16));
    for (let k = 0; k < 4; k++) trees.push({ x: cx + range(rand, -half + 3, half - 3), z: cz + range(rand, 13, half - 3), s: range(rand, 0.9, 1.3) });
    return;
  }
  if (kind === "apartments") {
    for (const [ox, oz] of [[-15, -10], [15, -10], [0, 14]] as [number, number][]) {
      midrise.push({ x: cx + ox, z: cz + oz, w: 18, d: 13, h: range(rand, 9, 15), color: new Color(pick(rand, MID_COLORS)), seed: rand() * 100 });
    }
    f.lots.push(placed(cx, 0.03, cz - 1, 20, 1, 12));
    f.lawns.push(placed(cx, 0.02, cz, LOT_PAD - 2, 1, LOT_PAD - 2));
    for (let k = 0; k < 6; k++) trees.push({ x: cx + range(rand, -half + 3, half - 3), z: cz + range(rand, -half + 3, half - 3), s: range(rand, 0.9, 1.5) });
    return;
  }
  const shed = new Color(pick(rand, BOX_COLORS.shed));
  f.boxes.push(placed(cx - 10, 4, cz - 8, 30, 8, 22, 0, shed));
  f.boxes.push(placed(cx + 14, 3, cz + 10, 20, 6, 18, 0, shed));
  f.boxes.push(placed(cx - 10, 8.3, cz - 8, 31, 0.6, 23, 0, new Color("#3a3a46")));
  f.lots.push(placed(cx - 6, 0.03, cz + 15, 34, 1, 18));
  f.towers.push(placed(cx + 16, 0, cz - 14, 1, 1, 1));
}

const WATER_TOWER = (() => {
  const tank = new CylinderGeometry(3.2, 3.2, 4.5, 12).translate(0, 16, 0);
  const cap = new ConeGeometry(3.3, 1.6, 12).translate(0, 19, 0);
  const legs = [[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z]) => new CylinderGeometry(0.18, 0.22, 14, 6).translate(x, 7, z));
  return mergeParts([tank, cap, ...legs], "water tower");
})();
const FEATURE_ROOF = new ConeGeometry(4.9, 2.8, 4).rotateY(Math.PI / 4).translate(0, 1.4, 0);
const FLAT_PLANE = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const FIELD_DISC = new CircleGeometry(1, 20).rotateX(-Math.PI / 2);

interface MidLot {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: Color;
  seed: number;
}

interface Bank {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: Color;
}

const FREEWAY_X = OUTER_HALF_X + 42;
const FREEWAY_Z0 = -EXTENT;
const FREEWAY_Z1 = CITY_HALF_Z - 10;
const FREEWAY_Y = 7;
const FREEWAY_CLEAR = 12;

function onFreeway(x0: number, z: number) {
  return x0 < FREEWAY_X + FREEWAY_CLEAR && x0 + STREET > FREEWAY_X - FREEWAY_CLEAR && z < FREEWAY_Z1 + FREEWAY_CLEAR;
}

function freewayVerge(x0: number, z0: number, z1: number, rand: () => number, trees: TreePlace[], banks: Bank[]) {
  const west = FREEWAY_X - FREEWAY_CLEAR - (x0 + 2);
  const east = x0 + STREET - 2 - (FREEWAY_X + FREEWAY_CLEAR);
  banks.push(lawnRect(x0 + 2 + west / 2, z0, z1, west));
  banks.push(lawnRect(FREEWAY_X + FREEWAY_CLEAR + east / 2, z0, z1, east));
  for (let k = 0; k < 6; k++) {
    const onWest = k % 2 === 0;
    const x = onWest ? x0 + 4 + rand() * (west - 4) : FREEWAY_X + FREEWAY_CLEAR + 2 + rand() * (east - 4);
    trees.push({ x, z: range(rand, z0 + 3, z1 - 3), s: range(rand, 1, 1.8) });
  }
}

function insideDowntown(x: number, z: number) {
  return Math.abs(x) < OUTER_HALF_X + DOWNTOWN_MARGIN && z > OUTER_MIN_Z - DOWNTOWN_MARGIN && z < RIVER_FAR + 14;
}

function nearDowntown(x: number, z: number) {
  const dx = Math.max(0, Math.abs(x) - OUTER_HALF_X);
  const dz = Math.max(0, OUTER_MIN_Z - z);
  return z < CITY_HALF_Z && Math.hypot(dx, dz) < RING;
}

function isRiver(z: number) {
  return z > CITY_HALF_Z - 6 && z < RIVER_FAR + 12;
}

function blockTouchesRiver(cz: number) {
  return cz + STREET / 2 > CITY_HALF_Z - 10 && cz - STREET / 2 < RIVER_FAR + 16;
}

function lawnRect(x: number, z0: number, z1: number, w: number): Bank {
  return { x, y: -0.02, z: (z0 + z1) / 2, w, h: 0.08, d: z1 - z0, color: LAWN };
}

function riverStreets() {
  let near = -EXTENT;
  let far = EXTENT;
  for (let z = -EXTENT; z < EXTENT; z += STREET) {
    const cz = z + STREET / 2;
    if (!blockTouchesRiver(cz)) continue;
    if (cz < RIVER_NEAR) near = Math.max(near, z);
    if (cz > RIVER_FAR) far = Math.min(far, z + STREET);
  }
  return { near, far };
}

function buildRiverfront(rand: () => number, trees: TreePlace[], midrise: MidLot[], banks: Bank[]) {
  const streets = riverStreets();
  const nearBank = { z0: streets.near + ROAD / 2 + 0.5, z1: RIVER_NEAR - 5 };
  const farBank = { z0: RIVER_FAR + 5, z1: streets.far - ROAD / 2 - 0.5 };
  const path = (x: number, z: number, w: number) => banks.push({ x, y: 0.2, z, w, h: 0.5, d: 3, color: PATH });
  for (let x = -EXTENT; x < EXTENT; x += STREET) {
    const cx = x + STREET / 2;
    if (!insideDowntown(cx, nearBank.z0) && onFreeway(x, nearBank.z0)) {
      freewayVerge(x, nearBank.z0, nearBank.z1, rand, trees, banks);
    } else if (!insideDowntown(cx, nearBank.z0)) {
      banks.push(lawnRect(cx, nearBank.z0, nearBank.z1, STREET - 4));
      let built = false;
      if (cx > 0 && cx < LOFT_REACH) {
        for (const ox of [-14, 14]) {
          midrise.push({ x: cx + ox, z: nearBank.z0 + 9, w: 26, d: 16, h: range(rand, 7, 13), color: new Color(pick(rand, LOFT_COLORS)), seed: rand() * 100 });
        }
        built = true;
      } else if (cx < 0 && cx > -LOFT_REACH) {
        midrise.push({ x: cx, z: nearBank.z0 + 11, w: 46, d: 18, h: range(rand, 6, 9), color: new Color(pick(rand, BOX_COLORS.shed)), seed: rand() * 100 });
        built = true;
      }
      const treeZ0 = built ? nearBank.z0 + 23 : nearBank.z0 + 3;
      for (let k = 0; k < 7; k++) {
        trees.push({ x: cx + (rand() - 0.5) * (STREET - 10), z: range(rand, treeZ0, nearBank.z1 - 8), s: range(rand, 1, 1.8) });
      }
    }
    banks.push(lawnRect(cx, farBank.z0, farBank.z1, STREET - 4));
    for (let k = 0; k < 6; k++) {
      const tree = { x: cx + (rand() - 0.5) * (STREET - 10), z: range(rand, farBank.z0 + 6, farBank.z1 - 3), s: range(rand, 1, 1.8) };
      if (Math.abs(tree.x - AMBASSADOR_X) > AMBASSADOR_CLEAR_HALF + 3) trees.push(tree);
    }
  }
  const gapHalf = OUTER_HALF_X + DOWNTOWN_MARGIN;
  for (const side of [-1, 1]) {
    banks.push(lawnRect((side * (RIVERWALK_HALF + gapHalf)) / 2, CITY_HALF_Z, nearBank.z1 + 1, gapHalf - RIVERWALK_HALF));
    path((side * (RIVERWALK_HALF + EXTENT)) / 2, RIVER_NEAR - 7, EXTENT - RIVERWALK_HALF);
  }
  path(0, RIVER_FAR + 7, EXTENT * 2);
}

function buildHouses(): {
  houses: House[];
  trees: TreePlace[];
  midrise: MidLot[];
  pads: { x: number; z: number }[];
  banks: Bank[];
  features: Features;
} {
  const rand = mulberry32(90210);
  const houses: House[] = [];
  const trees: TreePlace[] = [];
  const midrise: MidLot[] = [];
  const pads: { x: number; z: number }[] = [];
  const banks: Bank[] = [];
  const features: Features = { boxes: [], roofs: [], lots: [], fields: [], lawns: [], weeds: [], towers: [], signs: [] };
  for (let z = -EXTENT; z < EXTENT; z += STREET) {
    for (let x = -EXTENT; x < EXTENT; x += STREET) {
      const cx = x + STREET / 2;
      const cz = z + STREET / 2;
      if (blockTouchesRiver(cz) || insideDowntown(cx, cz)) continue;
      pads.push({ x: cx, z: cz });
      const windsorPark = cz > RIVER_FAR && cz < RIVER_FAR + 150 && Math.abs(cx) < 420;
      if (windsorPark) {
        for (let k = 0; k < 10; k++) {
          const tree = { x: cx + (rand() - 0.5) * (STREET - 10), z: cz + (rand() - 0.5) * (STREET - 10), s: range(rand, 1, 1.8) };
          if (Math.abs(tree.x - AMBASSADOR_X) > AMBASSADOR_CLEAR_HALF + 3 || tree.z > AMBASSADOR_RAMP_Z[1] + 6) trees.push(tree);
        }
        banks.push(lawnRect(cx, cz - (STREET - 4) / 2, cz + (STREET - 4) / 2, STREET - 4));
        continue;
      }
      if (onFreeway(x, cz)) {
        freewayVerge(x, cz - (STREET - 4) / 2, cz + (STREET - 4) / 2, rand, trees, banks);
        continue;
      }
      const windsorCore = cz >= RIVER_FAR + 150 && cz < RIVER_FAR + 330 && Math.abs(cx) < 260;
      const ring = nearDowntown(cx, cz) || windsorCore;
      if (ring && rand() < 0.8) {
        const n = 2 + Math.floor(rand() * 3);
        const cells: [number, number][] = n === 2 ? [[-13, 0], [13, 0]] : n === 3 ? [[-14, -12], [14, -12], [0, 14]] : [[-13, -13], [13, -13], [-13, 13], [13, 13]];
        cells.forEach(([ox, oz]) => {
          const w = range(rand, 16, 24);
          const d = range(rand, 16, 24);
          const tall = windsorCore ? range(rand, 10, 40) : range(rand, 6, 26);
          midrise.push({ x: cx + ox, z: cz + oz, w, d, h: tall, color: new Color(pick(rand, MID_COLORS)), seed: rand() * 100 });
        });
        continue;
      }
      const kind = rollBlockKind(rand);
      if (kind !== "houses") {
        placeFeatureBlock(kind, cx, cz, rand, features, trees, midrise);
        continue;
      }
      for (let row = 0; row < 2; row++) {
        for (let k = 0; k < 5; k++) {
          const hx = x + 8 + k * LOT + (rand() - 0.5) * 1.5;
          const hz = z + 11 + row * 38 + (rand() - 0.5) * 2;
          const rot = row === 0 ? Math.PI : 0;
          if (rand() < VACANT_SHARE) {
            features.weeds.push({ x: hx, y: GROUND + 0.015, z: hz - Math.cos(rot) * (YARD_DEPTH / 2 - FRONT_SETBACK), ry: rot, sx: LOT, sy: 1, sz: YARD_DEPTH, color: new Color(pick(rand, ["#6b6a3a", "#5a6a38", "#7a7040"])) });
            if (rand() < 0.6) trees.push({ x: hx + (rand() - 0.5) * 4, z: hz + (rand() - 0.5) * 6, s: range(rand, 1.0, 1.7) });
            continue;
          }
          const boarded = rand() < BOARDED_SHARE;
          houses.push({
            x: hx,
            z: hz,
            rot,
            s: range(rand, 0.85, 1.2),
            h: range(rand, 3.4, 5.4) * (rand() < TWO_STOREY_SHARE ? 1.6 : 1),
            color: boarded ? new Color("#4a3f3a") : new Color(pick(rand, HOUSE_COLORS)),
            roof: new Color(pick(rand, ROOF_COLORS)),
            litMask: boarded || rand() >= 0.45 ? 0 : 1 + Math.floor(rand() * 7),
            detail: Math.hypot(hx, hz - CITY_HALF_Z) < DETAIL_REACH,
            porch: !boarded && rand() < 0.55,
            chimney: rand() < 0.6,
            garage: k < 4 && rand() < 0.35,
            fence: rand() < 0.35,
            boarded,
          });
          if (rand() < 0.5) trees.push({ x: hx + (rand() - 0.5) * 6, z: hz + (row === 0 ? -6.5 : 6.5) + (rand() - 0.5) * 2, s: range(rand, 0.8, 1.4) });
        }
      }
    }
  }
  buildRiverfront(rand, trees, midrise, banks);
  return { houses, trees, midrise, pads, banks, features };
}

function Banks({ banks }: { banks: Bank[] }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    fillInstances(m, banks.length, (i, d) => {
      const b = banks[i];
      d.position.set(b.x, b.y, b.z);
      d.scale.set(b.w, b.h, b.d);
    });
    banks.forEach((b, i) => m.setColorAt(i, b.color));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [banks]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, banks.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

function local(h: House, lx: number, ly: number, lz: number, ry: number, sx: number, sy: number, sz: number, color?: Color): Placement {
  const c = Math.cos(h.rot);
  const s = Math.sin(h.rot);
  return { x: h.x + lx * c + lz * s, y: GROUND + ly, z: h.z - lx * s + lz * c, ry: h.rot + ry, sx, sy, sz, color };
}

const TRIM = {
  darkWindow: new Color("#1b2230"),
  chimney: new Color("#6e4a3a"),
  porch: new Color("#8a8070"),
  post: new Color("#e8e2d2"),
  garageDoor: new Color("#d8d2c4"),
  drive: new Color("#6f6f7a"),
  fence: new Color("#8a7a60"),
  plywood: new Color("#8a6a3a"),
  doors: [new Color("#5a2a22"), new Color("#1d2a4a"), new Color("#2f4a3a"), new Color("#14101c"), new Color("#c8102e")],
};

function placeHouseParts(houses: House[]) {
  const body: Placement[] = [];
  const roof: Placement[] = [];
  const lit: Placement[] = [];
  const trim: Placement[] = [];
  const yard: Placement[] = [];
  for (const h of houses) {
    const s = h.s;
    body.push(local(h, 0, h.h / 2 - 0.1, 0, 0, s, h.h, s, h.color));
    roof.push(local(h, 0, h.h - 0.1 + 1.4 * s, 0, Math.PI / 4, s, s, s, h.roof));
    yard.push(local(h, 0, 0.01, -(YARD_DEPTH / 2 - FRONT_SETBACK), 0, 1, 1, 1));
    WINDOW_SLOTS.forEach(([lx, ly, lz, ry], k) => {
      if (h.litMask & (1 << k)) lit.push(local(h, lx * s, ly, lz * s, ry, s, 1, 1));
      else if (h.detail) trim.push(local(h, lx * s, ly, lz * s, ry, 1.5 * s, 1.1, 0.15, h.boarded ? TRIM.plywood : TRIM.darkWindow));
    });
    if (!h.detail) continue;
    trim.push(local(h, 0, 1.05, 3.52 * s, 0, 1.0, 2.1, 0.14, TRIM.doors[Math.abs(Math.floor(h.x * 7 + h.z * 3)) % TRIM.doors.length]));
    if (h.chimney) trim.push(local(h, 1.8 * s, h.h - 0.1 + 1.34 * s + 0.6, 0, 0, 0.6, 2.0, 0.6, TRIM.chimney));
    if (h.porch) {
      trim.push(local(h, 0, 0.15, 4.3 * s, 0, 3.2 * s, 0.3, 1.6, TRIM.porch));
      trim.push(local(h, 0, 2.55, 4.3 * s, 0, 3.6 * s, 0.14, 1.9, TRIM.porch));
      trim.push(local(h, -1.5 * s, 1.4, 5.0 * s, 0, 0.16, 2.3, 0.16, TRIM.post));
      trim.push(local(h, 1.5 * s, 1.4, 5.0 * s, 0, 0.16, 2.3, 0.16, TRIM.post));
    }
    if (h.garage) {
      const gx = 3 * s + 1.9;
      body.push(local(h, gx, 1.3, 0.8 * s, 0, 3.6 / 6, 2.6, 4.2 / 7, h.color));
      trim.push(local(h, gx, 1.05, 0.8 * s + 2.12, 0, 3.0, 2.1, 0.1, TRIM.garageDoor));
      trim.push(local(h, gx, 0.02, 0.8 * s + 2.1 + 2.3, 0, 3.0, 0.05, 4.6, TRIM.drive));
    }
    if (h.fence) trim.push(local(h, 0, 0.4, -5.8 * s, 0, 10, 0.8, 0.08, TRIM.fence));
  }
  return { body, roof, lit, trim, yard };
}

const FRONT_SETBACK = 7.5;
const YARD_DEPTH = 20.5;
const YARD_GEOMETRY = new PlaneGeometry(LOT, YARD_DEPTH).rotateX(-Math.PI / 2);
const HIDE_CHECK_FRAMES = 8;

function HideAbove({ y, children }: { y: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const frame = useRef(0);
  useFrame(({ camera }) => {
    frame.current += 1;
    if (frame.current % HIDE_CHECK_FRAMES !== 0 || !ref.current) return;
    ref.current.visible = camera.position.y < y;
  });
  return (
    <group ref={ref} userData={{ gate: true }}>
      {children}
    </group>
  );
}

function Parts({ items, children, geometry, castShadow = false }: { items: Placement[]; children?: React.ReactNode; geometry?: BufferGeometry; castShadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => fillPlacements(ref.current, items), [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow={castShadow}>
      {children}
    </instancedMesh>
  );
}

interface SuburbTextures {
  shingles: Texture;
  lawn: Texture;
  concrete: Texture;
}

function useSuburbTextures(): SuburbTextures {
  const textures = useMemo(() => {
    const shingles = makeShingleTexture();
    shingles.repeat.set(3, 2);
    const lawn = makeLawnTexture();
    lawn.repeat.set(2, 4.5);
    const concrete = makeConcreteTexture();
    concrete.repeat.set(LOT_PAD / 4, LOT_PAD / 4);
    return { shingles, lawn, concrete };
  }, []);
  useEffect(() => () => {
    textures.shingles.dispose();
    textures.lawn.dispose();
    textures.concrete.dispose();
  }, [textures]);
  return textures;
}

function Houses({ houses, pads, textures }: { houses: House[]; pads: { x: number; z: number }[]; textures: SuburbTextures }) {
  const dn = useDayNight();
  const padMesh = useRef<InstancedMesh>(null);
  const winMat = useRef<MeshStandardMaterial>(null);
  const parts = useMemo(() => placeHouseParts(houses), [houses]);
  const { shingles, lawn, concrete } = textures;
  useEffect(() => {
    fillInstances(padMesh.current, pads.length, (i, d) => {
      d.position.set(pads[i].x, 0, pads[i].z);
    });
  }, [pads]);
  useEffect(() => {
    if (winMat.current) winMat.current.emissiveIntensity = 0.1 + dn.night * 2.2;
  }, [dn]);
  return (
    <group name="houses">
      <instancedMesh ref={padMesh} args={[undefined, undefined, pads.length]} receiveShadow>
        <boxGeometry args={[LOT_PAD, GROUND * 2, LOT_PAD]} />
        <meshStandardMaterial color="#63615c" map={concrete} roughness={1} />
      </instancedMesh>
      <Parts items={parts.yard} geometry={YARD_GEOMETRY}>
        <meshStandardMaterial color="#ffffff" map={lawn} roughness={1} />
      </Parts>
      <Parts items={parts.body}>
        <boxGeometry args={[6, 1, 7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </Parts>
      <Parts items={parts.roof}>
        <coneGeometry args={[4.9, 2.8, 4]} />
        <meshStandardMaterial color="#ffffff" map={shingles} roughness={0.95} flatShading />
      </Parts>
      <Parts items={parts.lit}>
        <boxGeometry args={[1.5, 1.1, 0.15]} />
        <meshStandardMaterial ref={winMat} color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={2} toneMapped={false} />
      </Parts>
      <HideAbove y={170}>
        <Parts items={parts.trim}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.85} />
        </Parts>
      </HideAbove>
    </group>
  );
}

function SuburbLights({ pads }: { pads: { x: number; z: number }[] }) {
  const dn = useDayNight();
  const poles = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const headMat = useRef<MeshStandardMaterial>(null);
  const spots = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    const e = LOT_PAD / 2 - 0.7;
    for (const p of pads) {
      if (Math.hypot(p.x, p.z - CITY_HALF_Z) > LIGHT_REACH) continue;
      out.push({ x: p.x - e, z: p.z - e });
      out.push({ x: p.x + e, z: p.z + e });
    }
    return out;
  }, [pads]);
  useEffect(() => {
    fillInstances(poles.current, spots.length, (i, d) => d.position.set(spots[i].x, GROUND + 3.2, spots[i].z));
    fillInstances(heads.current, spots.length, (i, d) => d.position.set(spots[i].x, GROUND + 6.3, spots[i].z));
  }, [spots]);
  useEffect(() => {
    if (headMat.current) headMat.current.emissiveIntensity = 0.1 + dn.night * 1.6;
  }, [dn]);
  return (
    <group name="suburb-lights">
      <instancedMesh ref={poles} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.1, 0.14, 6.4, 4, 1, true]} />
        <meshStandardMaterial color="#4d4f4f" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, spots.length]}>
        <sphereGeometry args={[0.34, 5, 3]} />
        <meshStandardMaterial ref={headMat} color="#ffd27a" emissive="#ffc96a" emissiveIntensity={1.5} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

interface ParkingSlot {
  x: number;
  z: number;
  rot: number;
}

function buildRingParking(pads: { x: number; z: number }[]): { slots: ParkingSlot[]; items: FleetItem[] } {
  const rand = mulberry32(8080);
  const kinds: VehicleKind[] = ["sedan", "sedan", "suv", "pickup", "van", "taxi"];
  const slots: ParkingSlot[] = [];
  const items: FleetItem[] = [];
  for (const p of pads) {
    if (!nearDowntown(p.x, p.z) || rand() < 0.8) continue;
    const side = rand() < 0.5 ? -1 : 1;
    slots.push({ x: p.x + side * (LOT_PAD / 2 + 1.7), z: p.z + range(rand, -LOT_PAD / 2 + 4, LOT_PAD / 2 - 4), rot: side < 0 ? 0 : Math.PI });
    items.push({ kind: pick(rand, kinds), color: new Color(pick(rand, FLEET_COLORS)) });
  }
  return { slots, items };
}

function RingParking({ pads }: { pads: { x: number; z: number }[] }) {
  const [world] = useState(() => buildRingParking(pads));
  const slots = world.slots;
  const pose = useCallback<PoseFn>(
    (i, out) => {
      const sl = slots[i];
      out.x = sl.x;
      out.y = 0;
      out.z = sl.z;
      out.yaw = sl.rot;
      out.spin = 0;
    },
    [slots],
  );
  if (slots.length === 0) return null;
  return (
    <group name="ring-parking">
      <VehicleFleet items={world.items} pose={pose} pools={false} />
    </group>
  );
}

function MidRise({ lots }: { lots: MidLot[] }) {
  const mat = useWindowMaterial({ winSize: [2, 2.4], glow: 0.08 });
  const lotGeometry = useBaseBoxGeometry();
  const ref = useRef<InstancedMesh>(null);
  const seeds = useMemo(() => new Float32Array(lots.map((l) => l.seed)), [lots]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    fillInstances(m, lots.length, (i, d) => {
      const l = lots[i];
      d.position.set(l.x, 0, l.z);
      d.scale.set(l.w, l.h, l.d);
    });
    lots.forEach((l, i) => m.setColorAt(i, l.color));
    m.geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [lots, seeds]);
  return (
    <instancedMesh ref={ref} args={[lotGeometry, mat, lots.length]} />
  );
}

function SuburbTrees({ trees }: { trees: TreePlace[] }) {
  const specs = useMemo(
    () =>
      plantTrees(
        mulberry32(trees.length * 31 + Math.round(trees[0].x)),
        trees.map((t) => ({ ...t, s: t.s * 1.3 })),
        { shade: 0.55, spruce: 0.3, bare: 0.15 },
      ),
    [trees],
  );
  return <TreeStand trees={specs} quality="far" seed={23} groundY={GROUND} />;
}

function SuburbStreets() {
  const ref = useRef<InstancedMesh>(null);
  const road = useMemo(() => {
    const t = makeRoadTexture();
    t.repeat.set(1, STREET / 14);
    return t;
  }, []);
  useEffect(() => () => road.dispose(), [road]);
  const items = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    const northEnd = CITY_HALF_Z - 8;
    const southStart = RIVER_FAR + 14;
    for (let v = -EXTENT; v <= EXTENT; v += STREET) {
      for (let s = -EXTENT; s < EXTENT; s += STREET) {
        const mid = s + STREET / 2;
        if (mid < northEnd || mid > southStart) out.push({ x: v, z: mid, rot: 0 });
        if (!isRiver(v)) out.push({ x: mid, z: v, rot: Math.PI / 2 });
      }
    }
    return out;
  }, []);
  useEffect(() => {
    fillInstances(ref.current, items.length, (i, d) => {
      d.position.set(items[i].x, -0.06, items[i].z);
      d.rotation.y = items[i].rot;
    });
  }, [items]);
  return (
    <instancedMesh ref={ref} name="suburb-streets" args={[undefined, undefined, items.length]} receiveShadow>
      <boxGeometry args={[7, 0.1, STREET]} />
      <meshStandardMaterial color="#8a8a94" map={road} roughness={1} />
    </instancedMesh>
  );
}


interface FreewayCar {
  lane: number;
  z: number;
  speed: number;
  spin: number;
}
interface FreewayFleet {
  cars: FreewayCar[];
  items: FleetItem[];
  last: number;
}

function buildFreewayFleet(): FreewayFleet {
  const rand = mulberry32(75);
  const kinds: VehicleKind[] = ["sedan", "sedan", "sedan", "suv", "suv", "pickup", "van", "bus", "police"];
  const cars: FreewayCar[] = [];
  const items: FleetItem[] = [];
  for (let i = 0; i < 90; i++) {
    const kind = pick(rand, kinds);
    cars.push({ lane: pick(rand, [-5.2, -2.6, 2.6, 5.2]), z: range(rand, FREEWAY_Z0, FREEWAY_Z1), speed: kind === "bus" ? range(rand, 15, 19) : range(rand, 18, 28), spin: rand() * 6 });
    items.push({
      kind,
      color: new Color(kind === "police" ? "#f4f1ea" : pick(rand, FLEET_COLORS)),
    });
  }
  return { cars, items, last: -1 };
}

function poseFreewayCar(f: FreewayFleet, i: number, out: VehiclePose, time: number) {
  if (i === 0) {
    const dt = fleetStep(f, time);
    for (const c of f.cars) {
      const dir = c.lane < 0 ? 1 : -1;
      c.z += c.speed * dt * dir;
      c.spin += (c.speed * dt) / 0.4;
      if (c.z > FREEWAY_Z1) c.z = FREEWAY_Z0;
      if (c.z < FREEWAY_Z0) c.z = FREEWAY_Z1;
    }
  }
  const c = f.cars[i];
  out.x = FREEWAY_X + c.lane;
  out.y = FREEWAY_Y + 0.5;
  out.z = c.z;
  out.yaw = c.lane < 0 ? 0 : Math.PI;
  out.spin = c.spin;
}

function Freeway() {
  const dn = useDayNight();
  const pylons = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const lampMat = useRef<MeshStandardMaterial>(null);
  const [fleet] = useState(() => buildFreewayFleet());
  const pose = useCallback<PoseFn>((i, out, time) => poseFreewayCar(fleet, i, out, time), [fleet]);
  const pylonCount = Math.floor((FREEWAY_Z1 - FREEWAY_Z0) / 40);
  useEffect(() => {
    fillInstances(pylons.current, pylonCount, (i, d) => d.position.set(FREEWAY_X, FREEWAY_Y / 2 - 0.5, FREEWAY_Z0 + i * 40));
    fillInstances(lamps.current, pylonCount, (i, d) => d.position.set(FREEWAY_X + (i % 2 ? 7.5 : -7.5), FREEWAY_Y + 6, FREEWAY_Z0 + i * 40 + 20));
  }, [pylonCount]);
  useEffect(() => {
    if (lampMat.current) lampMat.current.emissiveIntensity = 0.2 + dn.night * 1.3;
  }, [dn]);
  const len = FREEWAY_Z1 - FREEWAY_Z0;
  const mid = (FREEWAY_Z0 + FREEWAY_Z1) / 2;
  return (
    <group>
      <mesh position={[FREEWAY_X, FREEWAY_Y, mid]} receiveShadow>
        <boxGeometry args={[16, 1, len]} />
        <meshStandardMaterial color="#3a3a46" roughness={1} />
      </mesh>
      <mesh position={[FREEWAY_X, FREEWAY_Y + 0.52, mid]}>
        <boxGeometry args={[0.4, 0.06, len]} />
        <meshStandardMaterial color="#e6d98a" />
      </mesh>
      {[-8.2, 8.2].map((ox) => (
        <mesh key={ox} position={[FREEWAY_X + ox, FREEWAY_Y + 1, mid]}>
          <boxGeometry args={[0.4, 1, len]} />
          <meshStandardMaterial color="#8a8a98" roughness={0.6} />
        </mesh>
      ))}
      <instancedMesh ref={pylons} args={[undefined, undefined, pylonCount]}>
        <boxGeometry args={[3, FREEWAY_Y, 2]} />
        <meshStandardMaterial color="#4c4b48" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, pylonCount]}>
        <sphereGeometry args={[0.4, 8, 6]} />
        <meshStandardMaterial ref={lampMat} color="#ffd27a" emissive="#ffc96a" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
      <VehicleFleet items={fleet.items} pose={pose} dynamic />
    </group>
  );
}

function WindsorShore() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.3, RIVER_FAR + 2406]}>
      <planeGeometry args={[9000, 4800]} />
      <meshStandardMaterial color="#3e424c" roughness={1} />
    </mesh>
  );
}

const RIPRAP_STEP = 4.8;

function Riprap() {
  const ref = useRef<InstancedMesh>(null);
  const stones = useMemo(() => {
    const rand = mulberry32(606);
    const out: { x: number; y: number; z: number; s: number; ry: number }[] = [];
    for (let x = -EXTENT; x < EXTENT; x += RIPRAP_STEP) {
      if (Math.abs(x) < RIVERWALK_HALF) {
        out.push({ x: x + (rand() - 0.5) * 2, y: -0.4 + rand() * 0.3, z: RIVER_FAR - 0.5 - rand() * 2.2, s: range(rand, 0.6, 1.3), ry: rand() * 6.28 });
        continue;
      }
      out.push({ x: x + (rand() - 0.5) * 2, y: -0.4 + rand() * 0.3, z: RIVER_NEAR + 0.5 + rand() * 2.2, s: range(rand, 0.6, 1.3), ry: rand() * 6.28 });
      out.push({ x: x + (rand() - 0.5) * 2, y: -0.4 + rand() * 0.3, z: RIVER_FAR - 0.5 - rand() * 2.2, s: range(rand, 0.6, 1.3), ry: rand() * 6.28 });
    }
    return out;
  }, []);
  useEffect(() => {
    fillInstances(ref.current, stones.length, (i, d) => {
      const st = stones[i];
      d.position.set(st.x, st.y, st.z);
      d.rotation.set(st.ry * 0.3, st.ry, 0);
      d.scale.setScalar(st.s);
    });
  }, [stones]);
  return (
    <instancedMesh ref={ref} name="riprap" args={[undefined, undefined, stones.length]}>
      <dodecahedronGeometry args={[0.9, 0]} />
      <meshStandardMaterial color="#6d6a66" roughness={1} flatShading />
    </instancedMesh>
  );
}

function Riverbank() {
  return (
    <group>
      <mesh position={[0, 0.3, RIVER_FAR + 2]}>
        <boxGeometry args={[7000, 1.2, 4]} />
        <meshStandardMaterial color="#3a3833" roughness={1} />
      </mesh>
      <mesh position={[0, 0.3, RIVER_NEAR - 2]}>
        <boxGeometry args={[7000, 1.2, 4]} />
        <meshStandardMaterial color="#3a3833" roughness={1} />
      </mesh>
      <HideAbove y={230}>
        <Riprap />
      </HideAbove>
    </group>
  );
}

const TILES_PER_SIDE = 3;

interface Tile {
  houses: House[];
  pads: { x: number; z: number }[];
  trees: TreePlace[];
  banks: Bank[];
}

function tileIndex(x: number, z: number) {
  const size = (EXTENT * 2) / TILES_PER_SIDE;
  const clamp = (v: number) => Math.min(TILES_PER_SIDE - 1, Math.max(0, Math.floor((v + EXTENT) / size)));
  return clamp(x) * TILES_PER_SIDE + clamp(z);
}

function tileWorld(world: ReturnType<typeof buildHouses>): Tile[] {
  const tiles: Tile[] = Array.from({ length: TILES_PER_SIDE * TILES_PER_SIDE }, () => ({ houses: [], pads: [], trees: [], banks: [] }));
  for (const h of world.houses) tiles[tileIndex(h.x, h.z)].houses.push(h);
  for (const p of world.pads) tiles[tileIndex(p.x, p.z)].pads.push(p);
  for (const t of world.trees) tiles[tileIndex(t.x, t.z)].trees.push(t);
  for (const b of world.banks) tiles[tileIndex(b.x, b.z)].banks.push(b);
  return tiles;
}

function StoreSigns({ spot }: { spot: SignSpot }) {
  const dn = useDayNight();
  const mat = useRef<MeshStandardMaterial>(null);
  const tex = useMemo(() => labelTexture(spot.text, { width: 512, height: 112, bg: "#1d1d3f", fg: "#ffb02e", border: "#ffb02e", size: 60 }), [spot.text]);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.1 + dn.night * 1.1;
  }, [dn]);
  return (
    <Parts items={spot.placements}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.1} side={DoubleSide} />
    </Parts>
  );
}

function BlockFeatures({ features, textures }: { features: Features; textures: SuburbTextures }) {
  return (
    <group name="block-features">
      <Parts items={features.lawns} geometry={FLAT_PLANE}>
        <meshStandardMaterial color="#ffffff" map={textures.lawn} roughness={1} />
      </Parts>
      <Parts items={features.weeds} geometry={FLAT_PLANE}>
        <meshStandardMaterial color="#ffffff" map={textures.lawn} roughness={1} />
      </Parts>
      <Parts items={features.lots} geometry={FLAT_PLANE}>
        <meshStandardMaterial color="#3a3a44" roughness={1} />
      </Parts>
      <Parts items={features.fields} geometry={FIELD_DISC}>
        <meshStandardMaterial color="#8a6a46" roughness={1} />
      </Parts>
      <Parts items={features.boxes} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </Parts>
      <Parts items={features.roofs} geometry={FEATURE_ROOF}>
        <meshStandardMaterial color="#ffffff" map={textures.shingles} roughness={0.95} flatShading />
      </Parts>
      <Parts items={features.towers} geometry={WATER_TOWER}>
        <meshStandardMaterial color="#9a9aa8" roughness={0.6} metalness={0.4} />
      </Parts>
      {features.signs.map((spot) => (
        <StoreSigns key={spot.text} spot={spot} />
      ))}
    </group>
  );
}

export default function Suburbs() {
  const world = useMemo(() => buildHouses(), []);
  const tiles = useMemo(() => tileWorld(world), [world]);
  const textures = useSuburbTextures();
  return (
    <group>
      <BlockFeatures features={world.features} textures={textures} />
      <WindsorShore />
      <Riverbank />
      <SuburbStreets />
      {tiles.map((t, i) => (
        <Fragment key={i}>
          {t.banks.length > 0 && <Banks banks={t.banks} />}
          {t.pads.length > 0 && <Houses houses={t.houses} pads={t.pads} textures={textures} />}
          {t.trees.length > 0 && <SuburbTrees trees={t.trees} />}
        </Fragment>
      ))}
      <HideAbove y={190}>
        <SuburbLights pads={world.pads} />
        <RingParking pads={world.pads} />
      </HideAbove>
      <MidRise lots={world.midrise} />
      <Freeway />
    </group>
  );
}
