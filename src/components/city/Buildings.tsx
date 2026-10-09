"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { useDayNight } from "./DayNightContext";
import {
  AMBASSADOR_CLEAR_HALF,
  AMBASSADOR_RAMP_Z,
  AMBASSADOR_X,
  BLOCK,
  CITY_HALF_Z,
  COLS,
  DESTINATIONS,
  OUTER_HALF_X,
  OUTER_MIN_Z,
  OUTER_ROWS,
  ROWS,
  RIVER_FAR,
  allBlocks,
  blockCenter,
} from "./layout";
import { mulberry32, pick, range } from "./rng";
import { labelTexture } from "./labels";
import { useWindowMaterial } from "./useWindowMaterial";
import { makeShadowBlobTexture } from "./textures";
import { useBaseBoxGeometry } from "./instancing";
import { enableReflection } from "./layers";
import type { Group } from "three";

export const RESERVED_BLOCKS = new Set<string>([
  ...DESTINATIONS.map((d) => `${d.block[0]},${d.block[1]}`),
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
  "5,3",
  "5,4",
  "6,4",
  "5,1",
  "6,1",
  "4,0",
  "3,0",
]);

const PALETTE = [
  "#8a4a3a",
  "#a3563f",
  "#7a4034",
  "#b89a7a",
  "#c9b48c",
  "#9c8468",
  "#6e5a4a",
  "#5a6a7a",
  "#3f4e66",
  "#7c6a5c",
  "#9a6a4a",
  "#b07a5a",
  "#1a2238",
  "#223050",
  "#2a3a5c",
];

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
  const color = new Color(pick(rand, PALETTE));
  out.push({
    ...cell,
    h,
    color,
    seed: rand() * 100,
    roofKind: rand() < 0.35 ? 1 : rand() < 0.2 ? 2 : 0,
  });
  if (h > 16 && rand() < 0.85) {
    const k = range(rand, 0.55, 0.72);
    out.push({ x: cell.x, z: cell.z, w: cell.w * k, d: cell.d * k, y: h, h: h * range(rand, 0.22, 0.4), color, seed: rand() * 100, roofKind: 0 });
    if (h > 40 && rand() < 0.6) {
      out.push({ x: cell.x, z: cell.z, w: cell.w * k * 0.6, d: cell.d * k * 0.6, y: h * 1.3, h: h * 0.18, color, seed: rand() * 100, roofKind: 2 });
    }
  }
}

function underAmbassador(x: number, z: number, w: number, d: number) {
  return Math.abs(x - AMBASSADOR_X) < w / 2 + AMBASSADOR_CLEAR_HALF && z + d / 2 > AMBASSADOR_RAMP_Z[0] - 2 && z - d / 2 < AMBASSADOR_RAMP_Z[1] + 2;
}

function buildLots(): { city: Lot[]; outskirts: Lot[]; windsor: Lot[] } {
  const rand = mulberry32(2024);
  const city: Lot[] = [];
  // Lots under the bridge still draw from rand so every other lot keeps its seed.
  const cleared: Lot[] = [];
  for (const { c, r, outer } of allBlocks()) {
    if (!outer && RESERVED_BLOCKS.has(`${c},${r}`)) continue;
    const [bx, bz] = blockCenter(c, r);
    const cells = cellsForBlock(bx, bz, rand);
    if (!outer) {
      const centerDist = Math.hypot((c - (COLS - 1) / 2) / COLS, (r - 2.4) / ROWS);
      const core = 1 - Math.min(1, centerDist * 2.1);
      const frontRow = r === ROWS - 1;
      for (const cell of cells) {
        const base = frontRow ? range(rand, 6, 14) : range(rand, 8, 18);
        const tall = frontRow ? 0 : core * range(rand, 12, 36);
        pushBuilding(city, cell, base + tall, rand);
      }
    } else {
      const ring = Math.max(r < 0 ? -r : 0, c < 0 ? -c : 0, c >= COLS ? c - COLS + 1 : 0);
      const falloff = 1 - Math.min(1, ring / (OUTER_ROWS + 1)) * 0.55;
      for (const cell of cells) {
        if (rand() < 0.08) continue;
        const h = range(rand, 5, 12) + range(rand, 0, 22) * falloff * (rand() < 0.3 ? 1.6 : 1);
        pushBuilding(underAmbassador(cell.x, cell.z, cell.w, cell.d) ? cleared : city, cell, h, rand);
      }
    }
  }

  const outskirts: Lot[] = [];
  for (let i = 0; i < 0; i++) {
    const x = range(rand, -OUTER_HALF_X - 420, OUTER_HALF_X + 420);
    const z = range(rand, OUTER_MIN_Z - 460, CITY_HALF_Z + 6);
    const insideGrid = Math.abs(x) < OUTER_HALF_X + 8 && z > OUTER_MIN_Z - 8;
    if (insideGrid) continue;
    const dist = Math.hypot(x / 1.3, z - OUTER_MIN_Z) / 460;
    const h = Math.max(4, range(rand, 6, 26) * (1 - dist * 0.55));
    outskirts.push({
      x,
      z,
      w: range(rand, 8, 20),
      d: range(rand, 8, 20),
      h,
      color: new Color(pick(rand, PALETTE)).multiplyScalar(0.85),
      seed: rand() * 100,
      roofKind: 0,
    });
  }

  const windsor: Lot[] = [];
  for (let i = 0; i < 140; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * range(rand, 175, 640);
    const z = range(rand, RIVER_FAR + 14, RIVER_FAR + 140);
    const h = range(rand, 5, 26) * (1 - Math.abs(x) / 900);
    const lot: Lot = {
      x,
      z,
      w: range(rand, 8, 18),
      d: range(rand, 8, 16),
      h,
      color: new Color(pick(rand, PALETTE)).multiplyScalar(0.7),
      seed: rand() * 100,
      roofKind: 0,
    };
    if (!underAmbassador(lot.x, lot.z, lot.w, lot.d)) windsor.push(lot);
  }
  return { city, outskirts, windsor };
}

function InstancedLots({ lots, winSize }: { lots: Lot[]; winSize?: [number, number] }) {
  const mat = useWindowMaterial({ winSize, glow: 0.1 });
  const lotGeometry = useBaseBoxGeometry();
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const seeds = useMemo(() => new Float32Array(lots.map((l) => l.seed)), [lots]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    lots.forEach((l, i) => {
      dummy.position.set(l.x, 0.4 + (l.y ?? 0), l.z);
      dummy.scale.set(l.w, l.h, l.d);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, l.color);
    });
    m.geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [lots, seeds, dummy]);
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
  { text: "VINTAGE", bg: "#1d1d3f", fg: "#49f2d6" },
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
  const tex = useMemo(() => labelTexture(sign.text, { width: 512, height: 112, bg: sign.bg, fg: sign.fg, border: sign.border, size: 64 }), [sign]);
  useEffect(() => {
    const dummy = new Object3D();
    const m = ref.current;
    const t = tubes.current;
    if (!m || !t) return;
    spots.forEach((it, i) => {
      dummy.position.set(it.x, 0.4 + 3.8, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.w, it.w * 0.22, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      dummy.position.set(it.x + Math.sin(it.rot) * 0.1, 0.4 + 3.8 - it.w * 0.11 - 0.12, it.z + Math.cos(it.rot) * 0.1);
      dummy.scale.set(it.w * 0.92, 0.07, 0.07);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    t.instanceMatrix.needsUpdate = true;
  }, [spots]);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.1 + dn.night * 0.9;
    if (tubeMat.current) tubeMat.current.emissiveIntensity = 0.3 + dn.night * 3.2;
  }, [dn]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.1} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={tubes} args={[undefined, undefined, spots.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={tubeMat} color={sign.border ?? sign.fg} emissive={sign.border ?? sign.fg} emissiveIntensity={0.3} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function StreetLevel({ lots }: { lots: Lot[] }) {
  const awnings = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
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
      sides.forEach(([sx, sz, rot]) => {
        const len = rot === 0 || rot === Math.PI ? l.w : l.d;
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5 + (rand() - 0.5) * 0.5) / n - 0.5;
          const ox = Math.cos(rot) * t * len * 0.8;
          const oz = -Math.sin(rot) * t * len * 0.8;
          const nx = Math.sin(rot);
          const nz = Math.cos(rot);
          const w = range(rand, 2.2, 3.6);
          if (rand() < 0.5) awn.push({ x: sx + ox + nx * 0.9, z: sz + oz + nz * 0.9, rot, color: new Color(pick(rand, palette)), w });
          if (rand() < 0.6) signs[Math.floor(rand() * SHOP_SIGNS.length)].push({ x: sx + ox + nx * 0.08, z: sz + oz + nz * 0.08, rot, w: Math.min(3.4, len * 0.6 / n) });
        }
      });
    });
    return { awn, signs };
  }, [lots]);
  useEffect(() => {
    const a = awnings.current;
    if (!a) return;
    items.awn.forEach((it, i) => {
      dummy.position.set(it.x, 0.4 + 3.1, it.z);
      dummy.rotation.set(0.35, it.rot, 0);
      dummy.scale.set(it.w, 1, 1);
      dummy.updateMatrix();
      a.setMatrixAt(i, dummy.matrix);
      a.setColorAt(i, it.color);
    });
    a.instanceMatrix.needsUpdate = true;
    if (a.instanceColor) a.instanceColor.needsUpdate = true;
  }, [items, dummy]);
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
  const bases = useMemo(() => lots.filter((l) => !l.y), [lots]);
  useEffect(() => {
    const dummy = new Object3D();
    const m = ref.current;
    if (!m) return;
    bases.forEach((l, i) => {
      dummy.position.set(l.x, 0.46, l.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(l.w + 7, l.d + 7, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
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
  const beacons = useRef<InstancedMesh>(null);
  const beaconMat = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tankLots = useMemo(() => lots.filter((l) => l.roofKind === 1), [lots]);
  const bulkheads = useRef<InstancedMesh>(null);
  const units = useRef<InstancedMesh>(null);
  const bulkLots = useMemo(() => lots.filter((l) => !l.y && l.h > 8 && l.seed % 1 < 0.75), [lots]);
  const unitLots = useMemo(() => {
    const rand = mulberry32(55);
    const out: { x: number; y: number; z: number; s: number }[] = [];
    lots.forEach((l) => {
      if (l.y) return;
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        out.push({ x: l.x + (rand() - 0.5) * l.w * 0.6, y: 0.4 + l.h + 0.5, z: l.z + (rand() - 0.5) * l.d * 0.6, s: range(rand, 0.8, 1.6) });
      }
    });
    return out;
  }, [lots]);
  const mastLots = useMemo(() => lots.filter((l) => l.roofKind === 2 || (l.h > 44 && !l.y)), [lots]);
  const parapets = useRef<InstancedMesh>(null);
  const vents = useRef<InstancedMesh>(null);
  const skylights = useRef<InstancedMesh>(null);
  const skylightMat = useRef<MeshStandardMaterial>(null);
  const dishes = useRef<InstancedMesh>(null);
  const greenery = useRef<InstancedMesh>(null);
  const extras = useMemo(() => {
    const rand = mulberry32(5150);
    type P = { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number; rx?: number };
    const parapet: P[] = [];
    const vent: P[] = [];
    const skylight: P[] = [];
    const dish: P[] = [];
    const green: P[] = [];
    lots.forEach((l) => {
      const top = 0.4 + (l.y ?? 0) + l.h;
      parapet.push({ x: l.x, y: top + 0.3, z: l.z + l.d / 2, sx: l.w + 0.5, sy: 0.6, sz: 0.4, ry: 0 });
      parapet.push({ x: l.x, y: top + 0.3, z: l.z - l.d / 2, sx: l.w + 0.5, sy: 0.6, sz: 0.4, ry: 0 });
      parapet.push({ x: l.x + l.w / 2, y: top + 0.3, z: l.z, sx: 0.4, sy: 0.6, sz: l.d + 0.5, ry: 0 });
      parapet.push({ x: l.x - l.w / 2, y: top + 0.3, z: l.z, sx: 0.4, sy: 0.6, sz: l.d + 0.5, ry: 0 });
      const n = Math.floor(rand() * 4);
      for (let k = 0; k < n; k++) {
        vent.push({ x: l.x + (rand() - 0.5) * l.w * 0.7, y: top + 0.45, z: l.z + (rand() - 0.5) * l.d * 0.7, sx: 1, sy: range(rand, 0.6, 1.3), sz: 1, ry: 0 });
      }
      if (l.w > 9 && l.d > 9 && rand() < 0.4) {
        skylight.push({ x: l.x + (rand() - 0.5) * l.w * 0.3, y: top + 0.3, z: l.z + (rand() - 0.5) * l.d * 0.3, sx: range(rand, 1.8, 3.2), sy: 0.5, sz: range(rand, 1.2, 2.2), ry: rand() < 0.5 ? 0 : Math.PI / 2 });
      }
      if (rand() < 0.35) {
        dish.push({ x: l.x + (rand() - 0.5) * l.w * 0.8, y: top + 0.9, z: l.z + (rand() - 0.5) * l.d * 0.8, sx: 1, sy: 1, sz: 1, ry: rand() * 6.28, rx: -0.9 });
      }
      if (!l.y && l.h < 30 && l.w > 8 && rand() < 0.14) {
        green.push({ x: l.x + (rand() - 0.5) * l.w * 0.25, y: top + 0.18, z: l.z + (rand() - 0.5) * l.d * 0.25, sx: l.w * 0.5, sy: 0.3, sz: l.d * 0.45, ry: 0 });
        const m = 2 + Math.floor(rand() * 4);
        for (let k = 0; k < m; k++) {
          green.push({ x: l.x + (rand() - 0.5) * l.w * 0.6, y: top + 0.55, z: l.z + (rand() - 0.5) * l.d * 0.6, sx: range(rand, 0.6, 1.4), sy: range(rand, 0.6, 1.1), sz: range(rand, 0.6, 1.4), ry: 0 });
        }
      }
    });
    return { parapet, vent, skylight, dish, green };
  }, [lots]);
  useEffect(() => {
    const sets: [InstancedMesh | null, typeof extras.parapet][] = [
      [parapets.current, extras.parapet],
      [vents.current, extras.vent],
      [skylights.current, extras.skylight],
      [dishes.current, extras.dish],
      [greenery.current, extras.green],
    ];
    for (const [m, items] of sets) {
      if (!m) continue;
      items.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(it.rx ?? 0, it.ry, 0);
        dummy.scale.set(it.sx, it.sy, it.sz);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  }, [extras, dummy]);
  useEffect(() => {
    if (skylightMat.current) skylightMat.current.emissiveIntensity = 0.05 + dn.night * 0.7;
  }, [dn]);
  useEffect(() => {
    const bk = bulkheads.current;
    if (bk) {
      bulkLots.forEach((l, i) => {
        dummy.position.set(l.x - l.w * 0.2, 0.4 + l.h + 1.3, l.z + l.d * 0.15);
        dummy.scale.set(Math.min(3.2, l.w * 0.3), 1, Math.min(3.2, l.d * 0.3));
        dummy.updateMatrix();
        bk.setMatrixAt(i, dummy.matrix);
      });
      bk.instanceMatrix.needsUpdate = true;
    }
    const un = units.current;
    if (un) {
      unitLots.forEach((u, i) => {
        dummy.position.set(u.x, u.y, u.z);
        dummy.scale.set(u.s, 1, u.s);
        dummy.updateMatrix();
        un.setMatrixAt(i, dummy.matrix);
      });
      un.instanceMatrix.needsUpdate = true;
    }
    const t = tanks.current;
    if (t) {
      tankLots.forEach((l, i) => {
        dummy.position.set(l.x + l.w * 0.22, 0.4 + (l.y ?? 0) + l.h + 1.1, l.z - l.d * 0.2);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        t.setMatrixAt(i, dummy.matrix);
      });
      t.instanceMatrix.needsUpdate = true;
    }
    const m = masts.current;
    const b = beacons.current;
    if (m && b) {
      mastLots.forEach((l, i) => {
        const mh = 3 + (l.h > 44 ? 5 : 0);
        const top = 0.4 + (l.y ?? 0) + l.h;
        dummy.position.set(l.x, top + mh / 2, l.z);
        dummy.scale.set(1, mh, 1);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        dummy.position.set(l.x, top + mh + 0.3, l.z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        b.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      b.instanceMatrix.needsUpdate = true;
    }
  }, [tankLots, mastLots, bulkLots, unitLots, dummy]);
  useEffect(() => {
    if (beaconMat.current) beaconMat.current.emissiveIntensity = 1.2 + dn.night * 3;
  }, [dn]);
  return (
    <group name="roof-details">
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
        <meshStandardMaterial color="#6a6070" roughness={0.9} />
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
      <instancedMesh ref={beacons} args={[undefined, undefined, mastLots.length]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial
          ref={beaconMat}
          color="#ff2244"
          emissive="#ff3355"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

interface Placed {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  rx?: number;
  color?: Color;
}

const BILLBOARD_ADS = [
  { text: "J. ADAMS · NEW SINGLE OUT NOW", bg: "#07060f", fg: "#f3dfae", border: "#d6b56e" },
  { text: "ADAMS UNIVERSECITY · DETROIT", bg: "#1d1d3f", fg: "#49f2d6" },
  { text: "CLUB ADAMS · TONIGHT · RENCEN", bg: "#ff4fa3", fg: "#07060f" },
  { text: "LISTEN · LIVE AT THE FOX", bg: "#b52c24", fg: "#ffe08a" },
  { text: "313 · MOTOR CITY", bg: "#f4f1ea", fg: "#1d1d3f" },
  { text: "EASTERN MARKET · SATURDAYS", bg: "#2f8a5a", fg: "#f4f1ea" },
  { text: "DETROIT RIVERWALK · OPEN DAILY", bg: "#1d2a6a", fg: "#f4f1ea" },
  { text: "CONEY ISLAND · OPEN 24 HRS", bg: "#c8102e", fg: "#f4f1ea" },
  { text: "DDOT · RIDE WOODWARD", bg: "#14101c", fg: "#ffb02e", border: "#ffb02e" },
];

function BillboardFaces({ spots, ad }: { spots: Placed[]; ad: (typeof BILLBOARD_ADS)[number] }) {
  const dn = useDayNight();
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const tex = useMemo(() => labelTexture(ad.text, { width: 512, height: 184, bg: ad.bg, fg: ad.fg, border: ad.border, size: 75 }), [ad]);
  useEffect(() => {
    const dummy = new Object3D();
    const m = ref.current;
    if (!m) return;
    spots.forEach((it, i) => {
      dummy.position.set(it.x + Math.sin(it.ry) * 0.17, it.y, it.z + Math.cos(it.ry) * 0.17);
      dummy.rotation.set(0, it.ry, 0);
      dummy.scale.set(it.sx, it.sy, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
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

function RoofBillboards({ items }: { items: Placed[] }) {
  const dn = useDayNight();
  const backs = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const lampMat = useRef<MeshStandardMaterial>(null);
  const byAd = useMemo(() => {
    const groups: Placed[][] = BILLBOARD_ADS.map(() => []);
    items.forEach((it, i) => groups[i % BILLBOARD_ADS.length].push(it));
    return groups;
  }, [items]);
  useEffect(() => {
    const dummy = new Object3D();
    const b = backs.current;
    const l = legs.current;
    const lp = lamps.current;
    if (!b || !l || !lp) return;
    items.forEach((it, i) => {
      const nx = Math.sin(it.ry);
      const nz = Math.cos(it.ry);
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.ry, 0);
      dummy.scale.set(it.sx + 0.3, it.sy + 0.3, 0.3);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      const legH = 2.6 - it.sy / 2;
      for (const side of [-1, 1]) {
        dummy.position.set(it.x + Math.cos(it.ry) * side * it.sx * 0.35, it.y - it.sy / 2 - legH / 2, it.z - Math.sin(it.ry) * side * it.sx * 0.35);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, legH, 1);
        dummy.updateMatrix();
        l.setMatrixAt(i * 2 + (side + 1) / 2, dummy.matrix);
      }
      dummy.position.set(it.x + nx * 0.35, it.y + it.sy / 2 + 0.12, it.z + nz * 0.35);
      dummy.rotation.set(0, it.ry, 0);
      dummy.scale.set(it.sx * 0.9, 0.08, 0.5);
      dummy.updateMatrix();
      lp.setMatrixAt(i, dummy.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    lp.instanceMatrix.needsUpdate = true;
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
    const cornice: Placed[] = [];
    const belt: Placed[] = [];
    const pil: Placed[] = [];
    const plat: Placed[] = [];
    const rail: Placed[] = [];
    const stair: Placed[] = [];
    const balc: Placed[] = [];
    const board: Placed[] = [];
    const door: Placed[] = [];
    const canopy: Placed[] = [];
    const stoop: Placed[] = [];
    const planter: Placed[] = [];
    const shrub: Placed[] = [];
    const planterColors = ["#2a2a30", "#5a4636", "#6e6a60", "#8a3a2a"];
    lots.forEach((l) => {
      const y0 = 0.4 + (l.y ?? 0);
      const top = y0 + l.h;
      cornice.push({ x: l.x, y: top - 0.35, z: l.z, sx: l.w + 0.9, sy: 0.7, sz: l.d + 0.9, ry: 0 });
      if (l.h > 12) cornice.push({ x: l.x, y: top - 1.3, z: l.z, sx: l.w + 0.5, sy: 0.3, sz: l.d + 0.5, ry: 0 });
      const lum = l.color.r * 0.299 + l.color.g * 0.587 + l.color.b * 0.114;
      const glass = lum < 0.2;
      if (l.y) return;
      for (let y = y0 + 7.5; y < top - 4; y += 7.5) belt.push({ x: l.x, y, z: l.z, sx: l.w + 0.45, sy: 0.28, sz: l.d + 0.45, ry: 0 });
      const sides: [number, number, number, number][] = [
        [l.x, l.z + l.d / 2, 0, l.w],
        [l.x, l.z - l.d / 2, Math.PI, l.w],
        [l.x + l.w / 2, l.z, Math.PI / 2, l.d],
        [l.x - l.w / 2, l.z, -Math.PI / 2, l.d],
      ];
      if (!glass && l.w > 7) {
        sides.forEach(([sx, sz, ry, len]) => {
          const cols = Math.max(1, Math.round(len / 4.6));
          for (let k = 0; k <= cols; k++) {
            const t = -len / 2 + (k / cols) * len;
            const px = sx + Math.cos(ry) * t + Math.sin(ry) * 0.2;
            const pz = sz - Math.sin(ry) * t + Math.cos(ry) * 0.2;
            pil.push({ x: px, y: y0 + l.h / 2 + 0.4, z: pz, sx: 0.5, sy: l.h - 1.2, sz: 0.5, ry });
          }
        });
      }
      const style = rand();
      if (!glass && style < 0.32 && l.h > 9) {
        const [sx, sz, ry, len] = sides[Math.floor(rand() * 2) + 2];
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
      if (rand() < 0.18 && l.h > 8) {
        const ry = rand() < 0.5 ? 0 : Math.PI / 2;
        const w = Math.min(l.w, l.d) * 0.7;
        board.push({ x: l.x, y: top + 2.6, z: l.z, sx: w, sy: w * 0.36, sz: 0.3, ry });
      }
      sides.slice(0, 2).forEach(([sx, sz, ry]) => {
        if (rand() < 0.35) return;
        const nx = Math.sin(ry);
        const nz = Math.cos(ry);
        door.push({ x: sx + nx * 0.2, y: 0.4 + 1.5, z: sz + nz * 0.2, sx: 2.2, sy: 3, sz: 0.3, ry });
        canopy.push({ x: sx + nx * 1.1, y: 0.4 + 3.3, z: sz + nz * 1.1, sx: 3.2, sy: 0.2, sz: 1.8, ry });
        stoop.push({ x: sx + nx * 0.85, y: 0.4 + 0.16, z: sz + nz * 0.85, sx: 3, sy: 0.32, sz: 1.5, ry });
        if (rand() < 0.45) {
          const color = new Color(pick(rand, planterColors));
          for (const side of [-1, 1]) {
            const ox = Math.cos(ry) * side * 2.1 + nx * 0.75;
            const oz = -Math.sin(ry) * side * 2.1 + nz * 0.75;
            planter.push({ x: sx + ox, y: 0.4 + 0.3, z: sz + oz, sx: 0.7, sy: 0.6, sz: 0.7, ry, color });
            shrub.push({ x: sx + ox, y: 0.4 + 0.95, z: sz + oz, sx: 0.8, sy: 0.7, sz: 0.8, ry: rand() * 6.28 });
          }
        }
      });
    });
    return { cornice, belt, pil, plat, rail, stair, balc, board, door, canopy, stoop, planter, shrub };
  }, [lots]);

  useEffect(() => {
    const dummy = new Object3D();
    const sets: [InstancedMesh | null, typeof data.cornice][] = [
      [cornices.current, data.cornice],
      [belts.current, data.belt],
      [pilasters.current, data.pil],
      [platforms.current, data.plat],
      [rails.current, data.rail],
      [stairs.current, data.stair],
      [balconies.current, data.balc],
      [doors.current, data.door],
      [canopies.current, data.canopy],
      [stoops.current, data.stoop],
      [planters.current, data.planter],
      [shrubs.current, data.shrub],
    ];
    for (const [m, items] of sets) {
      if (!m) continue;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(it.rx ?? 0, it.ry, 0);
        dummy.scale.set(it.sx, it.sy, it.sz);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        if (it.color) m.setColorAt(i, it.color);
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
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

export default function Buildings() {
  const { city, outskirts, windsor } = useMemo(() => buildLots(), []);
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  return (
    <group ref={root}>
      <InstancedLots lots={city} />
      <InstancedLots lots={outskirts} winSize={[2.2, 2.6]} />
      <InstancedLots lots={windsor} winSize={[2.2, 2.6]} />
      <ContactShadows lots={city} />
      <RoofDetails lots={city} />
      <StreetLevel lots={city} />
      <Facades lots={city} />
    </group>
  );
}
