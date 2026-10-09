"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { useDayNight } from "./DayNightContext";
import {
  BLOCK,
  CITY_HALF_X,
  CITY_HALF_Z,
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
import { mulberry32, pick, range } from "./rng";

const PEOPLE_COLORS = ["#f4f1ea", "#d6b56e", "#c8102e", "#2a3a7a", "#1d1d3f", "#ff4fa3", "#49d2f2", "#3f8a6a"];

interface Walker {
  x: number;
  z: number;
  axis: "x" | "z";
  dir: 1 | -1;
  speed: number;
  len: number;
  start: number;
  phase: number;
}

function Pedestrians() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const walkers = useMemo<Walker[]>(() => {
    const rand = mulberry32(313);
    const out: Walker[] = [];
    for (const { c, r, outer } of allBlocks()) {
      {
        const [bx, bz] = blockCenter(c, r);
        const n = (outer ? 1 : 3) + Math.floor(rand() * (outer ? 2 : 4));
        for (let k = 0; k < n; k++) {
          const side = Math.floor(rand() * 4);
          const e = BLOCK / 2 + 1.5;
          const axis: "x" | "z" = side < 2 ? "x" : "z";
          const fixed = side === 0 ? bz + e : side === 1 ? bz - e : side === 2 ? bx + e : bx - e;
          out.push({
            x: axis === "x" ? bx : fixed,
            z: axis === "x" ? fixed : bz,
            axis,
            dir: rand() < 0.5 ? 1 : -1,
            speed: range(rand, 0.9, 1.6),
            len: BLOCK - 2,
            start: rand(),
            phase: rand() * 10,
          });
        }
      }
    }
    for (let i = 0; i < 60; i++) {
      out.push({
        x: range(rand, -CITY_HALF_X - 30, CITY_HALF_X + 30),
        z: CITY_HALF_Z + 5 + rand() * 5,
        axis: "x",
        dir: rand() < 0.5 ? 1 : -1,
        speed: range(rand, 0.8, 1.4),
        len: 60,
        start: rand(),
        phase: rand() * 10,
      });
    }
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rand = mulberry32(99);
    walkers.forEach((_, i) => m.setColorAt(i, new Color(pick(rand, PEOPLE_COLORS))));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [walkers]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    walkers.forEach((w, i) => {
      const u = ((w.start + (t * w.speed * w.dir) / w.len) % 1 + 1) % 1;
      const along = (u - 0.5) * w.len;
      const x = w.axis === "x" ? w.x + along : w.x;
      const z = w.axis === "x" ? w.z : w.z + along;
      dummy.position.set(x, 0.4 + 0.75 + Math.abs(Math.sin(t * 6 + w.phase)) * 0.06, z);
      dummy.rotation.set(0, w.axis === "x" ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : w.dir > 0 ? 0 : Math.PI, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, walkers.length]}>
      <capsuleGeometry args={[0.28, 1, 3, 6]} />
      <meshStandardMaterial color="#ffffff" roughness={0.8} />
    </instancedMesh>
  );
}

function TrafficLights() {
  const poles = useRef<InstancedMesh>(null);
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
    const l = lamps.current;
    if (!p || !l) return;
    items.forEach((it, i) => {
      dummy.position.set(it.x, 2.6, it.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      p.setMatrixAt(i, dummy.matrix);
      dummy.position.set(it.x, 4.8, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
    });
    p.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
  }, [items, dummy]);
  const red = useMemo(() => new Color("#ff2a3c").multiplyScalar(3), []);
  const green = useMemo(() => new Color("#2aff7a").multiplyScalar(3), []);
  const amber = useMemo(() => new Color("#ffb02e").multiplyScalar(3), []);
  const lastTick = useRef(-1);
  useFrame(({ clock }) => {
    const l = lamps.current;
    if (!l) return;
    const time = clock.elapsedTime;
    const tick = Math.floor(time * 4);
    if (tick === lastTick.current) return;
    lastTick.current = tick;
    items.forEach((it, i) => {
      l.setColorAt(i, lightIsGreen(it.axis, it.ix, it.iz, time) ? green : lightIsAmber(it.axis, it.ix, it.iz, time) ? amber : red);
    });
    if (l.instanceColor) l.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, items.length]}>
        <cylinderGeometry args={[0.1, 0.12, 5.2, 5]} />
        <meshStandardMaterial color="#3a3a58" />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function ParkedCars() {
  const bodies = useRef<InstancedMesh>(null);
  const cabins = useRef<InstancedMesh>(null);
  const wheels = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const cars = useMemo(() => {
    const rand = mulberry32(42);
    const out: { x: number; z: number; rot: number; color: Color }[] = [];
    const colors = ["#f4f1ea", "#1d1d3f", "#c8102e", "#2a3a7a", "#9a95a8", "#d6b56e", "#3f3f4f"];
    for (const { c, r } of allBlocks()) {
      {
        const [bx, bz] = blockCenter(c, r);
        const n = 2 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          const side = rand() < 0.5 ? 1 : -1;
          const t = range(rand, -BLOCK / 2 + 3, BLOCK / 2 - 3);
          const vertical = rand() < 0.5;
          const e = BLOCK / 2 + ROAD_EDGE;
          out.push({
            x: vertical ? bx + side * e : bx + t,
            z: vertical ? bz + t : bz + side * e,
            rot: vertical ? 0 : Math.PI / 2,
            color: new Color(pick(rand, colors)),
          });
        }
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const b = bodies.current;
    const cb = cabins.current;
    const w = wheels.current;
    if (!b || !cb || !w) return;
    cars.forEach((c, i) => {
      dummy.position.set(c.x, 0.4 + 0.75, c.z);
      dummy.rotation.set(0, c.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      b.setColorAt(i, c.color);
      dummy.position.set(c.x, 0.4 + 1.3, c.z);
      dummy.updateMatrix();
      cb.setMatrixAt(i, dummy.matrix);
      [
        [-1, 1.3],
        [1, 1.3],
        [-1, -1.3],
        [1, -1.3],
      ].forEach(([sx, sz], k) => {
        dummy.position.set(c.x, 0.4 + 0.42, c.z);
        dummy.rotation.set(0, c.rot, 0);
        dummy.translateX(sx * 0.95);
        dummy.translateZ(sz);
        dummy.rotateY(Math.PI / 2);
        dummy.updateMatrix();
        w.setMatrixAt(i * 4 + k, dummy.matrix);
      });
    });
    b.instanceMatrix.needsUpdate = true;
    cb.instanceMatrix.needsUpdate = true;
    w.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  }, [cars, dummy]);
  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, cars.length]} castShadow>
        <boxGeometry args={[1.9, 0.7, 4.1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={cabins} args={[undefined, undefined, cars.length]}>
        <boxGeometry args={[1.6, 0.6, 2]} />
        <meshStandardMaterial color="#1b2040" roughness={0.2} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={wheels} args={[undefined, undefined, cars.length * 4]}>
        <cylinderGeometry args={[0.42, 0.42, 0.32, 10]} onUpdate={(g) => g.rotateZ(Math.PI / 2)} />
        <meshStandardMaterial color="#141418" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}
const ROAD_EDGE = 2.1;

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

function Gulls() {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const flock = useMemo(() => {
    const rand = mulberry32(8);
    return Array.from({ length: 28 }, () => ({
      ox: range(rand, -40, 40),
      oy: range(rand, -6, 6),
      oz: range(rand, -20, 20),
      flap: rand() * 10,
      speed: range(rand, 0.8, 1.2),
    }));
  }, []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const cx = Math.sin(t * 0.05) * 260;
    const cz = RIVER_NEAR + 20 + Math.cos(t * 0.05) * 30;
    flock.forEach((g, i) => {
      dummy.position.set(cx + g.ox, 26 + g.oy + Math.sin(t * g.speed + g.flap) * 1.2, cz + g.oz);
      dummy.rotation.set(0, Math.cos(t * 0.05) > 0 ? 0 : Math.PI, Math.sin(t * 9 + g.flap) * 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, flock.length]}>
      <boxGeometry args={[2.2, 0.08, 0.5]} />
      <meshStandardMaterial color="#f4f1ea" />
    </instancedMesh>
  );
}

function SmallBoats() {
  const dn = useDayNight();
  const refs = useRef<(Group | null)[]>([]);
  const lamp = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (lamp.current) lamp.current.emissiveIntensity = 0.3 + dn.night * 3;
  }, [dn]);
  const boats = useMemo(() => {
    const rand = mulberry32(17);
    return Array.from({ length: 6 }, () => ({
      z: range(rand, RIVER_NEAR + 10, RIVER_FAR - 10),
      speed: range(rand, 3, 7) * (rand() < 0.5 ? 1 : -1),
      start: range(rand, -400, 400),
      color: pick(rand, ["#f4f1ea", "#1d2a6a", "#c8102e", "#49d2f2"]),
    }));
  }, []);
  useFrame(({ clock }) => {
    boats.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      const x = ((b.start + clock.elapsedTime * b.speed + 450) % 900) - 450;
      g.position.set(x, -0.3 + Math.sin(clock.elapsedTime * 1.3 + i) * 0.12, b.z);
      g.rotation.y = b.speed > 0 ? 0 : Math.PI;
    });
  });
  return (
    <group>
      {boats.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[6, 1, 2.2]} />
            <meshStandardMaterial color={b.color} roughness={0.5} />
          </mesh>
          <mesh position={[0.8, 1.3, 0]}>
            <boxGeometry args={[2.4, 0.9, 1.6]} />
            <meshStandardMaterial color="#1d1d3f" />
          </mesh>
          <mesh position={[-2.6, 1.4, 0]}>
            <sphereGeometry args={[0.18, 6, 6]} />
            <meshStandardMaterial ref={i === 0 ? lamp : undefined} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Helicopter() {
  const rig = useRef<Group>(null);
  const rotor = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const strobe = useRef<MeshStandardMaterial>(null);
  const path = useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(-220, 70, 40),
          new Vector3(-80, 85, -120),
          new Vector3(120, 78, -90),
          new Vector3(200, 72, 60),
          new Vector3(40, 66, 110),
        ],
        true,
        "catmullrom",
        0.4,
      ),
    [],
  );
  const tmp = useMemo(() => ({ p: new Vector3(), t: new Vector3(), look: new Vector3() }), []);
  useFrame(({ clock }) => {
    const g = rig.current;
    if (!g) return;
    const u = (clock.elapsedTime * 0.012) % 1;
    path.getPointAt(u, tmp.p);
    path.getTangentAt(u, tmp.t);
    g.position.copy(tmp.p);
    tmp.look.copy(tmp.p).add(tmp.t);
    g.lookAt(tmp.look);
    g.rotation.x += 0.08;
    if (rotor.current) rotor.current.rotation.y = clock.elapsedTime * 30;
    if (tail.current) tail.current.rotation.x = clock.elapsedTime * 40;
    if (strobe.current) strobe.current.emissiveIntensity = Math.sin(clock.elapsedTime * 10) > 0.8 ? 6 : 0.2;
  });
  return (
    <group ref={rig}>
      <mesh>
        <capsuleGeometry args={[1.3, 2.4, 6, 10]} />
        <meshStandardMaterial color="#1d1d3f" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 1.4]}>
        <sphereGeometry args={[1.1, 12, 8]} />
        <meshStandardMaterial color="#49d2f2" roughness={0.1} metalness={0.3} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.3, -4]}>
        <boxGeometry args={[0.4, 0.5, 5]} />
        <meshStandardMaterial color="#1d1d3f" />
      </mesh>
      <group ref={rotor} position={[0, 1.6, 0]}>
        <mesh>
          <boxGeometry args={[9, 0.06, 0.4]} />
          <meshStandardMaterial color="#9a95a8" transparent opacity={0.7} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[9, 0.06, 0.4]} />
          <meshStandardMaterial color="#9a95a8" transparent opacity={0.7} />
        </mesh>
      </group>
      <group ref={tail} position={[0.3, 0.8, -6.4]}>
        <mesh>
          <boxGeometry args={[0.06, 1.8, 0.3]} />
          <meshStandardMaterial color="#9a95a8" />
        </mesh>
      </group>
      <mesh position={[0, -1.4, 0]}>
        <sphereGeometry args={[0.25, 8, 6]} />
        <meshStandardMaterial ref={strobe} color="#ff2a3c" emissive="#ff2a3c" emissiveIntensity={4} toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.9, -1.5, 0]}>
          <boxGeometry args={[0.12, 0.12, 3.4]} />
          <meshStandardMaterial color="#5a5a78" />
        </mesh>
      ))}
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

function MacArthurBridge() {
  const dn = useDayNight();
  const lamps = useRef<InstancedMesh>(null);
  const lampMat = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const x0 = CITY_HALF_X + 90;
  const curve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(x0, 2, CITY_HALF_Z + 6),
        new Vector3(x0 + 60, 7, RIVER_NEAR + 14),
        new Vector3(x0 + 130, 6, RIVER_NEAR + 38),
        new Vector3(x0 + 185, 2, RIVER_NEAR + 46),
      ]),
    [x0],
  );
  const count = 30;
  useEffect(() => {
    const l = lamps.current;
    if (!l) return;
    for (let i = 0; i < count; i++) {
      const p = curve.getPointAt(i / (count - 1));
      dummy.position.set(p.x, p.y + 3.4, p.z);
      dummy.updateMatrix();
      l.setMatrixAt(i, dummy.matrix);
    }
    l.instanceMatrix.needsUpdate = true;
  }, [curve, dummy]);
  useEffect(() => {
    if (lampMat.current) lampMat.current.emissiveIntensity = 0.3 + dn.night * 3;
  }, [dn]);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 60, 2.6, 6, false]} />
        <meshStandardMaterial color="#5d5680" roughness={0.9} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const p = curve.getPointAt((i + 1) / 8);
        return (
          <mesh key={i} position={[p.x, p.y / 2 - 1, p.z]}>
            <boxGeometry args={[3, p.y + 2, 6]} />
            <meshStandardMaterial color="#3f3a5e" />
          </mesh>
        );
      })}
      <instancedMesh ref={lamps} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial ref={lampMat} color="#fff6d8" emissive="#ffd27a" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
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
      <sphereGeometry args={[0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
      <meshStandardMaterial color="#d8d8e0" roughness={0.5} metalness={0.3} side={2} />
    </instancedMesh>
  );
}

function UtilityPoles() {
  const poles = useRef<InstancedMesh>(null);
  const wires = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const items = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    const zs = [-CITY_HALF_Z - 14, CITY_HALF_Z - 3.6];
    for (let x = -CITY_HALF_X - 60; x <= CITY_HALF_X + 60; x += 16) {
      out.push({ x, z: zs[0] });
    }
    const xs = [-CITY_HALF_X - 14, CITY_HALF_X + 14];
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
      <Pedestrians />
      <TrafficLights />
      <ParkedCars />
      <StreetBanners />
      <Gulls />
      <SmallBoats />
      <Helicopter />
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
