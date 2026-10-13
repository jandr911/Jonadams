"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
} from "three";
import { useDayNight } from "./DayNightContext";
import {
  AMBASSADOR_CLEAR_HALF,
  AMBASSADOR_RAMP_Z,
  AMBASSADOR_X,
  BLOCK,
  COLS,
  DESTINATIONS,
  OUTER_ROWS,
  PAD,
  ROWS,
  allBlocks,
  blockCenter,
} from "./layout";
import { mulberry32, pick, range } from "./rng";
import { ghostAdTexture, labelTexture } from "./labels";
import { useWindowMaterial } from "./useWindowMaterial";
import { makeShadowBlobTexture } from "./textures";
import { fillColors, fillInstances, fillPlacements, mergeParts, useBaseBoxGeometry, type Placement } from "./instancing";
import { enableReflection } from "./layers";
import type { BufferGeometry, Group } from "three";

export const RESERVED_BLOCKS = new Set<string>([
  ...DESTINATIONS.map((d) => `${d.block[0]},${d.block[1]}`),
  "6,5",
  "2,5",
  "3,5",
  "4,5",
  "7,5",
  "8,5",
  "4,4",
  "3,4",
  "3,3",
  "2,3",
  "2,2",
  "4,2",
  "5,2",
  "6,4",
  "5,1",
  "6,1",
  "3,0",
  "3,-6",
]);

type Style = "deco" | "beaux" | "chicago" | "mid";

const STYLE_CODE: Record<Style, number> = { deco: 1, beaux: 2, chicago: 3, mid: 4 };

const GUARDIAN_BRICK = ["#c0603a", "#b0573a"];
const RED_BRICK = ["#8a4a3a", "#7a4034", "#9a5a44"];
const BUFF_BRICK = ["#c9b48c", "#bfa57c", "#b89a7a"];
const SMOKED_BRICK = ["#5e4a3e", "#4e4038", "#6a5446"];
const LIMESTONE = ["#d4c8ad", "#c7b998", "#bdb096"];
const ENAMEL_PANEL = ["#b9b5a8", "#8f9a94", "#a8a294"];
const COPPER_CROWN = ["#5f8f7a", "#6f9c86", "#557f6c"];

const STYLE_MATERIALS: Record<Style, string[]> = {
  deco: [...BUFF_BRICK, ...LIMESTONE, ...GUARDIAN_BRICK, ...SMOKED_BRICK],
  beaux: [...LIMESTONE, ...BUFF_BRICK],
  chicago: [...RED_BRICK, ...GUARDIAN_BRICK, ...SMOKED_BRICK, ...BUFF_BRICK],
  mid: ENAMEL_PANEL,
};

const MID_CENTURY_SHARE = 0.06;
const BLANK_WALL_SHARE = 0.12;
const GHOST_AD_SHARE = 0.7;
const NEIGHBOUR_GAP = 8;
const MIN_AD_HEIGHT = 3;
const AD_ASPECT = 0.62;
const LIT_CROWNS = 5;
const CROWN_RISE = 0.6;
const CROWN_MAX_HEIGHT = 6;
const CROWN_MIN_TOP = 28;
const CROWN_INSET = 0.92;
const COPPER_SHARE = 0.55;
// Each cornice top steps this far below the roof and the cornice above it. With the camera near
// plane at 1, depth resolves about 0.03 at the 720 zoom limit, so flush tops flicker against the roof.
const CORNICE_DROP = 0.25;
const BEACON_MAST = 4;

const GHOST_ADS = [
  { lines: ["GREAT LAKES", "COAL & ICE CO.", "Cadillac 4-1200"], ground: "#e6dbc2", ink: "#5e1712" },
  { lines: ["WOODWARD", "DRY GOODS", "established 1911"], ground: "#2f4a3a", ink: "#e6dbc2" },
  { lines: ["RIVER ROUGE", "TIRE & BATTERY", "road service day or night"], ground: "#e0c46a", ink: "#1f1d1b" },
  { lines: ["CASS PAINT", "& VARNISH", "covers the city"], ground: "#8f2a22", ink: "#e6dbc2" },
  { lines: ["BELLE ISLE", "DAIRY", "fresh every morning"], ground: "#e6dbc2", ink: "#1f3a6a" },
  { lines: ["MOTOR CITY", "FURNITURE", "easy terms"], ground: "#1f1d1b", ink: "#e0c46a" },
];

function crownHeight(l: { w: number; d: number }) {
  return Math.min(Math.min(l.w, l.d) * CROWN_INSET * CROWN_RISE, CROWN_MAX_HEIGHT);
}

function crownGeometry() {
  const steps: [number, number][] = [
    [1, 0.3],
    [0.76, 0.25],
    [0.54, 0.22],
    [0.34, 0.13],
  ];
  let y = 0;
  const parts: BufferGeometry[] = steps.map(([size, rise]) => {
    const g = new BoxGeometry(size, rise, size).translate(0, y + rise / 2, 0);
    y += rise;
    return g;
  });
  parts.push(new ConeGeometry(0.2, 0.1, 4).rotateY(Math.PI / 4).translate(0, y + 0.05, 0));
  return mergeParts(parts, "crown");
}

const CROWN = crownGeometry();

function chooseStyle(h: number, rand: () => number): Style {
  const x = rand();
  if (x < MID_CENTURY_SHARE) return "mid";
  if (h > 34) return x < 0.75 ? "deco" : "beaux";
  if (h > 18) return x < 0.4 ? "chicago" : x < 0.75 ? "beaux" : "deco";
  return x < 0.78 ? "chicago" : "beaux";
}

interface Lot {
  x: number;
  z: number;
  y?: number;
  w: number;
  d: number;
  h: number;
  color: Color;
  seed: number;
  roofKind: number;
  style: Style;
  blank: number;
  ad: number;
  lit: number;
  top: boolean;
  adFrom?: number;
}

function cellsForBlock(bx: number, bz: number, rand: () => number) {
  const split = rand() < 0.5 ? 2 : rand() < 0.5 ? 1 : 3;
  const cells: { x: number; z: number; w: number; d: number }[] = [];
  if (split === 1) {
    cells.push({ x: bx, z: bz, w: BLOCK - 4, d: BLOCK - 4 });
  } else if (split === 2) {
    const vertical = rand() < 0.5;
    const a = range(rand, 0.35, 0.65);
    if (vertical) {
      cells.push({ x: bx - BLOCK / 2 + (BLOCK * a) / 2, z: bz, w: BLOCK * a - 3, d: BLOCK - 4 });
      cells.push({ x: bx + BLOCK / 2 - (BLOCK * (1 - a)) / 2, z: bz, w: BLOCK * (1 - a) - 3, d: BLOCK - 4 });
    } else {
      cells.push({ x: bx, z: bz - BLOCK / 2 + (BLOCK * a) / 2, w: BLOCK - 4, d: BLOCK * a - 3 });
      cells.push({ x: bx, z: bz + BLOCK / 2 - (BLOCK * (1 - a)) / 2, w: BLOCK - 4, d: BLOCK * (1 - a) - 3 });
    }
  } else {
    const q = BLOCK / 2;
    const offs = [
      [-q / 2, -q / 2],
      [q / 2, -q / 2],
      [-q / 2, q / 2],
      [q / 2, q / 2],
    ];
    for (const [ox, oz] of offs) {
      if (rand() < 0.15) continue;
      cells.push({ x: bx + ox, z: bz + oz, w: q - 2.6, d: q - 2.6 });
    }
  }
  return cells;
}

function pushBuilding(out: Lot[], cell: { x: number; z: number; w: number; d: number }, h: number, rand: () => number) {
  const arch = mulberry32(Math.floor(rand() * 2 ** 31));
  const style = chooseStyle(h, arch);
  const color = new Color(pick(arch, STYLE_MATERIALS[style]));
  const blank = h > 10 && cell.d > 8 && arch() < BLANK_WALL_SHARE ? (arch() < 0.5 ? 1 : 2) : 0;
  const ad = blank && arch() < GHOST_AD_SHARE ? Math.floor(arch() * GHOST_ADS.length) : -1;
  const tier = { style, color, blank: 0, ad: -1, lit: 0, top: true };
  const base: Lot = { ...cell, h, color, seed: rand() * 100, roofKind: rand() < 0.35 ? 1 : rand() < 0.2 ? 2 : 0, style, blank, ad, lit: 0, top: true };
  out.push(base);
  if (h > 16 && rand() < 0.85) {
    const k = range(rand, 0.55, 0.72);
    const second: Lot = { x: cell.x, z: cell.z, w: cell.w * k, d: cell.d * k, y: h, h: h * range(rand, 0.22, 0.4), seed: rand() * 100, roofKind: 0, ...tier };
    base.top = false;
    out.push(second);
    if (h > 40 && rand() < 0.6) {
      second.top = false;
      out.push({ x: cell.x, z: cell.z, w: cell.w * k * 0.6, d: cell.d * k * 0.6, y: h * 1.3, h: h * 0.18, seed: rand() * 100, roofKind: 2, ...tier });
    }
  }
}

function topOf(l: Lot) {
  return (l.y ?? 0) + l.h;
}

function neighbourHeight(l: Lot, face: number, lots: Lot[]) {
  const dir = face === 1 ? 1 : -1;
  const edge = l.x + (dir * l.w) / 2;
  let tallest = 0;
  for (const o of lots) {
    if (o === l || o.y) continue;
    const gap = dir * (o.x - (dir * o.w) / 2 - edge);
    if (gap < -0.5 || gap > NEIGHBOUR_GAP || Math.abs(o.z - l.z) > (o.d + l.d) / 2) continue;
    tallest = Math.max(tallest, o.h);
  }
  return tallest;
}

function adSpan(l: Lot) {
  const bottom = Math.max((l.adFrom ?? 0) + 0.8, l.h * 0.3);
  const height = Math.min(l.h - bottom - 1.5, l.d * 0.78 * AD_ASPECT);
  return { bottom, height };
}

function exposeSideWalls(lots: Lot[]) {
  for (const l of lots) {
    if (!l.blank) continue;
    const near = neighbourHeight(l, l.blank, lots);
    const far = neighbourHeight(l, 3 - l.blank, lots);
    if (far < near) l.blank = 3 - l.blank;
    l.adFrom = Math.min(near, far);
    if (l.ad >= 0 && adSpan(l).height < MIN_AD_HEIGHT) l.ad = -1;
  }
}

function underAmbassador(x: number, z: number, w: number, d: number) {
  return Math.abs(x - AMBASSADOR_X) < w / 2 + AMBASSADOR_CLEAR_HALF && z + d / 2 > AMBASSADOR_RAMP_Z[0] - 2 && z - d / 2 < AMBASSADOR_RAMP_Z[1] + 2;
}

function buildLots(): { city: Lot[] } {
  const rand = mulberry32(2024);
  const city: Lot[] = [];
  // Reserved blocks and lots under the bridge still draw from rand so every other lot keeps its seed.
  const cleared: Lot[] = [];
  for (const { c, r, outer } of allBlocks()) {
    const reserved = RESERVED_BLOCKS.has(`${c},${r}`);
    const [bx, bz] = blockCenter(c, r);
    const cells = cellsForBlock(bx, bz, rand);
    if (!outer) {
      const centerDist = Math.hypot((c - (COLS - 1) / 2) / COLS, (r - 2.4) / ROWS);
      const core = 1 - Math.min(1, centerDist * 2.1);
      const frontRow = r === ROWS - 1;
      for (const cell of cells) {
        const base = frontRow ? range(rand, 6, 14) : range(rand, 8, 18);
        const tall = frontRow ? 0 : core * range(rand, 12, 36);
        pushBuilding(reserved ? cleared : city, cell, base + tall, rand);
      }
    } else {
      const ring = Math.max(r < 0 ? -r : 0, c < 0 ? -c : 0, c >= COLS ? c - COLS + 1 : 0);
      const falloff = 1 - Math.min(1, ring / (OUTER_ROWS + 1)) * 0.55;
      for (const cell of cells) {
        if (rand() < 0.08) continue;
        const h = range(rand, 5, 12) + range(rand, 0, 22) * falloff * (rand() < 0.3 ? 1.6 : 1);
        pushBuilding(reserved || underAmbassador(cell.x, cell.z, cell.w, cell.d) ? cleared : city, cell, h, rand);
      }
    }
  }

  exposeSideWalls(city);
  const litCrowns = city
    .filter(hasCrown)
    .sort((a, b) => topOf(b) - topOf(a))
    .slice(0, LIT_CROWNS);
  for (const l of litCrowns) l.lit = 1;
  return { city };
}

function InstancedLots({ lots }: { lots: Lot[] }) {
  const mat = useWindowMaterial({ glow: 0.1, architecture: true });
  const lotGeometry = useBaseBoxGeometry();
  const ref = useRef<InstancedMesh>(null);
  const seeds = useMemo(() => new Float32Array(lots.map((l) => l.seed)), [lots]);
  const arch = useMemo(() => new Float32Array(lots.flatMap((l) => [STYLE_CODE[l.style], l.blank, l.lit])), [lots]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    fillInstances(m, lots.length, (i, d) => {
      const l = lots[i];
      d.position.set(l.x, PAD + (l.y ?? 0), l.z);
      d.scale.set(l.w, l.h, l.d);
    });
    fillColors(m, lots.length, (i) => lots[i].color);
    m.geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    m.geometry.setAttribute("aArch", new InstancedBufferAttribute(arch, 3));
  }, [lots, seeds, arch]);
  return (
    <instancedMesh ref={ref} args={[lotGeometry, mat, lots.length]} castShadow receiveShadow />
  );
}

const SHOP_SIGNS = [
  { text: "CONEY ISLAND", bg: "#c8102e", fg: "#f4f1ea" },
  { text: "PARTY STORE · LOTTO", bg: "#1d2a6a", fg: "#ffb02e" },
  { text: "BARBER", bg: "#14101c", fg: "#f4f1ea", border: "#c8102e" },
  { text: "RECORDS · TAPES", bg: "#2f8a5a", fg: "#f4f1ea" },
  { text: "CASS CORRIDOR CAFE", bg: "#f4f1ea", fg: "#1d1d3f" },
  { text: "TAILOR & CLEANERS", bg: "#8a2f63", fg: "#f4f1ea" },
  { text: "313 PIZZA", bg: "#ffb02e", fg: "#1d1d3f" },
  { text: "GALLERY", bg: "#14101c", fg: "#d6b56e", border: "#d6b56e" },
  { text: "COFFEE · DONUTS", bg: "#5a4636", fg: "#f4f1ea" },
  { text: "VINTAGE", bg: "#1d1d3f", fg: "#d6b56e" },
];

interface SignSpot {
  x: number;
  z: number;
  rot: number;
  w: number;
}

function ShopSigns({ spots, sign }: { spots: SignSpot[]; sign: (typeof SHOP_SIGNS)[number] }) {
  const dn = useDayNight();
  const ref = useRef<InstancedMesh>(null);
  const tubes = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const tubeMat = useRef<MeshStandardMaterial>(null);
  const tex = useMemo(() => labelTexture(sign.text, { width: 512, height: 112, bg: sign.bg, fg: sign.fg, border: sign.border, size: 64, weathered: true }), [sign]);
  useEffect(() => {
    fillInstances(ref.current, spots.length, (i, d) => {
      const it = spots[i];
      d.position.set(it.x, PAD + 3.8, it.z);
      d.rotation.set(0, it.rot, 0);
      d.scale.set(it.w, it.w * 0.22, 1);
    });
    fillInstances(tubes.current, spots.length, (i, d) => {
      const it = spots[i];
      d.position.set(it.x + Math.sin(it.rot) * 0.1, PAD + 3.8 - it.w * 0.11 - 0.12, it.z + Math.cos(it.rot) * 0.1);
      d.rotation.set(0, it.rot, 0);
      d.scale.set(it.w * 0.92, 0.07, 0.07);
    });
  }, [spots]);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.1 + dn.night * 0.9;
    if (tubeMat.current) tubeMat.current.emissiveIntensity = 0.1 + dn.night * 1.8;
  }, [dn]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.1} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={tubes} args={[undefined, undefined, spots.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={tubeMat} color="#fff1d0" emissive="#ffd9a8" emissiveIntensity={0.1} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function StreetLevel({ lots }: { lots: Lot[] }) {
  const awnings = useRef<InstancedMesh>(null);
  const items = useMemo(() => {
    const rand = mulberry32(777);
    const awn: { x: number; z: number; rot: number; color: Color; w: number }[] = [];
    const signs: SignSpot[][] = SHOP_SIGNS.map(() => []);
    const palette = ["#c8102e", "#1d2a6a", "#2f8a5a", "#f4f1ea", "#d6b56e", "#8a2f63"];
    lots.forEach((l) => {
      if (l.y || l.h < 6) return;
      const sides: [number, number, number][] = [
        [l.x, l.z + l.d / 2, 0],
        [l.x, l.z - l.d / 2, Math.PI],
        [l.x + l.w / 2, l.z, Math.PI / 2],
        [l.x - l.w / 2, l.z, -Math.PI / 2],
      ];
      sides.forEach(([sx, sz, rot], side) => {
        const blankSide = l.blank > 0 && side === l.blank + 1;
        const len = rot === 0 || rot === Math.PI ? l.w : l.d;
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5 + (rand() - 0.5) * 0.5) / n - 0.5;
          const ox = Math.cos(rot) * t * len * 0.8;
          const oz = -Math.sin(rot) * t * len * 0.8;
          const nx = Math.sin(rot);
          const nz = Math.cos(rot);
          const w = range(rand, 2.2, 3.6);
          if (rand() < 0.5 && !blankSide) awn.push({ x: sx + ox + nx * 0.9, z: sz + oz + nz * 0.9, rot, color: new Color(pick(rand, palette)), w });
          const signIndex = rand() < 0.6 ? Math.floor(rand() * SHOP_SIGNS.length) : -1;
          if (signIndex >= 0 && !blankSide) signs[signIndex].push({ x: sx + ox + nx * 0.08, z: sz + oz + nz * 0.08, rot, w: Math.min(3.4, len * 0.6 / n) });
        }
      });
    });
    return { awn, signs };
  }, [lots]);
  useEffect(() => {
    const a = awnings.current;
    if (!a) return;
    fillInstances(a, items.awn.length, (i, d) => {
      const it = items.awn[i];
      d.position.set(it.x, PAD + 3.1, it.z);
      d.rotation.set(0.35, it.rot, 0);
      d.scale.set(it.w, 1, 1);
    });
    fillColors(a, items.awn.length, (i) => items.awn[i].color);
  }, [items]);
  return (
    <group name="street-level">
      <instancedMesh ref={awnings} args={[undefined, undefined, items.awn.length]}>
        <boxGeometry args={[1, 0.12, 1.4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
      {SHOP_SIGNS.map((sign, i) => items.signs[i].length > 0 && <ShopSigns key={sign.text} spots={items.signs[i]} sign={sign} />)}
    </group>
  );
}

function ContactShadows({ lots }: { lots: Lot[] }) {
  const ref = useRef<InstancedMesh>(null);
  const texture = useMemo(() => makeShadowBlobTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const bases = useMemo(() => lots.filter((l) => !l.y), [lots]);
  useEffect(() => {
    fillInstances(ref.current, bases.length, (i, d) => {
      const l = bases[i];
      d.position.set(l.x, 0.46, l.z);
      d.rotation.set(-Math.PI / 2, 0, 0);
      d.scale.set(l.w + 7, l.d + 7, 1);
    });
  }, [bases]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bases.length]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </instancedMesh>
  );
}

function RoofDetails({ lots }: { lots: Lot[] }) {
  const dn = useDayNight();
  const tanks = useRef<InstancedMesh>(null);
  const masts = useRef<InstancedMesh>(null);
  const beaconMat = useRef<MeshStandardMaterial>(null);
  const tankLots = useMemo(() => lots.filter((l) => l.roofKind === 1 && !hasCrown(l)), [lots]);
  const bulkheads = useRef<InstancedMesh>(null);
  const units = useRef<InstancedMesh>(null);
  const bulkLots = useMemo(() => lots.filter((l) => !l.y && l.h > 8 && l.seed % 1 < 0.75 && !hasCrown(l)), [lots]);
  const unitLots = useMemo(() => {
    const rand = mulberry32(55);
    const out: { x: number; y: number; z: number; s: number }[] = [];
    lots.forEach((l) => {
      if (l.y) return;
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const unit = { x: l.x + (rand() - 0.5) * l.w * 0.6, y: PAD + l.h + 0.5, z: l.z + (rand() - 0.5) * l.d * 0.6, s: range(rand, 0.8, 1.6) };
        if (!hasCrown(l)) out.push(unit);
      }
    });
    return out;
  }, [lots]);
  const beaconLot = useMemo(() => lots.reduce((best, l) => (topOf(l) > topOf(best) ? l : best), lots[0]), [lots]);
  const mastLots = useMemo(() => lots.filter((l) => (l.roofKind === 2 || (l.h > 44 && !l.y)) && l !== beaconLot && !hasCrown(l)), [lots, beaconLot]);
  const parapets = useRef<InstancedMesh>(null);
  const vents = useRef<InstancedMesh>(null);
  const skylights = useRef<InstancedMesh>(null);
  const skylightMat = useRef<MeshStandardMaterial>(null);
  const dishes = useRef<InstancedMesh>(null);
  const greenery = useRef<InstancedMesh>(null);
  const extras = useMemo(() => {
    const rand = mulberry32(5150);
    const parapet: Placement[] = [];
    const vent: Placement[] = [];
    const skylight: Placement[] = [];
    const dish: Placement[] = [];
    const green: Placement[] = [];
    lots.forEach((l) => {
      const top = PAD + (l.y ?? 0) + l.h;
      parapet.push({ x: l.x, y: top + (0.6 - CORNICE_DROP) / 2, z: l.z + l.d / 2, sx: l.w + 0.5, sy: 0.6 + CORNICE_DROP, sz: 0.4, ry: 0 });
      parapet.push({ x: l.x, y: top + (0.6 - CORNICE_DROP) / 2, z: l.z - l.d / 2, sx: l.w + 0.5, sy: 0.6 + CORNICE_DROP, sz: 0.4, ry: 0 });
      parapet.push({ x: l.x + l.w / 2, y: top + (0.6 - CORNICE_DROP) / 2, z: l.z, sx: 0.4, sy: 0.6 + CORNICE_DROP, sz: l.d + 0.5, ry: 0 });
      parapet.push({ x: l.x - l.w / 2, y: top + (0.6 - CORNICE_DROP) / 2, z: l.z, sx: 0.4, sy: 0.6 + CORNICE_DROP, sz: l.d + 0.5, ry: 0 });
      const roof = (list: Placement[]) => (hasCrown(l) ? [] : list);
      const n = Math.floor(rand() * 4);
      for (let k = 0; k < n; k++) {
        roof(vent).push({ x: l.x + (rand() - 0.5) * l.w * 0.7, y: top + 0.45, z: l.z + (rand() - 0.5) * l.d * 0.7, sx: 1, sy: range(rand, 0.6, 1.3), sz: 1, ry: 0 });
      }
      if (l.w > 9 && l.d > 9 && rand() < 0.4) {
        roof(skylight).push({ x: l.x + (rand() - 0.5) * l.w * 0.3, y: top + 0.3, z: l.z + (rand() - 0.5) * l.d * 0.3, sx: range(rand, 1.8, 3.2), sy: 0.5, sz: range(rand, 1.2, 2.2), ry: rand() < 0.5 ? 0 : Math.PI / 2 });
      }
      if (rand() < 0.35) {
        roof(dish).push({ x: l.x + (rand() - 0.5) * l.w * 0.8, y: top + 0.9, z: l.z + (rand() - 0.5) * l.d * 0.8, sx: 1, sy: 1, sz: 1, ry: rand() * 6.28, rx: -0.9 });
      }
      if (!l.y && l.h < 30 && l.w > 8 && rand() < 0.14) {
        roof(green).push({ x: l.x + (rand() - 0.5) * l.w * 0.25, y: top + 0.18, z: l.z + (rand() - 0.5) * l.d * 0.25, sx: l.w * 0.5, sy: 0.3, sz: l.d * 0.45, ry: 0 });
        const m = 2 + Math.floor(rand() * 4);
        for (let k = 0; k < m; k++) {
          roof(green).push({ x: l.x + (rand() - 0.5) * l.w * 0.6, y: top + 0.55, z: l.z + (rand() - 0.5) * l.d * 0.6, sx: range(rand, 0.6, 1.4), sy: range(rand, 0.6, 1.1), sz: range(rand, 0.6, 1.4), ry: 0 });
        }
      }
    });
    return { parapet, vent, skylight, dish, green };
  }, [lots]);
  useEffect(() => {
    fillPlacements(parapets.current, extras.parapet);
    fillPlacements(vents.current, extras.vent);
    fillPlacements(skylights.current, extras.skylight);
    fillPlacements(dishes.current, extras.dish);
    fillPlacements(greenery.current, extras.green);
  }, [extras]);
  useEffect(() => {
    if (skylightMat.current) skylightMat.current.emissiveIntensity = 0.05 + dn.night * 0.7;
  }, [dn]);
  useEffect(() => {
    fillInstances(bulkheads.current, bulkLots.length, (i, d) => {
      const l = bulkLots[i];
      d.position.set(l.x - l.w * 0.2, PAD + l.h + 1.3, l.z + l.d * 0.15);
      d.scale.set(Math.min(3.2, l.w * 0.3), 1, Math.min(3.2, l.d * 0.3));
    });
    fillInstances(units.current, unitLots.length, (i, d) => {
      const u = unitLots[i];
      d.position.set(u.x, u.y, u.z);
      d.scale.set(u.s, 1, u.s);
    });
    fillInstances(tanks.current, tankLots.length, (i, d) => {
      const l = tankLots[i];
      d.position.set(l.x + l.w * 0.22, PAD + (l.y ?? 0) + l.h + 1.1, l.z - l.d * 0.2);
    });
    fillInstances(masts.current, mastLots.length, (i, d) => {
      const l = mastLots[i];
      const mh = 3 + (l.h > 44 ? 5 : 0);
      d.position.set(l.x, PAD + topOf(l) + mh / 2, l.z);
      d.scale.set(1, mh, 1);
    });
  }, [tankLots, mastLots, bulkLots, unitLots]);
  useEffect(() => {
    if (beaconMat.current) beaconMat.current.emissiveIntensity = 0.6 + dn.night * 3;
  }, [dn]);
  const beaconMast = BEACON_MAST + (hasCrown(beaconLot) ? crownHeight(beaconLot) : 0);
  return (
    <group name="roof-details" userData={{ noReflect: true }}>
      <instancedMesh ref={parapets} args={[undefined, undefined, extras.parapet.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#9c8f78" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={vents} args={[undefined, undefined, extras.vent.length]}>
        <cylinderGeometry args={[0.22, 0.26, 1, 5]} />
        <meshStandardMaterial color="#8c8c98" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={skylights} args={[undefined, undefined, extras.skylight.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={skylightMat} color="#7f98b0" emissive="#ffd9a0" emissiveIntensity={0.05} roughness={0.15} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={dishes} args={[undefined, undefined, extras.dish.length]}>
        <cylinderGeometry args={[0.55, 0.3, 0.12, 10]} />
        <meshStandardMaterial color="#d8d8e2" roughness={0.5} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={greenery} args={[undefined, undefined, extras.green.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a6b3f" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={bulkheads} args={[undefined, undefined, bulkLots.length]}>
        <boxGeometry args={[1, 2.6, 1]} />
        <meshStandardMaterial color="#6c6862" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={units} args={[undefined, undefined, unitLots.length]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="#9a9aa8" roughness={0.7} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={tanks} args={[undefined, undefined, tankLots.length]}>
        <cylinderGeometry args={[1.1, 1.1, 2.2, 10]} />
        <meshStandardMaterial color="#8a7f6a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={masts} args={[undefined, undefined, mastLots.length]}>
        <cylinderGeometry args={[0.1, 0.16, 1, 5]} />
        <meshStandardMaterial color="#aaa" roughness={0.5} metalness={0.6} />
      </instancedMesh>
      <group position={[beaconLot.x, PAD + topOf(beaconLot), beaconLot.z]}>
        <mesh position={[0, beaconMast / 2, 0]}>
          <cylinderGeometry args={[0.12, 0.2, beaconMast, 5]} />
          <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, beaconMast + 0.4, 0]}>
          <sphereGeometry args={[0.55, 10, 8]} />
          <meshStandardMaterial ref={beaconMat} color="#ff2244" emissive="#ff3355" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

const BILLBOARD_ADS = [
  { text: "J. ADAMS · NEW SINGLE OUT NOW", bg: "#07060f", fg: "#f3dfae", border: "#d6b56e" },
  { text: "ADAMS UNIVERSECITY · DETROIT", bg: "#1d1d3f", fg: "#f4f1ea" },
  { text: "CLUB ADAMS · TONIGHT · RENCEN", bg: "#d6b56e", fg: "#07060f" },
  { text: "LISTEN · LIVE AT THE FOX", bg: "#b52c24", fg: "#ffe08a" },
  { text: "313 · MOTOR CITY", bg: "#f4f1ea", fg: "#1d1d3f" },
  { text: "EASTERN MARKET · SATURDAYS", bg: "#2f8a5a", fg: "#f4f1ea" },
  { text: "DETROIT RIVERWALK · OPEN DAILY", bg: "#1d2a6a", fg: "#f4f1ea" },
  { text: "CONEY ISLAND · OPEN 24 HRS", bg: "#c8102e", fg: "#f4f1ea" },
  { text: "DDOT · RIDE WOODWARD", bg: "#14101c", fg: "#ffb02e", border: "#ffb02e" },
];

function BillboardFaces({ spots, ad }: { spots: Placement[]; ad: (typeof BILLBOARD_ADS)[number] }) {
  const dn = useDayNight();
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const tex = useMemo(() => labelTexture(ad.text, { width: 512, height: 184, bg: ad.bg, fg: ad.fg, border: ad.border, size: 75, weathered: true }), [ad]);
  useEffect(() => {
    fillInstances(ref.current, spots.length, (i, d) => {
      const it = spots[i];
      d.position.set(it.x + Math.sin(it.ry) * 0.17, it.y, it.z + Math.cos(it.ry) * 0.17);
      d.rotation.set(0, it.ry, 0);
      d.scale.set(it.sx, it.sy, 1);
    });
  }, [spots]);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.05 + dn.night * 0.75;
  }, [dn]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.05} roughness={0.7} />
    </instancedMesh>
  );
}

function RoofBillboards({ items }: { items: Placement[] }) {
  const dn = useDayNight();
  const backs = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const lampMat = useRef<MeshStandardMaterial>(null);
  const byAd = useMemo(() => {
    const groups: Placement[][] = BILLBOARD_ADS.map(() => []);
    items.forEach((it, i) => groups[i % BILLBOARD_ADS.length].push(it));
    return groups;
  }, [items]);
  useEffect(() => {
    fillInstances(backs.current, items.length, (i, d) => {
      const it = items[i];
      d.position.set(it.x, it.y, it.z);
      d.rotation.set(0, it.ry, 0);
      d.scale.set(it.sx + 0.3, it.sy + 0.3, 0.3);
    });
    fillInstances(legs.current, items.length * 2, (j, d) => {
      const it = items[j >> 1];
      const side = j & 1 ? 1 : -1;
      const legH = 2.6 - it.sy / 2;
      d.position.set(it.x + Math.cos(it.ry) * side * it.sx * 0.35, it.y - it.sy / 2 - legH / 2, it.z - Math.sin(it.ry) * side * it.sx * 0.35);
      d.scale.set(1, legH, 1);
    });
    fillInstances(lamps.current, items.length, (i, d) => {
      const it = items[i];
      d.position.set(it.x + Math.sin(it.ry) * 0.35, it.y + it.sy / 2 + 0.12, it.z + Math.cos(it.ry) * 0.35);
      d.rotation.set(0, it.ry, 0);
      d.scale.set(it.sx * 0.9, 0.08, 0.5);
    });
  }, [items]);
  useEffect(() => {
    if (lampMat.current) lampMat.current.emissiveIntensity = 0.1 + dn.night * 2.2;
  }, [dn]);
  return (
    <group name="billboards">
      <instancedMesh ref={backs} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2b2b3a" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, items.length * 2]}>
        <cylinderGeometry args={[0.12, 0.14, 1, 6]} />
        <meshStandardMaterial color="#6a6a78" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={lampMat} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={0.1} toneMapped={false} />
      </instancedMesh>
      {BILLBOARD_ADS.map((ad, i) => byAd[i].length > 0 && <BillboardFaces key={ad.text} spots={byAd[i]} ad={ad} />)}
    </group>
  );
}

function Facades({ lots }: { lots: Lot[] }) {
  const cornices = useRef<InstancedMesh>(null);
  const belts = useRef<InstancedMesh>(null);
  const pilasters = useRef<InstancedMesh>(null);
  const platforms = useRef<InstancedMesh>(null);
  const rails = useRef<InstancedMesh>(null);
  const stairs = useRef<InstancedMesh>(null);
  const balconies = useRef<InstancedMesh>(null);
  const doors = useRef<InstancedMesh>(null);
  const canopies = useRef<InstancedMesh>(null);
  const stoops = useRef<InstancedMesh>(null);
  const planters = useRef<InstancedMesh>(null);
  const shrubs = useRef<InstancedMesh>(null);

  const data = useMemo(() => {
    const rand = mulberry32(4242);
    const cornice: Placement[] = [];
    const belt: Placement[] = [];
    const pil: Placement[] = [];
    const plat: Placement[] = [];
    const rail: Placement[] = [];
    const stair: Placement[] = [];
    const balc: Placement[] = [];
    const board: Placement[] = [];
    const door: Placement[] = [];
    const canopy: Placement[] = [];
    const stoop: Placement[] = [];
    const planter: Placement[] = [];
    const shrub: Placement[] = [];
    const planterColors = ["#2a2a30", "#5a4636", "#6e6a60", "#8a3a2a"];
    lots.forEach((l) => {
      const y0 = PAD + (l.y ?? 0);
      const top = y0 + l.h;
      if (l.style !== "mid") cornice.push({ x: l.x, y: top - (0.7 + CORNICE_DROP) / 2, z: l.z, sx: l.w + 0.9, sy: 0.7 - CORNICE_DROP, sz: l.d + 0.9, ry: 0 });
      if (l.h > 12 && l.style !== "mid") cornice.push({ x: l.x, y: top - 1.3, z: l.z, sx: l.w + 0.5, sy: 0.3, sz: l.d + 0.5, ry: 0 });
      if (l.style === "beaux" && l.top) cornice.push({ x: l.x, y: top - (1.15 + 2 * CORNICE_DROP) / 2, z: l.z, sx: l.w + 2.6, sy: 1.15 - 2 * CORNICE_DROP, sz: l.d + 2.6, ry: 0 });
      if (l.style === "beaux" && !l.y) cornice.push({ x: l.x, y: y0 + 0.45, z: l.z, sx: l.w + 0.7, sy: 0.9, sz: l.d + 0.7, ry: 0 });
      const lum = l.color.r * 0.299 + l.color.g * 0.587 + l.color.b * 0.114;
      const glass = lum < 0.2;
      if (l.y) return;
      const horizontalBelts = (l.style === "chicago" || l.style === "beaux") && l.ad < 0;
      for (let y = y0 + 7.5; horizontalBelts && y < top - 4; y += 7.5) belt.push({ x: l.x, y, z: l.z, sx: l.w + 0.45, sy: 0.28, sz: l.d + 0.45, ry: 0 });
      const sides: [number, number, number, number][] = [
        [l.x, l.z + l.d / 2, 0, l.w],
        [l.x, l.z - l.d / 2, Math.PI, l.w],
        [l.x + l.w / 2, l.z, Math.PI / 2, l.d],
        [l.x - l.w / 2, l.z, -Math.PI / 2, l.d],
      ];
      if (!glass && l.w > 7 && l.style !== "mid") {
        const rise = l.style === "deco" ? l.h + 1.4 : l.h - 1.2;
        sides.forEach(([sx, sz, ry, len], side) => {
          if (l.blank > 0 && side === l.blank + 1) return;
          const cols = Math.max(1, Math.round(len / 4.6));
          for (let k = 0; k <= cols; k++) {
            const t = -len / 2 + (k / cols) * len;
            const px = sx + Math.cos(ry) * t + Math.sin(ry) * 0.2;
            const pz = sz - Math.sin(ry) * t + Math.cos(ry) * 0.2;
            pil.push({ x: px, y: y0 + 0.4 + rise / 2, z: pz, sx: 0.5, sy: rise, sz: 0.5, ry });
          }
        });
      }
      const style = rand();
      if (!glass && style < 0.32 && l.h > 9) {
        const pickSide = Math.floor(rand() * 2) + 2;
        const [sx, sz, ry, len] = sides[pickSide === l.blank + 1 ? 5 - pickSide : pickSide];
        const span = Math.min(3.6, len - 2);
        for (let y = y0 + 4; y < top - 2; y += 3.2) {
          const px = sx + Math.sin(ry) * 0.7;
          const pz = sz + Math.cos(ry) * 0.7;
          plat.push({ x: px, y, z: pz, sx: span, sy: 0.12, sz: 1.1, ry });
          rail.push({ x: px + Math.sin(ry) * 0.5, y: y + 0.5, z: pz + Math.cos(ry) * 0.5, sx: span, sy: 1, sz: 0.06, ry });
          stair.push({ x: px, y: y + 1.6, z: pz, sx: span * 0.8, sy: 0.1, sz: 0.9, ry, rx: 0.72 });
        }
      } else if (style < 0.55 && l.h > 9) {
        sides.slice(0, 2).forEach(([sx, sz, ry, len]) => {
          const cols = Math.max(1, Math.floor(len / 3.6));
          for (let y = y0 + 4; y < top - 2; y += 3.2) {
            for (let k = 0; k < cols; k++) {
              const t = -len / 2 + (k + 0.5) * (len / cols);
              const px = sx + Math.cos(ry) * t + Math.sin(ry) * 0.6;
              const pz = sz - Math.sin(ry) * t + Math.cos(ry) * 0.6;
              balc.push({ x: px, y, z: pz, sx: 2.2, sy: 0.9, sz: 1.1, ry });
            }
          }
        });
      }
      if (rand() < 0.18 && l.h > 8 && !hasCrown(l)) {
        const ry = rand() < 0.5 ? 0 : Math.PI / 2;
        const w = Math.min(l.w, l.d) * 0.7;
        board.push({ x: l.x, y: top + 2.6, z: l.z, sx: w, sy: w * 0.36, sz: 0.3, ry });
      }
      sides.slice(0, 2).forEach(([sx, sz, ry]) => {
        if (rand() < 0.35) return;
        const nx = Math.sin(ry);
        const nz = Math.cos(ry);
        door.push({ x: sx + nx * 0.2, y: PAD + 1.5, z: sz + nz * 0.2, sx: 2.2, sy: 3, sz: 0.3, ry });
        canopy.push({ x: sx + nx * 1.1, y: PAD + 3.3, z: sz + nz * 1.1, sx: 3.2, sy: 0.2, sz: 1.8, ry });
        stoop.push({ x: sx + nx * 0.85, y: PAD + 0.16, z: sz + nz * 0.85, sx: 3, sy: 0.32, sz: 1.5, ry });
        if (rand() < 0.45) {
          const color = new Color(pick(rand, planterColors));
          for (const side of [-1, 1]) {
            const ox = Math.cos(ry) * side * 2.1 + nx * 0.75;
            const oz = -Math.sin(ry) * side * 2.1 + nz * 0.75;
            planter.push({ x: sx + ox, y: PAD + 0.3, z: sz + oz, sx: 0.7, sy: 0.6, sz: 0.7, ry, color });
            shrub.push({ x: sx + ox, y: PAD + 0.95, z: sz + oz, sx: 0.8, sy: 0.7, sz: 0.8, ry: rand() * 6.28 });
          }
        }
      });
    });
    return { cornice, belt, pil, plat, rail, stair, balc, board, door, canopy, stoop, planter, shrub };
  }, [lots]);

  useEffect(() => {
    fillPlacements(cornices.current, data.cornice);
    fillPlacements(belts.current, data.belt);
    fillPlacements(pilasters.current, data.pil);
    fillPlacements(platforms.current, data.plat);
    fillPlacements(rails.current, data.rail);
    fillPlacements(stairs.current, data.stair);
    fillPlacements(balconies.current, data.balc);
    fillPlacements(doors.current, data.door);
    fillPlacements(canopies.current, data.canopy);
    fillPlacements(stoops.current, data.stoop);
    fillPlacements(planters.current, data.planter);
    fillPlacements(shrubs.current, data.shrub);
  }, [data]);

  return (
    <group name="facades">
      <RoofBillboards items={data.board} />
      <instancedMesh ref={stoops} args={[undefined, undefined, data.stoop.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7a736a" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={planters} args={[undefined, undefined, data.planter.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={shrubs} args={[undefined, undefined, data.shrub.length]}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#44603c" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={cornices} args={[undefined, undefined, data.cornice.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b9a88c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={belts} args={[undefined, undefined, data.belt.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a8977c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pilasters} args={[undefined, undefined, data.pil.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8c7b64" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={platforms} args={[undefined, undefined, data.plat.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={rails} args={[undefined, undefined, data.rail.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.6} metalness={0.5} transparent opacity={0.7} />
      </instancedMesh>
      <instancedMesh ref={stairs} args={[undefined, undefined, data.stair.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={balconies} args={[undefined, undefined, data.balc.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6e6a60" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={doors} args={[undefined, undefined, data.door.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#14101c" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={canopies} args={[undefined, undefined, data.canopy.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#2b2b3a" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function hasCrown(l: Lot) {
  return l.top && l.style === "deco" && topOf(l) > CROWN_MIN_TOP;
}

function crownColor(l: Lot) {
  const rand = mulberry32(Math.floor(l.seed * 1000));
  return rand() < COPPER_SHARE ? new Color(pick(rand, COPPER_CROWN)) : l.color.clone().lerp(new Color(LIMESTONE[0]), 0.5);
}

function fillCrowns(mesh: InstancedMesh | null, lots: Lot[]) {
  if (!mesh) return;
  fillInstances(mesh, lots.length, (i, d) => {
    const l = lots[i];
    d.position.set(l.x, PAD + topOf(l), l.z);
    d.scale.set(l.w * CROWN_INSET, crownHeight(l), l.d * CROWN_INSET);
  });
  fillColors(mesh, lots.length, (i) => crownColor(lots[i]));
}

function Crowns({ lots }: { lots: Lot[] }) {
  const dn = useDayNight();
  const plain = useRef<InstancedMesh>(null);
  const lit = useRef<InstancedMesh>(null);
  const litMat = useRef<MeshStandardMaterial>(null);
  const { dark, floodlit } = useMemo(() => {
    const tops = lots.filter(hasCrown);
    return { dark: tops.filter((l) => !l.lit), floodlit: tops.filter((l) => l.lit) };
  }, [lots]);
  useEffect(() => {
    fillCrowns(plain.current, dark);
    fillCrowns(lit.current, floodlit);
  }, [dark, floodlit]);
  useEffect(() => {
    if (litMat.current) litMat.current.emissiveIntensity = dn.night * 0.95;
  }, [dn]);
  return (
    <group name="crowns">
      <instancedMesh ref={plain} args={[CROWN, undefined, dark.length]} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.75} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={lit} args={[CROWN, undefined, floodlit.length]} castShadow>
        <meshStandardMaterial ref={litMat} color="#ffffff" emissive="#ffcf96" emissiveIntensity={0} roughness={0.75} metalness={0.2} />
      </instancedMesh>
    </group>
  );
}

function GhostAdWall({ ad, lots }: { ad: (typeof GHOST_ADS)[number]; lots: Lot[] }) {
  const ref = useRef<InstancedMesh>(null);
  const tex = useMemo(() => ghostAdTexture(ad.lines, ad.ground, ad.ink), [ad]);
  useEffect(() => {
    fillInstances(ref.current, lots.length, (i, o) => {
      const l = lots[i];
      const side = l.blank === 1 ? 1 : -1;
      const { bottom, height } = adSpan(l);
      o.position.set(l.x + side * (l.w / 2 + 0.04), PAD + bottom + height / 2, l.z);
      o.rotation.set(0, side * (Math.PI / 2), 0);
      o.scale.set(height / AD_ASPECT, height, 1);
    });
  }, [lots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lots.length]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} roughness={0.95} />
    </instancedMesh>
  );
}

function GhostAds({ lots }: { lots: Lot[] }) {
  const byAd = useMemo(() => GHOST_ADS.map((_, i) => lots.filter((l) => l.ad === i)), [lots]);
  return (
    <group name="ghost-ads">
      {GHOST_ADS.map((ad, i) => byAd[i].length > 0 && <GhostAdWall key={ad.lines[0]} ad={ad} lots={byAd[i]} />)}
    </group>
  );
}

export default function Buildings() {
  const { city } = useMemo(() => buildLots(), []);
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  return (
    <group ref={root}>
      <InstancedLots lots={city} />
      <ContactShadows lots={city} />
      <RoofDetails lots={city} />
      <StreetLevel lots={city} />
      <Facades lots={city} />
      <Crowns lots={city} />
      <GhostAds lots={city} />
    </group>
  );
}
