"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedBufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useWindowMaterial } from "./useWindowMaterial";
import { useDayNight } from "./DayNightContext";
import { CITY_HALF_Z, OUTER_HALF_X, OUTER_MIN_Z, RIVER_FAR, RIVER_NEAR } from "./layout";
import { mulberry32, pick, range } from "./rng";

const EXTENT = 1650;
const LOT = 11;
const STREET = 62;
const RING = 400;
const HOUSE_COLORS = ["#8a4a3a", "#b07a5a", "#c9b48c", "#9a95a8", "#5a6a7a", "#7c6a5c", "#a3563f", "#e8e2d2", "#6e5a4a", "#3f4e66"];
const ROOF_COLORS = ["#3a3230", "#4a3a38", "#2c3038", "#5a4a3a"];
const MID_COLORS = ["#8a4a3a", "#a3563f", "#b89a7a", "#9c8468", "#5a6a7a", "#3f4e66", "#7c6a5c", "#1a2238", "#c9b48c"];

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

function insideDowntown(x: number, z: number) {
  return Math.abs(x) < OUTER_HALF_X + 24 && z > OUTER_MIN_Z - 24 && z < RIVER_FAR + 14;
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

function buildHouses(): {
  houses: House[];
  trees: { x: number; z: number; s: number }[];
  midrise: MidLot[];
  pads: { x: number; z: number }[];
  lawns: { x: number; z: number }[];
} {
  const rand = mulberry32(90210);
  const houses: House[] = [];
  const trees: { x: number; z: number; s: number }[] = [];
  const midrise: MidLot[] = [];
  const pads: { x: number; z: number }[] = [];
  const lawns: { x: number; z: number }[] = [];
  for (let z = -EXTENT; z < EXTENT; z += STREET) {
    for (let x = -EXTENT; x < EXTENT; x += STREET) {
      const cx = x + STREET / 2;
      const cz = z + STREET / 2;
      if (blockTouchesRiver(cz) || insideDowntown(cx, cz)) continue;
      pads.push({ x: cx, z: cz });
      const windsorPark = cz > RIVER_FAR && cz < RIVER_FAR + 150 && Math.abs(cx) < 420;
      if (windsorPark) {
        for (let k = 0; k < 10; k++) trees.push({ x: cx + (rand() - 0.5) * (STREET - 10), z: cz + (rand() - 0.5) * (STREET - 10), s: range(rand, 1, 1.8) });
        lawns.push({ x: cx, z: cz });
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
  return { houses, trees, midrise, pads, lawns };
}

function Lawns({ lawns }: { lawns: { x: number; z: number }[] }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const dummy = new Object3D();
    const m = ref.current;
    if (!m) return;
    lawns.forEach((l, i) => {
      dummy.position.set(l.x, -0.02, l.z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [lawns]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lawns.length]}>
      <boxGeometry args={[STREET - 4, 0.08, STREET - 4]} />
      <meshStandardMaterial color="#3f6a42" roughness={1} />
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
    <instancedMesh ref={ref} args={[undefined, mat, lots.length]}>
      <boxGeometry args={[1, 1, 1]} onUpdate={(g) => g.translate(0, 0.5, 0)} />
    </instancedMesh>
  );
}

function SuburbTrees({ trees }: { trees: { x: number; z: number; s: number }[] }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
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
        <meshStandardMaterial color="#4a2e2a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]}>
        <icosahedronGeometry args={[2.1, 0]} />
        <meshStandardMaterial color="#2f7a50" roughness={0.9} flatShading />
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

function Freeway() {
  const dn = useDayNight();
  const pylons = useRef<InstancedMesh>(null);
  const cars = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const lightMat = useRef<MeshStandardMaterial>(null);
  const lamps = useRef<InstancedMesh>(null);
  const lampMat = useRef<MeshStandardMaterial>(null);
  const fleet = useMemo(() => {
    const rand = mulberry32(75);
    return Array.from({ length: 90 }, () => ({
      lane: pick(rand, [-5.2, -2.6, 2.6, 5.2]),
      z: range(rand, FREEWAY_Z0, FREEWAY_Z1),
      speed: range(rand, 18, 28),
      color: new Color(pick(rand, ["#f4f1ea", "#1d1d3f", "#c8102e", "#2a3a7a", "#9a95a8", "#d6b56e"])),
    }));
  }, []);
  const pylonCount = Math.floor((FREEWAY_Z1 - FREEWAY_Z0) / 40);
  useEffect(() => {
    const dummy = new Object3D();
    const p = pylons.current;
    const l = lamps.current;
    const c = cars.current;
    if (!p || !l || !c) return;
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
    fleet.forEach((f, i) => c.setColorAt(i, f.color));
    p.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
  }, [fleet, pylonCount]);
  useEffect(() => {
    if (lightMat.current) lightMat.current.emissiveIntensity = 0.3 + dn.night * 3;
    if (lampMat.current) lampMat.current.emissiveIntensity = 0.2 + dn.night * 2.6;
  }, [dn]);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    const c = cars.current;
    const lg = lights.current;
    if (!c || !lg) return;
    const step = Math.min(dt, 0.05);
    fleet.forEach((f, i) => {
      const dir = f.lane > 0 ? 1 : -1;
      f.z += f.speed * step * dir;
      if (f.z > FREEWAY_Z1) f.z = FREEWAY_Z0;
      if (f.z < FREEWAY_Z0) f.z = FREEWAY_Z1;
      dummy.position.set(FREEWAY_X + f.lane, FREEWAY_Y + 0.9, f.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
      dummy.position.set(FREEWAY_X + f.lane, FREEWAY_Y + 0.9, f.z + dir * 2.1);
      dummy.updateMatrix();
      lg.setMatrixAt(i, dummy.matrix);
    });
    c.instanceMatrix.needsUpdate = true;
    lg.instanceMatrix.needsUpdate = true;
  });
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
      <instancedMesh ref={cars} args={[undefined, undefined, fleet.length]}>
        <boxGeometry args={[1.9, 1.2, 4.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, fleet.length]}>
        <boxGeometry args={[1.7, 0.25, 0.12]} />
        <meshStandardMaterial ref={lightMat} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
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

export default function Suburbs() {
  const { houses, trees, midrise, pads, lawns } = useMemo(() => buildHouses(), []);
  return (
    <group>
      <WindsorShore />
      <Riverbank />
      <SuburbStreets />
      <Lawns lawns={lawns} />
      <Houses houses={houses} pads={pads} />
      <MidRise lots={midrise} />
      <SuburbTrees trees={trees} />
      <Freeway />
    </group>
  );
}
