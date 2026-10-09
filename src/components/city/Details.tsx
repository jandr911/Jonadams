"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CapsuleGeometry, Color, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useDayNight } from "./DayNightContext";
import MacArthurBridge from "./MacArthurBridge";
import {
  BLOCK,
  CITY_HALF_X,
  CITY_HALF_Z,
  PITCH,
  RIVER_FAR,
  RIVER_NEAR,
  WOODWARD_INDEX,
  allBlocks,
  lightIsAmber,
  lightIsGreen,
  blockCenter,
  outerRoadLinesX,
  outerRoadLinesZ,
  roadLinesX,
} from "./layout";
import NeonSign from "./NeonSign";
import { RESERVED_BLOCKS } from "./Buildings";
import People from "./People";
import StreetFurniture from "./StreetFurniture";
import { mulberry32, pick, range } from "./rng";

function TrafficLights() {
  const poles = useRef<InstancedMesh>(null);
  const housings = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; z: number; rot: number; axis: "x" | "z"; ix: number; iz: number }[] = [];
    const xs = outerRoadLinesX();
    const zs = outerRoadLinesZ();
    xs.forEach((x, i) => {
      zs.forEach((z, j) => {
        out.push({ x: x + 3.2, z: z - 3.2, rot: 0, axis: "z", ix: i, iz: j });
        out.push({ x: x - 3.2, z: z + 3.2, rot: Math.PI / 2, axis: "x", ix: i, iz: j });
      });
    });
    return out;
  }, []);
  useEffect(() => {
    const p = poles.current;
    const h = housings.current;
    if (!p || !h) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 2.6, it.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      p.setMatrixAt(i, dummy.matrix);
      dummy.position.set(it.x, 4.8, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
    });
    p.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  const red = useMemo(() => new Color("#ff2a3c").multiplyScalar(1.6), []);
  const green = useMemo(() => new Color("#2aff7a").multiplyScalar(1.6), []);
  const amber = useMemo(() => new Color("#ffb02e").multiplyScalar(1.6), []);
  const lastTick = useRef(-1);
  useFrame(({ clock }) => {
    const l = lamps.current;
    if (!l) return;
    const time = clock.elapsedTime;
    const tick = Math.floor(time * 4);
    if (tick === lastTick.current) return;
    lastTick.current = tick;
    items.forEach((it, i) => {
      const isGreen = lightIsGreen(it.axis, it.ix, it.iz, time);
      const isAmber = !isGreen && lightIsAmber(it.axis, it.ix, it.iz, time);
      l.setColorAt(i, isGreen ? green : isAmber ? amber : red);
      dummy.position.set(it.x + Math.sin(it.rot) * 0.27, 4.8 + (isGreen ? -0.4 : isAmber ? 0 : 0.4), it.z + Math.cos(it.rot) * 0.27);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
    });
    l.instanceMatrix.needsUpdate = true;
    if (l.instanceColor) l.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, items.length]}>
        <cylinderGeometry args={[0.1, 0.12, 5.2, 5]} />
        <meshStandardMaterial color="#3a3a58" />
      </instancedMesh>
      <instancedMesh ref={housings} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.5, 1.3, 0.5]} />
        <meshStandardMaterial color="#1f1f28" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, items.length]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function StreetBanners() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const x = roadLinesX()[WOODWARD_INDEX];
    const out: { z: number; side: number; color: Color }[] = [];
    const palette = [new Color("#c8102e"), new Color("#d6b56e"), new Color("#1d2a6a")];
    for (let z = -CITY_HALF_Z + 8; z < CITY_HALF_Z; z += 9) {
      if (Math.abs(((z + CITY_HALF_Z) % 27) - 13.5) > 11) continue;
      out.push({ z, side: 1, color: palette[Math.floor((z + 500) / 9) % 3] });
      out.push({ z, side: -1, color: palette[Math.floor((z + 500) / 9 + 1) % 3] });
    }
    return out.map((o) => ({ ...o, x }));
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x + it.side * 0.9, 4.6, it.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, it.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items, dummy]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.08, 2.6, 1.1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

const GULL_BODY = new CapsuleGeometry(0.14, 0.7, 3, 6).rotateX(Math.PI / 2);
const GULL_WING_LEFT = new BoxGeometry(1.2, 0.04, 0.42).translate(-0.65, 0, 0);
const GULL_WING_RIGHT = new BoxGeometry(1.2, 0.04, 0.42).translate(0.65, 0, 0);

function Gulls() {
  const body = useRef<InstancedMesh>(null);
  const wingL = useRef<InstancedMesh>(null);
  const wingR = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const flock = useMemo(() => {
    const rand = mulberry32(8);
    return Array.from({ length: 28 }, () => ({
      ox: range(rand, -40, 40),
      oy: range(rand, -6, 6),
      oz: range(rand, -20, 20),
      flap: rand() * 10,
      speed: range(rand, 0.8, 1.2),
      s: range(rand, 0.8, 1.2),
    }));
  }, []);
  useFrame(({ clock }) => {
    const b = body.current;
    const l = wingL.current;
    const r = wingR.current;
    if (!b || !l || !r) return;
    const t = clock.elapsedTime;
    const cx = Math.sin(t * 0.05) * 260;
    const cz = RIVER_NEAR + 20 + Math.cos(t * 0.05) * 30;
    const heading = Math.cos(t * 0.05) > 0 ? 0 : Math.PI;
    flock.forEach((g, i) => {
      const flap = Math.sin(t * 9 + g.flap) * 0.7;
      const y = 26 + g.oy + Math.sin(t * g.speed + g.flap) * 1.2;
      dummy.position.set(cx + g.ox, y, cz + g.oz);
      dummy.rotation.set(0, heading + Math.PI / 2, 0);
      dummy.scale.setScalar(g.s);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, heading + Math.PI / 2, flap);
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, heading + Math.PI / 2, -flap);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    r.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={body} args={[GULL_BODY, undefined, flock.length]} frustumCulled={false}>
        <meshStandardMaterial color="#f4f1ea" />
      </instancedMesh>
      <instancedMesh ref={wingL} args={[GULL_WING_LEFT, undefined, flock.length]} frustumCulled={false}>
        <meshStandardMaterial color="#e8e2d2" side={2} />
      </instancedMesh>
      <instancedMesh ref={wingR} args={[GULL_WING_RIGHT, undefined, flock.length]} frustumCulled={false}>
        <meshStandardMaterial color="#e8e2d2" side={2} />
      </instancedMesh>
    </group>
  );
}

const ROOF_SIGNS = [
  { text: "MOTOR CITY", color: "#ffb02e", block: [1, 2] as [number, number] },
  { text: "313", color: "#49f2d6", block: [7, 3] as [number, number] },
  { text: "WOODWARD", color: "#ff4fa3", block: [4, 2] as [number, number] },
  { text: "BUILT IN DETROIT", color: "#9dff57", block: [6, 3] as [number, number] },
  { text: "HITSVILLE", color: "#c9a6ff", block: [1, 1] as [number, number] },
  { text: "EASTERN MARKET", color: "#ff8a3a", block: [8, 2] as [number, number] },
];

function RooftopSigns() {
  const signs = useMemo(() => {
    const rand = mulberry32(5);
    return ROOF_SIGNS.filter((s) => !RESERVED_BLOCKS.has(`${s.block[0]},${s.block[1]}`)).map((s) => {
      const [x, z] = blockCenter(s.block[0], s.block[1]);
      return { ...s, x, z, h: range(rand, 22, 34), w: Math.max(10, s.text.length * 1.4) };
    });
  }, []);
  return (
    <group>
      {signs.map((s) => (
        <group key={s.text} position={[s.x, s.h, s.z]}>
          {[-s.w / 2 + 1, s.w / 2 - 1].map((px) => (
            <mesh key={px} position={[px, -2.2, 0]}>
              <cylinderGeometry args={[0.18, 0.22, 4.4, 6]} />
              <meshStandardMaterial color="#3a3a58" />
            </mesh>
          ))}
          <NeonSign text={s.text} color={s.color} width={s.w} height={3.2} fontSize={2.2} doubleSided depth={0.5} blink="marquee" />
        </group>
      ))}
    </group>
  );
}

function WindsorTower() {
  const dn = useDayNight();
  const crown = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (crown.current) crown.current.emissiveIntensity = 0.4 + dn.night * 2.6;
  }, [dn]);
  return (
    <group position={[240, 0, RIVER_FAR + 40]}>
      <mesh position={[0, 20, 0]}>
        <boxGeometry args={[18, 40, 14]} />
        <meshStandardMaterial color="#2a3a5c" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 40.6, 0]}>
        <boxGeometry args={[19, 1.2, 15]} />
        <meshStandardMaterial ref={crown} color="#d6b56e" emissive="#d6b56e" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 12, 0]}>
        <boxGeometry args={[19, 0.6, 15]} />
        <meshStandardMaterial color="#d6b56e" emissive="#d6b56e" emissiveIntensity={1} toneMapped={false} />
      </mesh>
    </group>
  );
}

const SLABS: { x: number; z: number; w: number; d: number; h: number; rot: number }[] = [
  { x: -CITY_HALF_X - 70, z: -CITY_HALF_Z + 30, w: 34, d: 10, h: 26, rot: 0.3 },
  { x: -CITY_HALF_X - 100, z: -CITY_HALF_Z - 40, w: 34, d: 10, h: 30, rot: 0.3 },
  { x: CITY_HALF_X + 70, z: -CITY_HALF_Z + 10, w: 34, d: 10, h: 26, rot: -0.25 },
  { x: CITY_HALF_X + 105, z: -CITY_HALF_Z - 60, w: 34, d: 10, h: 32, rot: -0.25 },
  { x: -40, z: -CITY_HALF_Z - 70, w: 40, d: 10, h: 28, rot: 0 },
  { x: 60, z: -CITY_HALF_Z - 110, w: 40, d: 10, h: 24, rot: 0.1 },
];

function ResidentialSlabs() {
  const balconies = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; y: number; z: number; rot: number }[] = [];
    SLABS.forEach((s) => {
      const cols = Math.floor(s.w / 3.2);
      const floors = Math.floor((s.h - 3) / 3);
      for (let f = 1; f <= floors; f++) {
        for (let c = 0; c < cols; c++) {
          const lx = -s.w / 2 + 1.6 + c * 3.2;
          const ly = f * 3;
          for (const side of [1, -1]) {
            const px = s.x + Math.cos(s.rot) * lx - Math.sin(s.rot) * side * (s.d / 2 + 0.6);
            const pz = s.z - Math.sin(s.rot) * lx - Math.cos(s.rot) * side * (s.d / 2 + 0.6);
            out.push({ x: px, y: ly, z: pz, rot: s.rot });
          }
        }
      }
    });
    return out;
  }, []);
  useEffect(() => {
    const m = balconies.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  return (
    <group>
      {SLABS.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2, s.z]} rotation={[0, s.rot, 0]} castShadow>
          <boxGeometry args={[s.w, s.h, s.d]} />
          <meshStandardMaterial color="#8c8678" roughness={0.95} />
        </mesh>
      ))}
      <instancedMesh ref={balconies} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[2.6, 0.9, 1.2]} />
        <meshStandardMaterial color="#6e6a60" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function Clotheslines() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const rand = mulberry32(2222);
    const colors = ["#f4f1ea", "#c8102e", "#2a3a7a", "#d6b56e", "#3f8a6a", "#9a95a8", "#ff8a3a"];
    const out: { x: number; y: number; z: number; color: Color }[] = [];
    SLABS.forEach((s) => {
      for (let k = 0; k < 10; k++) {
        const lx = -s.w / 2 + 2 + rand() * (s.w - 4);
        const ly = 3 + Math.floor(rand() * ((s.h - 3) / 3)) * 3 + 1.4;
        const px = s.x + Math.cos(s.rot) * lx - Math.sin(s.rot) * (s.d / 2 + 1.2);
        const pz = s.z - Math.sin(s.rot) * lx - Math.cos(s.rot) * (s.d / 2 + 1.2);
        out.push({ x: px, y: ly, z: pz, color: new Color(pick(rand, colors)) });
      }
    });
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, it.color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items, dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.7, 0.9, 0.06]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </instancedMesh>
  );
}

function SatelliteDishes() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const rand = mulberry32(31);
    const out: { x: number; y: number; z: number; rot: number }[] = [];
    for (const { c, r, outer } of allBlocks()) {
      {
        if (!outer && RESERVED_BLOCKS.has(`${c},${r}`)) continue;
        const [bx, bz] = blockCenter(c, r);
        const n = 2 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          const side = rand() < 0.5 ? 1 : -1;
          out.push({ x: bx + (rand() - 0.5) * (BLOCK - 6), y: 4 + rand() * 12, z: bz + side * (BLOCK / 2 - 1.7), rot: side > 0 ? 0 : Math.PI });
        }
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(-0.5, it.rot, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <sphereGeometry args={[0.55, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
      <meshStandardMaterial color="#d8d8e0" roughness={0.5} metalness={0.3} side={2} />
    </instancedMesh>
  );
}

const POLE_EDGE = 10.7;

function UtilityPoles() {
  const poles = useRef<InstancedMesh>(null);
  const wires = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    const northKerb = -CITY_HALF_Z - PITCH / 2 + POLE_EDGE;
    for (let x = -CITY_HALF_X - 60; x <= CITY_HALF_X + 60; x += 16) {
      out.push({ x, z: northKerb });
    }
    const xs = [-CITY_HALF_X - PITCH / 2 + POLE_EDGE, CITY_HALF_X + PITCH / 2 - POLE_EDGE];
    for (let z = -CITY_HALF_Z; z <= CITY_HALF_Z; z += 16) {
      xs.forEach((x) => out.push({ x, z }));
    }
    return out;
  }, []);
  useEffect(() => {
    const p = poles.current;
    const w = wires.current;
    if (!p || !w) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 4.5, it.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      p.setMatrixAt(i, dummy.matrix);
      const next = items[i + 1];
      if (next && Math.hypot(next.x - it.x, next.z - it.z) < 20) {
        dummy.position.set((it.x + next.x) / 2, 8.4, (it.z + next.z) / 2);
        dummy.rotation.set(0, Math.atan2(next.x - it.x, next.z - it.z), 0);
        dummy.scale.set(1, 1, Math.hypot(next.x - it.x, next.z - it.z));
      } else {
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      w.setMatrixAt(i, dummy.matrix);
    });
    p.instanceMatrix.needsUpdate = true;
    w.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, items.length]}>
        <cylinderGeometry args={[0.16, 0.2, 9, 6]} />
        <meshStandardMaterial color="#5a4636" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={wires} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.05, 0.05, 1]} />
        <meshStandardMaterial color="#1d1d2a" />
      </instancedMesh>
    </group>
  );
}

export default function Details() {
  return (
    <group>
      <People />
      <StreetFurniture />
      <TrafficLights />
      <StreetBanners />
      <Gulls />
      <RooftopSigns />
      <MacArthurBridge />
      <WindsorTower />
      <ResidentialSlabs />
      <Clotheslines />
      <SatelliteDishes />
      <UtilityPoles />
    </group>
  );
}
