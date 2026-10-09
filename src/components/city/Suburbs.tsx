"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, InstancedBufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useBaseBoxGeometry } from "./instancing";
import { useWindowMaterial } from "./useWindowMaterial";
import { useDayNight } from "./DayNightContext";
import { AMBASSADOR_CLEAR_HALF, AMBASSADOR_RAMP_Z, AMBASSADOR_X, CITY_HALF_X, CITY_HALF_Z, OUTER_HALF_X, OUTER_MIN_Z, RIVER_FAR, RIVER_NEAR, ROAD } from "./layout";
import { mulberry32, pick, range } from "./rng";
import { CROWN_PINE, TRUNK_COLOR, useCrownGeometry } from "./trees";
import VehicleFleet, { type FleetItem, type PoseFn, type VehiclePose } from "./VehicleFleet";
import { FLEET_COLORS, type VehicleKind } from "./vehicles";

const EXTENT = 1650;
const LOT = 11;
const STREET = 62;
const RING = 400;
const HOUSE_COLORS = ["#8a4a3a", "#b07a5a", "#c9b48c", "#9a95a8", "#5a6a7a", "#7c6a5c", "#a3563f", "#e8e2d2", "#6e5a4a", "#3f4e66"];
const ROOF_COLORS = ["#3a3230", "#4a3a38", "#2c3038", "#5a4a3a"];
const MID_COLORS = ["#8a4a3a", "#a3563f", "#b89a7a", "#9c8468", "#5a6a7a", "#3f4e66", "#7c6a5c", "#1a2238", "#c9b48c"];
const LOFT_COLORS = ["#8a4a3a", "#a3563f", "#7c6a5c", "#6e5a4a", "#9c8468", "#5a6a7a", "#c9b48c"];
const SHED_COLORS = ["#9a95a8", "#7c6a5c", "#5a6a7a"];
const LAWN = new Color("#3f6a42");
const PATH = new Color("#5d5680");
const RIVERWALK_HALF = CITY_HALF_X + 40;
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
  lit: boolean;
}

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

function buildRiverfront(rand: () => number, trees: { x: number; z: number; s: number }[], midrise: MidLot[], banks: Bank[]) {
  const streets = riverStreets();
  const nearBank = { z0: streets.near + ROAD / 2 + 0.5, z1: RIVER_NEAR - 5 };
  const farBank = { z0: RIVER_FAR + 5, z1: streets.far - ROAD / 2 - 0.5 };
  const path = (x: number, z: number, w: number) => banks.push({ x, y: 0.2, z, w, h: 0.5, d: 3, color: PATH });
  for (let x = -EXTENT; x < EXTENT; x += STREET) {
    const cx = x + STREET / 2;
    if (!insideDowntown(cx, nearBank.z0)) {
      banks.push(lawnRect(cx, nearBank.z0, nearBank.z1, STREET - 4));
      let built = false;
      if (cx > 0 && cx < LOFT_REACH) {
        for (const ox of [-14, 14]) {
          midrise.push({ x: cx + ox, z: nearBank.z0 + 9, w: 26, d: 16, h: range(rand, 7, 13), color: new Color(pick(rand, LOFT_COLORS)), seed: rand() * 100 });
        }
        built = true;
      } else if (cx < 0 && cx > -LOFT_REACH) {
        midrise.push({ x: cx, z: nearBank.z0 + 11, w: 46, d: 18, h: range(rand, 6, 9), color: new Color(pick(rand, SHED_COLORS)), seed: rand() * 100 });
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
  trees: { x: number; z: number; s: number }[];
  midrise: MidLot[];
  pads: { x: number; z: number }[];
  banks: Bank[];
} {
  const rand = mulberry32(90210);
  const houses: House[] = [];
  const trees: { x: number; z: number; s: number }[] = [];
  const midrise: MidLot[] = [];
  const pads: { x: number; z: number }[] = [];
  const banks: Bank[] = [];
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
      for (let row = 0; row < 2; row++) {
        for (let k = 0; k < 5; k++) {
          const hx = x + 8 + k * LOT + (rand() - 0.5) * 1.5;
          const hz = z + 11 + row * 38 + (rand() - 0.5) * 2;
          if (rand() < 0.04) continue;
          houses.push({
            x: hx,
            z: hz,
            rot: row === 0 ? 0 : Math.PI,
            s: range(rand, 0.85, 1.2),
            h: range(rand, 3.4, 5.4),
            color: new Color(pick(rand, HOUSE_COLORS)),
            roof: new Color(pick(rand, ROOF_COLORS)),
            lit: rand() < 0.45,
          });
          if (rand() < 0.5) trees.push({ x: hx + (rand() - 0.5) * 6, z: hz + (row === 0 ? 7.5 : -7.5) + (rand() - 0.5) * 3, s: range(rand, 0.8, 1.4) });
        }
      }
    }
  }
  buildRiverfront(rand, trees, midrise, banks);
  return { houses, trees, midrise, pads, banks };
}

function Banks({ banks }: { banks: Bank[] }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const dummy = new Object3D();
    const m = ref.current;
    if (!m) return;
    banks.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, b.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [banks]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, banks.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

function Houses({ houses, pads }: { houses: House[]; pads: { x: number; z: number }[] }) {
  const dn = useDayNight();
  const bodies = useRef<InstancedMesh>(null);
  const roofs = useRef<InstancedMesh>(null);
  const windows = useRef<InstancedMesh>(null);
  const yards = useRef<InstancedMesh>(null);
  const padMesh = useRef<InstancedMesh>(null);
  const winMat = useRef<MeshStandardMaterial>(null);
  const litHouses = useMemo(() => houses.filter((h) => h.lit), [houses]);
  useEffect(() => {
    const dummy = new Object3D();
    const b = bodies.current;
    const r = roofs.current;
    const w = windows.current;
    const y = yards.current;
    const p = padMesh.current;
    if (!b || !r || !w || !y || !p) return;
    houses.forEach((h, i) => {
      dummy.position.set(h.x, h.h / 2 - 0.1, h.z);
      dummy.rotation.set(0, h.rot, 0);
      dummy.scale.set(h.s, h.h, h.s);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      b.setColorAt(i, h.color);
      dummy.position.set(h.x, h.h - 0.1 + 1.4 * h.s, h.z);
      dummy.rotation.set(0, h.rot + Math.PI / 4, 0);
      dummy.scale.set(h.s, h.s, h.s);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
      r.setColorAt(i, h.roof);
    });
    litHouses.forEach((h, i) => {
      dummy.position.set(h.x, 1.6, h.z);
      dummy.rotation.set(0, h.rot, 0);
      dummy.scale.set(h.s, 1, 1);
      dummy.translateZ(3.6 * h.s);
      dummy.updateMatrix();
      w.setMatrixAt(i, dummy.matrix);
    });
    houses.forEach((h, i) => {
      dummy.position.set(h.x, -0.02, h.z);
      dummy.rotation.set(0, h.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      y.setMatrixAt(i, dummy.matrix);
    });
    pads.forEach((pd, i) => {
      dummy.position.set(pd.x, -0.05, pd.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      p.setMatrixAt(i, dummy.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    r.instanceMatrix.needsUpdate = true;
    w.instanceMatrix.needsUpdate = true;
    y.instanceMatrix.needsUpdate = true;
    p.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    if (r.instanceColor) r.instanceColor.needsUpdate = true;
  }, [houses, litHouses, pads]);
  useEffect(() => {
    if (winMat.current) winMat.current.emissiveIntensity = 0.1 + dn.night * 2.2;
  }, [dn]);
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, houses.length]}>
        <boxGeometry args={[6, 1, 7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, houses.length]}>
        <coneGeometry args={[4.9, 2.8, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={windows} args={[undefined, undefined, litHouses.length]}>
        <boxGeometry args={[2.2, 1.1, 0.15]} />
        <meshStandardMaterial ref={winMat} color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={yards} args={[undefined, undefined, houses.length]}>
        <boxGeometry args={[10, 0.06, 12]} />
        <meshStandardMaterial color="#3f6a42" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={padMesh} args={[undefined, undefined, pads.length]}>
        <boxGeometry args={[STREET - 7, 0.08, STREET - 7]} />
        <meshStandardMaterial color="#4f515c" roughness={1} />
      </instancedMesh>
    </group>
  );
}

function MidRise({ lots }: { lots: MidLot[] }) {
  const mat = useWindowMaterial({ winSize: [2, 2.4], glow: 0.08 });
  const lotGeometry = useBaseBoxGeometry();
  const ref = useRef<InstancedMesh>(null);
  const seeds = useMemo(() => new Float32Array(lots.map((l) => l.seed)), [lots]);
  useEffect(() => {
    const dummy = new Object3D();
    const m = ref.current;
    if (!m) return;
    lots.forEach((l, i) => {
      dummy.position.set(l.x, 0, l.z);
      dummy.scale.set(l.w, l.h, l.d);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, l.color);
    });
    m.geometry.setAttribute("aSeed", new InstancedBufferAttribute(seeds, 1));
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [lots, seeds]);
  return (
    <instancedMesh ref={ref} args={[lotGeometry, mat, lots.length]} />
  );
}

function SuburbTrees({ trees }: { trees: { x: number; z: number; s: number }[] }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  const crownGeo = useCrownGeometry(2.1, 23, "far");
  useEffect(() => {
    const dummy = new Object3D();
    const t = trunks.current;
    const c = crowns.current;
    if (!t || !c) return;
    trees.forEach((tr, i) => {
      dummy.position.set(tr.x, 1.2 * tr.s, tr.z);
      dummy.scale.set(tr.s, tr.s, tr.s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      t.setMatrixAt(i, dummy.matrix);
      dummy.position.set(tr.x, 3.4 * tr.s, tr.z);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
    });
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
  }, [trees]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}>
        <cylinderGeometry args={[0.2, 0.3, 2.4, 5]} />
        <meshStandardMaterial color={TRUNK_COLOR} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[crownGeo, undefined, trees.length]}>
        <meshStandardMaterial color={CROWN_PINE} roughness={1} />
      </instancedMesh>
    </group>
  );
}

function SuburbStreets() {
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(() => {
    const out: { x: number; z: number; rot: number; len: number }[] = [];
    const northEnd = CITY_HALF_Z - 8;
    const southStart = RIVER_FAR + 14;
    for (let v = -EXTENT; v <= EXTENT; v += STREET) {
      out.push({ x: v, z: (-EXTENT + northEnd) / 2, rot: 0, len: northEnd + EXTENT });
      out.push({ x: v, z: (southStart + EXTENT) / 2, rot: 0, len: EXTENT - southStart });
      if (!isRiver(v)) out.push({ x: 0, z: v, rot: Math.PI / 2, len: EXTENT * 2 });
    }
    return out;
  }, []);
  useEffect(() => {
    const dummy = new Object3D();
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, -0.06, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(1, 1, it.len);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>
      <boxGeometry args={[7, 0.1, 1]} />
      <meshStandardMaterial color="#2c2c38" roughness={1} />
    </instancedMesh>
  );
}

const FREEWAY_X = OUTER_HALF_X + 42;
const FREEWAY_Z0 = -EXTENT;
const FREEWAY_Z1 = CITY_HALF_Z - 10;
const FREEWAY_Y = 7;

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
    const dt = f.last < 0 ? 0 : Math.min(time - f.last, 0.05);
    f.last = time;
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
    const dummy = new Object3D();
    const p = pylons.current;
    const l = lamps.current;
    if (!p || !l) return;
    for (let i = 0; i < pylonCount; i++) {
      const z = FREEWAY_Z0 + i * 40;
      dummy.position.set(FREEWAY_X, FREEWAY_Y / 2 - 0.5, z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      p.setMatrixAt(i, dummy.matrix);
      dummy.position.set(FREEWAY_X + (i % 2 ? 7.5 : -7.5), FREEWAY_Y + 6, z + 20);
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
    }
    p.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
  }, [pylonCount]);
  useEffect(() => {
    if (lampMat.current) lampMat.current.emissiveIntensity = 0.2 + dn.night * 2.6;
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
        <meshStandardMaterial color="#4a4a58" roughness={1} />
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

function Riverbank() {
  return (
    <group>
      <mesh position={[0, 0.3, RIVER_FAR + 2]}>
        <boxGeometry args={[7000, 1.2, 4]} />
        <meshStandardMaterial color="#2f2a4a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.3, RIVER_NEAR - 2]}>
        <boxGeometry args={[7000, 1.2, 4]} />
        <meshStandardMaterial color="#2f2a4a" roughness={1} />
      </mesh>
    </group>
  );
}

const TILES_PER_SIDE = 4;

interface Tile {
  houses: House[];
  pads: { x: number; z: number }[];
  trees: { x: number; z: number; s: number }[];
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

export default function Suburbs() {
  const world = useMemo(() => buildHouses(), []);
  const tiles = useMemo(() => tileWorld(world), [world]);
  return (
    <group>
      <WindsorShore />
      <Riverbank />
      <SuburbStreets />
      {tiles.map((t, i) => (
        <Fragment key={i}>
          {t.banks.length > 0 && <Banks banks={t.banks} />}
          {t.houses.length > 0 && <Houses houses={t.houses} pads={t.pads} />}
          {t.trees.length > 0 && <SuburbTrees trees={t.trees} />}
        </Fragment>
      ))}
      <MidRise lots={world.midrise} />
      <Freeway />
    </group>
  );
}
