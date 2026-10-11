"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoxGeometry, CapsuleGeometry, Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useDayNight } from "./DayNightContext";
import { fillColors, fillInstances } from "./instancing";
import MacArthurBridge from "./MacArthurBridge";
import {
  BLOCK,
  CITY_HALF_X,
  CITY_HALF_Z,
  KERB_PARK_OFFSET,
  PITCH,
  RIVER_FAR,
  RIVER_NEAR,
  WOODWARD_INDEX,
  allBlocks,
  isMedianLine,
  lightIsAmber,
  lightIsGreen,
  TRAFFIC_CLOCK,
  blockCenter,
  outerRoadLinesX,
  outerRoadLinesZ,
  roadLinesX,
} from "./layout";
import PaintedSign from "./PaintedSign";
import { RESERVED_BLOCKS } from "./Buildings";
import People from "./People";
import StreetFurniture from "./StreetFurniture";
import VehicleFleet, { type FleetItem, type PoseFn } from "./VehicleFleet";
import type { VehicleKind } from "./vehicles";
import { loopPose, newLoopPose } from "./loopPath";
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
    fillInstances(poles.current, items.length, (i, d) => d.position.set(items[i].x, 2.6, items[i].z));
    fillInstances(housings.current, items.length, (i, d) => {
      d.position.set(items[i].x, 4.8, items[i].z);
      d.rotation.set(0, items[i].rot, 0);
    });
  }, [items]);
  const red = useMemo(() => new Color("#ff2a3c").multiplyScalar(1.6), []);
  const green = useMemo(() => new Color("#2aff7a").multiplyScalar(1.6), []);
  const amber = useMemo(() => new Color("#ffb02e").multiplyScalar(1.6), []);
  const lastTick = useRef(-1);
  useFrame(() => {
    const l = lamps.current;
    if (!l) return;
    const time = TRAFFIC_CLOCK.time;
    const tick = Math.floor(time * 4);
    if (tick === lastTick.current) return;
    lastTick.current = tick;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const isGreen = lightIsGreen(it.axis, it.ix, it.iz, time);
      const isAmber = !isGreen && lightIsAmber(it.axis, it.ix, it.iz, time);
      l.setColorAt(i, isGreen ? green : isAmber ? amber : red);
      dummy.position.set(it.x + Math.sin(it.rot) * 0.27, 4.8 + (isGreen ? -0.4 : isAmber ? 0 : 0.4), it.z + Math.cos(it.rot) * 0.27);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
    }
    l.instanceMatrix.needsUpdate = true;
    if (l.instanceColor) l.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, items.length]}>
        <cylinderGeometry args={[0.1, 0.12, 5.2, 5]} />
        <meshStandardMaterial color="#3a3936" />
      </instancedMesh>
      <instancedMesh ref={housings} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.5, 1.3, 0.5]} />
        <meshStandardMaterial color="#1f1f28" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, items.length]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function StreetBanners() {
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(() => {
    const x = roadLinesX()[WOODWARD_INDEX];
    const out: { x: number; z: number; side: number; color: Color }[] = [];
    const palette = [new Color("#c8102e"), new Color("#d6b56e"), new Color("#1d2a6a")];
    for (let z = -CITY_HALF_Z + 8; z < CITY_HALF_Z; z += 9) {
      if (Math.abs(((z + CITY_HALF_Z) % PITCH) - PITCH / 2) > BLOCK / 2 + 1) continue;
      out.push({ x, z, side: 1, color: palette[Math.floor((z + 500) / 9) % 3] });
      out.push({ x, z, side: -1, color: palette[Math.floor((z + 500) / 9 + 1) % 3] });
    }
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    fillInstances(m, items.length, (i, d) => d.position.set(items[i].x + items[i].side * 0.9, 4.6, items[i].z));
    fillColors(m, items.length, (i) => items[i].color);
  }, [items]);
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

const GULL_STRAIGHT = 150;
const GULL_TURN_R = 22;
const GULL_LOOP_Z = (RIVER_NEAR + RIVER_FAR) / 2;
const GULL_SPEED = 11;
const GULL_BANK = 0.45;
const GULL_TURN_LEN = Math.PI * GULL_TURN_R;
const gullLoop = newLoopPose();
const gullPose = { x: 0, z: 0, yaw: 0, bank: 0 };

function gullBank(into: number) {
  return GULL_BANK * Math.min(1, into / 12, (GULL_TURN_LEN - into) / 12);
}

function gullPath(distance: number, lateral: number) {
  const loop = loopPose(distance, 2 * GULL_STRAIGHT, GULL_TURN_R, gullLoop, lateral);
  const p = gullPose;
  p.x = loop.a;
  p.z = GULL_LOOP_Z + loop.b;
  p.yaw = Math.atan2(loop.ha, loop.hb);
  p.bank = loop.leg % 2 === 1 ? gullBank(loop.into) : 0;
  return p;
}

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
      oz: range(rand, -12, 12),
      phase: rand() * 10,
      bobRate: range(rand, 0.8, 1.2),
      scale: range(rand, 0.8, 1.2),
    }));
  }, []);
  useFrame(({ clock }) => {
    const b = body.current;
    const l = wingL.current;
    const r = wingR.current;
    if (!b || !l || !r) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < flock.length; i++) {
      const g = flock[i];
      const pose = gullPath(t * GULL_SPEED + g.ox + Math.sin(t * 0.3 + g.phase) * 3, g.oz + Math.sin(t * 0.23 + g.phase * 2) * 2);
      const flap = Math.sin(t * 9 + g.phase) * 0.7;
      const y = 26 + g.oy + Math.sin(t * g.bobRate + g.phase) * 1.2;
      dummy.position.set(pose.x, y, pose.z);
      dummy.rotation.set(0, pose.yaw, pose.bank);
      dummy.scale.setScalar(g.scale);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, pose.yaw, pose.bank + flap);
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, pose.yaw, pose.bank - flap);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
    }
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
        <meshStandardMaterial color="#e8e2d2" side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={wingR} args={[GULL_WING_RIGHT, undefined, flock.length]} frustumCulled={false}>
        <meshStandardMaterial color="#e8e2d2" side={DoubleSide} />
      </instancedMesh>
    </group>
  );
}

const ROOF_SIGNS = [
  { text: "MOTOR CITY", bg: "#e6dbc2", fg: "#8f2a22", block: [1, 2] as [number, number] },
  { text: "313", bg: "#1f2a3a", fg: "#e6dbc2", block: [7, 3] as [number, number] },
  { text: "WOODWARD", bg: "#2f4a3a", fg: "#e6dbc2", block: [4, 3] as [number, number] },
  { text: "BUILT IN DETROIT", bg: "#e6dbc2", fg: "#1f1d1b", block: [6, 3] as [number, number] },
  { text: "HITSVILLE", bg: "#1f3a6a", fg: "#f4f1ea", block: [1, 1] as [number, number] },
  { text: "EASTERN MARKET", bg: "#8f2a22", fg: "#e6dbc2", block: [8, 2] as [number, number] },
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
              <meshStandardMaterial color="#3a3936" />
            </mesh>
          ))}
          <PaintedSign text={s.text} bg={s.bg} fg={s.fg} width={s.w} height={3.2} doubleSided depth={0.5} />
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
    fillInstances(balconies.current, items.length, (i, d) => {
      d.position.set(items[i].x, items[i].y, items[i].z);
      d.rotation.set(0, items[i].rot, 0);
    });
  }, [items]);
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
    fillInstances(m, items.length, (i, d) => d.position.set(items[i].x, items[i].y, items[i].z));
    fillColors(m, items.length, (i) => items[i].color);
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[0.7, 0.9, 0.06]} />
      <meshStandardMaterial color="#ffffff" roughness={1} />
    </instancedMesh>
  );
}

function SatelliteDishes() {
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(() => {
    const rand = mulberry32(31);
    const out: { x: number; y: number; z: number; rot: number }[] = [];
    for (const { c, r } of allBlocks()) {
      const reserved = RESERVED_BLOCKS.has(`${c},${r}`);
      const [bx, bz] = blockCenter(c, r);
      const n = 2 + Math.floor(rand() * 4);
      for (let k = 0; k < n; k++) {
        const side = rand() < 0.5 ? 1 : -1;
        const item = { x: bx + (rand() - 0.5) * (BLOCK - 6), y: 4 + rand() * 12, z: bz + side * (BLOCK / 2 - 1.7), rot: side > 0 ? 0 : Math.PI };
        if (!reserved) out.push(item);
      }
    }
    return out;
  }, []);
  useEffect(() => {
    fillInstances(ref.current, items.length, (i, d) => {
      d.position.set(items[i].x, items[i].y, items[i].z);
      d.rotation.set(-0.5, items[i].rot, 0);
    });
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <sphereGeometry args={[0.55, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
      <meshStandardMaterial color="#d8d8e0" roughness={0.5} metalness={0.3} side={DoubleSide} />
    </instancedMesh>
  );
}

function buildParked() {
  const rand = mulberry32(42);
  const slots: { x: number; z: number; rot: number }[] = [];
  const items: FleetItem[] = [];
  const colors = ["#f4f1ea", "#1d1d3f", "#c8102e", "#2a3a7a", "#9a95a8", "#d6b56e", "#3f3f4f", "#4a2c3a", "#2f6ea8", "#7a8c3a"];
  const kinds: VehicleKind[] = ["sedan", "sedan", "sedan", "suv", "suv", "pickup", "van"];
  for (const { c, r, outer } of allBlocks()) {
    const [bx, bz] = blockCenter(c, r);
    const landmark = RESERVED_BLOCKS.has(`${c},${r}`);
    const n = outer ? 1 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const side = rand() < 0.5 ? 1 : -1;
      const t = range(rand, -BLOCK / 2 + 3, BLOCK / 2 - 3);
      const vertical = rand() < 0.5;
      const e = BLOCK / 2 + KERB_PARK_OFFSET;
      const slot = {
        x: vertical ? bx + side * e : bx + t,
        z: vertical ? bz + t : bz + side * e,
        rot: (vertical ? 0 : Math.PI / 2) + (rand() < 0.5 ? Math.PI : 0),
      };
      const item = { kind: pick(rand, kinds), color: new Color(pick(rand, colors)) };
      const underGuideway = vertical ? isMedianLine("x", bx + (side * PITCH) / 2) : isMedianLine("z", bz + (side * PITCH) / 2);
      if (landmark || underGuideway) continue;
      slots.push(slot);
      items.push(item);
    }
  }
  return { slots, items };
}

function ParkedCars() {
  const [world] = useState(() => buildParked());
  const slots = world.slots;
  const pose = useCallback<PoseFn>(
    (i, out) => {
      const sl = slots[i];
      out.x = sl.x;
      out.y = 0.4;
      out.z = sl.z;
      out.yaw = sl.rot;
      out.spin = 0;
    },
    [slots],
  );
  return <VehicleFleet items={world.items} pose={pose} pools={false} />;
}

const POLE_EDGE = 10.7;

function UtilityPoles() {
  const poles = useRef<InstancedMesh>(null);
  const wires = useRef<InstancedMesh>(null);
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
    fillInstances(poles.current, items.length, (i, d) => d.position.set(items[i].x, 4.5, items[i].z));
    fillInstances(wires.current, items.length, (i, d) => {
      const it = items[i];
      const next = items[i + 1];
      if (next && Math.hypot(next.x - it.x, next.z - it.z) < 20) {
        d.position.set((it.x + next.x) / 2, 8.4, (it.z + next.z) / 2);
        d.rotation.set(0, Math.atan2(next.x - it.x, next.z - it.z), 0);
        d.scale.set(1, 1, Math.hypot(next.x - it.x, next.z - it.z));
      } else {
        d.position.set(it.x, 4.5, it.z);
        d.scale.set(0, 0, 0);
      }
    });
  }, [items]);
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
      <ParkedCars />
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
