"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, BoxGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import { EQ_BARS, SITE } from "@/content/site";
import AmbassadorBridge from "./AmbassadorBridge";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";
import Hotspot from "./Hotspot";
import {
  CITY_HALF_Z,
  DESTINATIONS,
  blockCenter,
  destinationById,
  destinationPosition,
  LABEL_FADE_STYLE,
  PAD,
} from "./layout";
import { useLingeringLabel } from "./useLingeringLabel";
import { carvedStoneTexture, handPaintedBillboardTexture, wheatpastePosterTexture } from "./labels";
import NeonSign, { DISPLAY_FONT, SCRIPT_FONT } from "./NeonSign";
import PaintedSign from "./PaintedSign";
import { mulberry32 } from "./rng";
import TreeStand, { plantTrees } from "./TreeStand";
import { useWindowMaterial } from "./useWindowMaterial";
import { baseBoxGeometry, fillInstances, mergeParts, setEmissiveIntensity } from "./instancing";
import { enableReflection } from "./layers";
import type { WindowMaterialOptions } from "./windowMaterial";

const BASE_BOX = baseBoxGeometry();
const FOUNTAIN_PLUME = new CylinderGeometry(0.6, 1.6, 9.5, 10).translate(0, 4.75, 0);
const JET_PLUME = new CylinderGeometry(0.4, 1.2, 7, 10).translate(0, 3.5, 0);

function WindowedBox({
  w,
  h,
  d,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  glow = 0.22,
  ...opts
}: WindowMaterialOptions & {
  w: number;
  h: number;
  d: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const mat = useWindowMaterial({ ...opts, glow });
  return (
    <mesh material={mat} geometry={BASE_BOX} position={position} rotation={rotation} scale={[w, h, d]} />
  );
}

function Beacon({
  position,
  color = "#ff2244",
  size = 0.7,
  rate = 1.4,
}: {
  position: [number, number, number];
  color?: string;
  size?: number;
  rate?: number;
}) {
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const on = Math.sin(clock.elapsedTime * rate * Math.PI) > 0 ? 1 : 0;
    mat.current.emissiveIntensity = 0.4 + on * 5;
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 10, 8]} />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={4} toneMapped={false} />
    </mesh>
  );
}

function SearchBeams({ position, color }: { position: [number, number, number]; color: string }) {
  const dn = useDayNight();
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  const beam = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(color),
        transparent: true,
        opacity: 0.09,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [color],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => {
    const m = beam.current?.material as MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.09 * dn.night;
  }, [dn]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (a.current) a.current.rotation.set(0.35 + Math.sin(t * 0.5) * 0.28, 0, -0.2 + Math.cos(t * 0.37) * 0.28);
    if (b.current) b.current.rotation.set(0.35 + Math.cos(t * 0.43) * 0.28, 0, -0.2 + Math.sin(t * 0.61) * 0.28);
  });
  if (dn.night < 0.05) return null;
  return (
    <group position={position}>
      <group ref={a}>
        <mesh ref={beam} position={[0, 30, 0]} material={mat} userData={{ noReflect: true }}>
          <coneGeometry args={[2, 60, 12, 1, true]} />
        </mesh>
      </group>
      <group ref={b}>
        <mesh position={[0, 30, 0]} material={mat} userData={{ noReflect: true }}>
          <coneGeometry args={[2, 60, 12, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}


function Landmark({
  name,
  note,
  position,
  labelHeight,
  children,
}: {
  name: string;
  note: string;
  position: [number, number, number];
  labelHeight: number;
  children: React.ReactNode;
}) {
  const { navigating } = useCity();
  const label = useLingeringLabel();
  return (
    <group position={position}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          label.show();
        }}
        onPointerOut={label.hide}
      >
        {children}
      </group>
      {label.mounted && !navigating && (
        <Html position={[0, labelHeight, 0]} center distanceFactor={90} style={{ pointerEvents: "none" }} zIndexRange={[40, 0]}>
          <div className={`landmark-label ${label.on ? "is-on" : ""}`} style={LABEL_FADE_STYLE}>
            <strong>{name}</strong>
            <span>{note}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

const CLUB_TOWER_HEIGHT = 70;
const CLUB_WING_HEIGHT = 54;
const CLUB_PODIUM_HEIGHT = 8;
const CLUB_TOWER = new CylinderGeometry(0.72, 1, 1, 40, 1).translate(0, 0.5, 0);
const CLUB_RING_COUNT = 9;
const CLUB_BAR_MAX = 9;
const CLUB_BAR_STEP_FRAMES = 14;
const GOLD = "#d6b56e";
const GOLD_LIGHT = "#f3dfae";

function TaperedGlassTower({ scale, position = [0, 0, 0], seed, glow = 0.18 }: { scale: [number, number, number]; position?: [number, number, number]; seed: number; glow?: number }) {
  const mat = useWindowMaterial({ color: "#0b0d16", cylindrical: true, seed, winSize: [1.6, 2.0], litDensity: 0.55, cool: "#f3dfae", warm: "#ffd9a0", glow });
  return <mesh material={mat} geometry={CLUB_TOWER} position={position} scale={scale} />;
}

function ClubLightRings() {
  const dn = useDayNight();
  const mat = useRef<MeshStandardMaterial>(null);
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    fillInstances(ref.current, CLUB_RING_COUNT, (i, d) => {
      const t = (i + 1) / (CLUB_RING_COUNT + 1);
      const r = 1 - 0.28 * t;
      d.position.set(0, CLUB_PODIUM_HEIGHT + t * CLUB_TOWER_HEIGHT, 0);
      d.rotation.x = Math.PI / 2;
      d.scale.set(9.6 * r, 7.2 * r, 1);
    });
  }, []);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.1);
    mat.current.emissiveIntensity = dn.night * (1.2 + pulse * 2.4);
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, CLUB_RING_COUNT]}>
      <torusGeometry args={[1, 0.09, 6, 48]} />
      <meshStandardMaterial ref={mat} color="#7a2a52" emissive="#ff4fa3" emissiveIntensity={0} toneMapped={false} />
    </instancedMesh>
  );
}

function ClubCrownBars() {
  const dn = useDayNight();
  const [mat] = useState(() => new MeshStandardMaterial({ color: GOLD, emissive: GOLD_LIGHT, emissiveIntensity: 0.15, metalness: 0.6, roughness: 0.35, toneMapped: false }));
  const bars = useRef<(Mesh | null)[]>([]);
  const frame = useRef(0);
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => {
    setEmissiveIntensity(mat, 0.15 + dn.night * 1.8);
  }, [dn, mat]);
  useFrame(({ clock }) => {
    frame.current += 1;
    if (frame.current % CLUB_BAR_STEP_FRAMES !== 0) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < bars.current.length; i++) {
      const b = bars.current[i];
      if (!b) continue;
      const k = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.9 + i * 0.23) + i));
      b.scale.y = CLUB_BAR_MAX * EQ_BARS[i] * k;
    }
  });
  return (
    <group position={[0, CLUB_PODIUM_HEIGHT + CLUB_TOWER_HEIGHT, 0]}>
      {EQ_BARS.map((h, i) => (
        <mesh
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          position={[-4 + i * 2, 0, -2.2]}
          scale={[1.1, CLUB_BAR_MAX * h, 1.1]}
          geometry={BASE_BOX}
          material={mat}
        />
      ))}
    </group>
  );
}

function ClubEntrance() {
  const dn = useDayNight();
  const glowMat = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (glowMat.current) glowMat.current.emissiveIntensity = 0.2 + dn.night * 1.6;
  }, [dn]);
  return (
    <group position={[0, 0, 11.5]}>
      <mesh position={[0, 0.06, 0.2]}>
        <boxGeometry args={[8, 0.12, 1.6]} />
        <meshStandardMaterial color="#8a8a98" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.18, -0.5]}>
        <boxGeometry args={[8, 0.12, 1.2]} />
        <meshStandardMaterial color="#8a8a98" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.31, 0.8]}>
        <boxGeometry args={[3.2, 0.05, 2.6]} />
        <meshStandardMaterial color="#c8102e" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.2, -1.2]}>
        <boxGeometry args={[5.4, 3.4, 0.3]} />
        <meshStandardMaterial color="#14101c" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 6.1, 2.4]}>
        <boxGeometry args={[14, 0.5, 5]} />
        <meshStandardMaterial color="#14101c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 5.82, 2.4]}>
        <boxGeometry args={[13.4, 0.06, 4.4]} />
        <meshStandardMaterial ref={glowMat} color="#fff6d8" emissive={GOLD_LIGHT} emissiveIntensity={0.2} toneMapped={false} />
      </mesh>
      {[-6.6, 6.6].map((x) => (
        <mesh key={x} position={[x, 3, 1.4]}>
          <cylinderGeometry args={[0.14, 0.14, 6.1, 8]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <MarqueeBulbs width={13.6} position={[0, 6.1, 5.0]} />
      <NeonSign text="Club Adams" color={GOLD_LIGHT} width={12} height={3.2} fontSize={2.2} position={[0, 8.2, 2.4]} backing="#07060f" glow={1.5} font={SCRIPT_FONT} />
    </group>
  );
}

function ClubAdams() {
  const d = DESTINATIONS[0];
  const [x, z] = destinationPosition(d);
  const dn = useDayNight();
  const rimMat = useRef<MeshStandardMaterial>(null);
  const deckY = CLUB_PODIUM_HEIGHT + CLUB_TOWER_HEIGHT;
  useEffect(() => {
    if (rimMat.current) rimMat.current.emissiveIntensity = 0.1 + dn.night * 1.4;
  }, [dn]);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[23, 1.2, 23]} />
        <meshStandardMaterial color="#1b1b26" roughness={0.9} />
      </mesh>
      <WindowedBox w={22} h={CLUB_PODIUM_HEIGHT} d={22} color="#0b0d16" winSize={[3.2, 3.6]} seed={3} glow={0.15} />
      {[
        [-11, -11],
        [11, -11],
        [-11, 11],
        [11, 11],
      ].map(([ox, oz], i) => (
        <mesh key={i} position={[ox, CLUB_PODIUM_HEIGHT / 2, oz]}>
          <boxGeometry args={[0.6, CLUB_PODIUM_HEIGHT, 0.6]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, CLUB_PODIUM_HEIGHT + 0.3, 0]}>
        <boxGeometry args={[22.6, 0.6, 22.6]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.4} />
      </mesh>
      <TaperedGlassTower scale={[9.6, CLUB_TOWER_HEIGHT, 7.2]} position={[0, CLUB_PODIUM_HEIGHT, 0]} seed={4} />
      <TaperedGlassTower scale={[5.2, CLUB_WING_HEIGHT, 4.6]} position={[5.8, CLUB_PODIUM_HEIGHT, -4.2]} seed={11} glow={0.14} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 8.1, CLUB_PODIUM_HEIGHT + CLUB_TOWER_HEIGHT / 2, Math.sin(a) * 6.1]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.5, CLUB_TOWER_HEIGHT, 0.9]} />
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
      <ClubLightRings />
      <mesh position={[0, deckY + 0.4, 0]} scale={[9.2, 1, 7]}>
        <cylinderGeometry args={[1, 1, 0.8, 40]} />
        <meshStandardMaterial color="#14101c" roughness={0.7} />
      </mesh>
      <mesh position={[0, deckY + 1.3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[9.2, 7, 1]}>
        <torusGeometry args={[1, 0.035, 6, 56]} />
        <meshStandardMaterial ref={rimMat} color={GOLD} emissive={GOLD_LIGHT} emissiveIntensity={0.1} toneMapped={false} />
      </mesh>
      <mesh position={[0, deckY + 1.5, 0]} scale={[9.1, 1, 6.9]}>
        <cylinderGeometry args={[1, 1, 1.4, 40, 1, true]} />
        <meshStandardMaterial color="#9fd8ff" roughness={0.05} metalness={0.3} transparent opacity={0.3} side={DoubleSide} />
      </mesh>
      <mesh position={[0, deckY + 1.6, -4]}>
        <boxGeometry args={[6, 1.6, 2.2]} />
        <meshStandardMaterial color="#1d1d3f" roughness={0.6} />
      </mesh>
      <ClubCrownBars />
      <NeonSign text="Club Adams" color={GOLD_LIGHT} width={18} height={4.6} fontSize={3.4} position={[0, deckY + 6.4, 0]} backing="#07060f" glow={1.5} font={SCRIPT_FONT} doubleSided depth={1} />
      <mesh position={[0, deckY + 9.9, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 2.4, 6]} />
        <meshStandardMaterial color="#1d1d3f" />
      </mesh>
      <Beacon position={[0, deckY + 11.3, 0]} />
      <SearchBeams position={[-5, deckY + 1.2, 4]} color="#ff4fa3" />
      <SearchBeams position={[5, deckY + 1.2, -2]} color={GOLD} />
      <ClubEntrance />
    </Hotspot>
  );
}

type Point = [number, number, number];

const BULB_ON = new Color("#fff4c0").multiplyScalar(3);
const BULB_OFF = new Color("#6a4a20").multiplyScalar(0.6);
const CHASE_STEPS_PER_SECOND = 6;

function paintChase(m: InstancedMesh, count: number, step: number) {
  for (let i = 0; i < count; i++) m.setColorAt(i, (i + step) % 3 === 0 ? BULB_ON : BULB_OFF);
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

function ChasingBulbs({ points, position = [0, 0, 0] }: { points: Point[]; position?: Point }) {
  const ref = useRef<InstancedMesh>(null);
  const lastStep = useRef(-1);
  useEffect(() => {
    const m = ref.current;
    fillInstances(m, points.length, (i, o) => o.position.set(...points[i]));
    if (m) paintChase(m, points.length, 0);
  }, [points]);
  useFrame(({ clock }) => {
    const m = ref.current;
    const step = Math.floor(clock.elapsedTime * CHASE_STEPS_PER_SECOND);
    if (!m || step === lastStep.current) return;
    lastStep.current = step;
    paintChase(m, points.length, step);
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]} position={position}>
      <sphereGeometry args={[0.22, 8, 6]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}

function MarqueeBulbs({ width, position }: { width: number; position: Point }) {
  const points = useMemo(() => Array.from({ length: Math.floor(width / 0.9) }, (_, i): Point => [-width / 2 + 0.45 + i * 0.9, 0, 0]), [width]);
  return <ChasingBulbs points={points} position={position} />;
}

const FOX_BLADE = { w: 3.6, h: 20, d: 1.2, bulbStep: 0.8 };
const FOX_LETTERS = new Color("#ffb02e").multiplyScalar(2.6);

function foxBladeBulbs(): Point[] {
  const { w, h, d, bulbStep } = FOX_BLADE;
  const out: Point[] = [];
  for (const z of [d / 2 + 0.14, -d / 2 - 0.14]) {
    for (let y = -h / 2 + 0.4; y <= h / 2 - 0.4; y += bulbStep) out.push([-w / 2 + 0.28, y, z]);
    for (let x = -w / 2 + 0.28 + bulbStep; x <= w / 2 - 0.28; x += bulbStep) out.push([x, h / 2 - 0.4, z]);
    for (let y = h / 2 - 0.4; y >= -h / 2 + 0.4; y -= bulbStep) out.push([w / 2 - 0.28, y, z]);
  }
  return out;
}

function FoxBlade({ position, rotation }: { position: Point; rotation: number }) {
  const { w, h, d } = FOX_BLADE;
  const bulbs = useMemo(() => foxBladeBulbs(), []);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#5e1712" roughness={0.6} />
      </mesh>
      <mesh>
        <boxGeometry args={[w + 0.3, h + 0.3, d - 0.3]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, h / 2 + 1.1, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.5, 2.2, 4]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
      {[0, Math.PI].map((ry) => (
        <Text
          key={ry}
          font={DISPLAY_FONT}
          fontSize={4.8}
          lineHeight={1.08}
          color={FOX_LETTERS}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          rotation={[0, ry, 0]}
          position={[0, 0, ry === 0 ? d / 2 + 0.06 : -d / 2 - 0.06]}
          material-toneMapped={false}
        >
          {"F\nO\nX"}
        </Text>
      ))}
      <ChasingBulbs points={bulbs} />
    </group>
  );
}

const FOX_LINES = ["NOW PLAYING · JONATHAN ADAMS", "ONE NIGHT ONLY · DOORS 8PM", "SOLD OUT · SECOND SHOW ADDED", "ADAMS UNIVERSECITY · LIVE"];
const FOX_LINE_MS = 4200;

function FoxMarquee() {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLine((v) => (v + 1) % FOX_LINES.length), FOX_LINE_MS);
    return () => clearInterval(id);
  }, []);
  return <NeonSign text={FOX_LINES[line]} color="#fff1c4" width={14} height={2.2} fontSize={0.9} position={[0, -1.9, 1.6]} glow={1.8} />;
}

const LISTEN_TOWER_H = 34;
const LISTEN_ROOF_SLAB = 0.8;
export const LISTEN_ROOF_Y = PAD + LISTEN_TOWER_H + LISTEN_ROOF_SLAB;

function ListenTower() {
  const d = DESTINATIONS[1];
  const [x, z] = destinationPosition(d);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={15} h={LISTEN_TOWER_H} d={16} color="#b3382c" winSize={[1.8, 2.3]} seed={21} warm="#ffe08a" />
      <mesh position={[0, LISTEN_TOWER_H + LISTEN_ROOF_SLAB / 2, 0]}>
        <boxGeometry args={[16.4, LISTEN_ROOF_SLAB, 17.4]} />
        <meshStandardMaterial color="#7d1b18" />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-7 + i * 2.33, 35.8, 7.4]}>
          <coneGeometry args={[1.1, 2.2, 4]} />
          <meshStandardMaterial color="#ffb02e" emissive="#ffb02e" emissiveIntensity={0.7} />
        </mesh>
      ))}
      <FoxBlade position={[-4.6, 23, 9.4]} rotation={0.75} />
      <NeonSign text="LISTEN" color="#ffb02e" width={8} height={2.2} fontSize={1.6} position={[0, 11.2, 8.4]} glow={1.8} />
      <group position={[0, 8.2, 9.6]}>
        <mesh>
          <boxGeometry args={[17, 1, 5]} />
          <meshStandardMaterial color="#b52c24" />
        </mesh>
        <MarqueeBulbs width={16.4} position={[0, -0.7, 2.4]} />
        <FoxMarquee />
      </group>
      <mesh position={[0, 3.2, 8.3]}>
        <boxGeometry args={[6, 6, 0.4]} />
        <meshStandardMaterial color="#2a0a0a" />
      </mesh>
    </Hotspot>
  );
}

function Fan({ position, r }: { position: [number, number, number]; r: number }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.z = clock.elapsedTime * 2.2;
  });
  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[r, 0.22, 8, 32]} />
        <meshStandardMaterial color="#1d1d3f" />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[r, 32]} />
        <meshStandardMaterial color="#49d2f2" emissive="#49d2f2" emissiveIntensity={0.5} />
      </mesh>
      <group ref={g}>
        <mesh>
          <boxGeometry args={[r * 2, 0.3, 0.2]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[r * 2, 0.3, 0.2]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
      </group>
    </group>
  );
}

const WATER_TANK = (() => {
  const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => new BoxGeometry(0.35, 4, 0.35).translate(sx * 1.6, 2, sz * 1.6)));
  return mergeParts(
    [
      ...legs,
      new BoxGeometry(4, 0.3, 4).translate(0, 4.15, 0),
      new CylinderGeometry(2.3, 2.3, 4.2, 14, 1).translate(0, 6.4, 0),
      new ConeGeometry(2.5, 1.6, 14, 1).translate(0, 9.3, 0),
    ],
    "water tank",
  );
})();

function MerchWarehouse() {
  const d = DESTINATIONS[3];
  const [x, z] = destinationPosition(d);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={19} h={14} d={17} color="#8a4a3a" winSize={[2.6, 3]} seed={31} cool="#d6fbff" />
      {[3.5, 7, 10.5].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[19.6, 0.5, 17.6]} />
          <meshStandardMaterial color="#6e3a2c" />
        </mesh>
      ))}
      <mesh position={[0, 14.6, 0]}>
        <boxGeometry args={[20, 1.2, 18]} />
        <meshStandardMaterial color="#5c2f24" />
      </mesh>
      <Fan position={[-5.5, 7.5, 8.8]} r={2} />
      <NeonSign text="MERCH" color="#ffb02e" width={11} height={3.6} fontSize={2.8} position={[2.5, 9.6, 8.9]} rotation={[0, 0, -0.06]} blink="fast" />
      <PaintedSign text="RIVERTOWN" bg="#2f4a3a" fg="#e6dbc2" width={12} height={2.2} position={[0, 17.4, 0]} doubleSided depth={0.8} />
      <mesh geometry={WATER_TANK} position={[6.5, 15.2, -3.6]}>
        <meshStandardMaterial color="#5a4632" roughness={0.95} />
      </mesh>
    </Hotspot>
  );
}

const MC_ARCH_X = [-8, 0, 8];
const MC_COLUMN_X = [-12.6, -3.8, 3.8, 12.6].flatMap((cx) => [cx - 0.7, cx + 0.7]);
const MC_FRONT = 10;
type Box = { x: number; y: number; z: number; sx: number; sy: number; sz: number };
const MC_TRIM: Box[] = [
  ...MC_ARCH_X.flatMap((ax) => [-1, 1].map((s) => ({ x: ax + s * 3.1, y: 5.2, z: MC_FRONT + 0.15, sx: 0.6, sy: 6.6, sz: 0.5 }))),
  ...MC_ARCH_X.map((ax) => ({ x: ax, y: 8.95, z: MC_FRONT + 0.3, sx: 0.8, sy: 1, sz: 0.6 })),
  ...MC_COLUMN_X.flatMap((cx) => [
    { x: cx, y: 0.25, z: MC_FRONT + 0.6, sx: 1.2, sy: 0.5, sz: 1.2 },
    { x: cx, y: 10.35, z: MC_FRONT + 0.6, sx: 1.1, sy: 0.5, sz: 1.1 },
  ]),
  { x: 0, y: 11.7, z: MC_FRONT + 0.6, sx: 27.4, sy: 2.2, sz: 1.3 },
];
const MC_MUNTINS: Box[] = MC_ARCH_X.flatMap((ax) => [
  { x: ax, y: 5.2, z: MC_FRONT + 0.32, sx: 0.12, sy: 6.6, sz: 0.3 },
  { x: ax, y: 4.2, z: MC_FRONT + 0.32, sx: 5.4, sy: 0.12, sz: 0.3 },
  { x: ax, y: 7.2, z: MC_FRONT + 0.32, sx: 5.4, sy: 0.12, sz: 0.3 },
]);
const MC_BALUSTER_COUNT = 25;
const MC_PILASTER_X = [-11.4, -6.8, -2.3, 2.3, 6.8, 11.4];

function MichiganCentral() {
  const d = DESTINATIONS[2];
  const [x, z] = destinationPosition(d);
  const dn = useDayNight();
  const carved = useMemo(() => carvedStoneTexture("MICHIGAN CENTRAL STATION", "#d8c9a8"), []);
  const glass = useMemo(() => new MeshStandardMaterial({ color: "#1b2a3a", emissive: "#ffd9a0", emissiveIntensity: 0.2, roughness: 0.2, metalness: 0.3 }), []);
  const trim = useRef<InstancedMesh>(null);
  const muntins = useRef<InstancedMesh>(null);
  const columns = useRef<InstancedMesh>(null);
  const balusters = useRef<InstancedMesh>(null);
  const pilasters = useRef<InstancedMesh>(null);
  useEffect(() => () => glass.dispose(), [glass]);
  useEffect(() => {
    setEmissiveIntensity(glass, 0.08 + dn.night * 0.9);
  }, [dn, glass]);
  useEffect(() => {
    const box = (list: Box[]) => (i: number, o: Object3D) => {
      const b = list[i];
      o.position.set(b.x, b.y, b.z);
      o.scale.set(b.sx, b.sy, b.sz);
    };
    fillInstances(trim.current, MC_TRIM.length, box(MC_TRIM));
    fillInstances(muntins.current, MC_MUNTINS.length, box(MC_MUNTINS));
    fillInstances(columns.current, MC_COLUMN_X.length, (i, o) => o.position.set(MC_COLUMN_X[i], 5.3, MC_FRONT + 0.6));
    fillInstances(balusters.current, MC_BALUSTER_COUNT, (i, o) => o.position.set(-12 + i, 14.2, MC_FRONT - 0.4));
    fillInstances(pilasters.current, MC_PILASTER_X.length, (i, o) => {
      o.position.set(MC_PILASTER_X[i], 29, 2.2);
      o.scale.set(0.7, 44, 0.5);
    });
  }, []);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={26} h={13} d={12} position={[0, 0, 4]} color="#c9b48c" winSize={[2, 2.4]} seed={61} storefront={false} />
      {MC_ARCH_X.map((ax) => (
        <group key={ax}>
          <mesh position={[ax, 8.5, MC_FRONT + 0.1]} rotation={[Math.PI / 2, 0, 0]} material={glass}>
            <cylinderGeometry args={[2.7, 2.7, 0.4, 18, 1, false, 0, Math.PI]} />
          </mesh>
          <mesh position={[ax, 5.2, MC_FRONT + 0.1]} material={glass}>
            <boxGeometry args={[5.4, 6.6, 0.4]} />
          </mesh>
          <mesh position={[ax, 8.5, MC_FRONT + 0.3]}>
            <torusGeometry args={[3.0, 0.32, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#d8c9a8" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={trim} args={[undefined, undefined, MC_TRIM.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d8c9a8" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={muntins} args={[undefined, undefined, MC_MUNTINS.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={columns} args={[undefined, undefined, MC_COLUMN_X.length]} castShadow>
        <cylinderGeometry args={[0.42, 0.46, 9.6, 10]} />
        <meshStandardMaterial color="#d2c3a2" roughness={0.9} />
      </instancedMesh>
      <mesh position={[0, 13.4, 4]} castShadow>
        <boxGeometry args={[27.4, 1.2, 13.4]} />
        <meshStandardMaterial color="#b9a88c" roughness={0.9} />
      </mesh>
      <instancedMesh ref={balusters} args={[undefined, undefined, MC_BALUSTER_COUNT]}>
        <cylinderGeometry args={[0.14, 0.18, 0.9, 6]} />
        <meshStandardMaterial color="#d2c3a2" roughness={0.9} />
      </instancedMesh>
      <mesh position={[0, 14.75, MC_FRONT - 0.4]}>
        <boxGeometry args={[25, 0.25, 0.5]} />
        <meshStandardMaterial color="#d2c3a2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 11.7, MC_FRONT + 1.33]}>
        <planeGeometry args={[26, 1.7]} />
        <meshStandardMaterial map={carved} roughness={0.95} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh position={[0, 3.5, -4]}>
        <boxGeometry args={[24.6, 7, 12.6]} />
        <meshStandardMaterial color="#a08c6c" roughness={1} />
      </mesh>
      <WindowedBox w={24} h={52} d={12} position={[0, 0, -4]} color="#bca98a" winSize={[1.7, 2.3]} seed={62} storefront={false} />
      <instancedMesh ref={pilasters} args={[undefined, undefined, MC_PILASTER_X.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#a8977c" roughness={0.95} />
      </instancedMesh>
      <mesh position={[0, 52.4, -4]} castShadow>
        <boxGeometry args={[25.8, 1.6, 13.8]} />
        <meshStandardMaterial color="#8a7050" />
      </mesh>
      <mesh position={[0, 53.7, -4]}>
        <boxGeometry args={[24.6, 1.2, 12.6]} />
        <meshStandardMaterial color="#a08c6c" />
      </mesh>
      {[-9, 9].map((ax) => (
        <mesh key={ax} position={[ax, 55.3, -4]}>
          <boxGeometry args={[2.2, 2.4, 2.2]} />
          <meshStandardMaterial color="#8a7050" />
        </mesh>
      ))}
      <NeonSign text="WATCH" color="#49f2d6" width={8} height={2.4} fontSize={1.8} position={[0, 18.6, 2.35]} backing="#0b1424" glow={1.8} />
    </Hotspot>
  );
}

function CreativesBillboard() {
  const d = DESTINATIONS[4];
  const [x, z] = destinationPosition(d);
  const billboard = useMemo(() => handPaintedBillboardTexture("The", "CREATIVES", "CORKTOWN · DETROIT MAKERS"), []);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={15} h={16} d={15} color="#7a4034" winSize={[2.2, 2.4]} seed={51} />
      {[-5.5, 5.5].map((px) => (
        <mesh key={px} position={[px, 19, 2]}>
          <cylinderGeometry args={[0.3, 0.35, 6, 6]} />
          <meshStandardMaterial color="#3a3936" />
        </mesh>
      ))}
      <group rotation={[0, 0, -0.04]}>
        <PaintedSign texture={billboard} width={17} height={9} position={[0, 25.5, 2]} depth={0.6} />
      </group>
    </Hotspot>
  );
}

function HuntingtonPlace() {
  const [x, z] = blockCenter(2, 5);
  return (
    <Landmark name="Huntington Place" note="Riverfront convention center" position={[x, PAD, z]} labelHeight={16}>
      <WindowedBox w={21} h={9} d={19} color="#5a6a7a" winSize={[3, 2.6]} seed={101} cool="#dff4ff" />
      <mesh position={[0, 9.6, 0]}>
        <boxGeometry args={[21.6, 1.2, 19.6]} />
        <meshStandardMaterial color="#3a4452" />
      </mesh>
      <mesh position={[0, 10.8, 3]}>
        <boxGeometry args={[14, 1.4, 10]} />
        <meshStandardMaterial color="#9fb6c8" roughness={0.2} metalness={0.4} />
      </mesh>
    </Landmark>
  );
}

function HartPlaza() {
  const [x, z] = blockCenter(3, 5);
  const water = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.scale.y = 0.85 + Math.sin(clock.elapsedTime * 2.4) * 0.15;
  });
  return (
    <Landmark name="Hart Plaza" note="Dodge Fountain · Monument to Joe Louis" position={[x, PAD, z]} labelHeight={18}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[21, 0.4, 21]} />
        <meshStandardMaterial color="#85827a" />
      </mesh>
      <group position={[-3, 0, -2]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 3.6, 5, Math.sin(a) * 3.6]} rotation={[0, -a, 0.18]}>
              <cylinderGeometry args={[0.35, 0.5, 10, 8]} />
              <meshStandardMaterial color="#c9c9e0" metalness={0.7} roughness={0.3} />
            </mesh>
          );
        })}
        <mesh position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.2, 0.9, 10, 32]} />
          <meshStandardMaterial color="#d8d8ee" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh ref={water} geometry={FOUNTAIN_PLUME} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#dfe9ec" emissive="#ffffff" emissiveIntensity={0.15} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[5.4, 5.4, 0.3, 24]} />
          <meshStandardMaterial color="#2a4a6a" emissive="#1f6b8a" emissiveIntensity={0.3} />
        </mesh>
      </group>
      <group position={[6, 0, 6]}>
        {[
          [-2.6, -2.6],
          [2.6, -2.6],
          [-2.6, 2.6],
          [2.6, 2.6],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx * 0.6, 3.2, lz * 0.6]} rotation={[lz > 0 ? -0.36 : 0.36, 0, lx > 0 ? 0.36 : -0.36]}>
            <cylinderGeometry args={[0.16, 0.2, 7, 6]} />
            <meshStandardMaterial color="#1d1d3f" />
          </mesh>
        ))}
        <mesh position={[0, 4.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.9, 0.9, 6, 12]} />
          <meshStandardMaterial color="#8a5a2e" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[3.6, 4.6, 0]}>
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshStandardMaterial color="#8a5a2e" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
      <mesh position={[-6, 1.4, 7]}>
        <cylinderGeometry args={[4, 4, 2.2, 24, 1, true]} />
        <meshStandardMaterial color="#8a8ab0" side={DoubleSide} />
      </mesh>
    </Landmark>
  );
}

function SpiritOfDetroit() {
  const [x, z] = blockCenter(4, 5);
  return (
    <Landmark name="Spirit of Detroit" note="Coleman A. Young Municipal Center" position={[x, PAD, z]} labelHeight={30}>
      <WindowedBox w={20} h={24} d={9} position={[0, 0, -5]} color="#b89a7a" winSize={[1.8, 2]} seed={111} />
      <mesh position={[0, 0.2, 4]}>
        <boxGeometry args={[21, 0.4, 12]} />
        <meshStandardMaterial color="#85827a" />
      </mesh>
      <group position={[0, 0, 5]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[6, 2.4, 4.5]} />
          <meshStandardMaterial color="#3a3a58" />
        </mesh>
        <mesh position={[0, 4.6, 0]}>
          <sphereGeometry args={[2.3, 16, 12]} />
          <meshStandardMaterial color="#3f8a6a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 7.4, 0]}>
          <sphereGeometry args={[1.1, 16, 12]} />
          <meshStandardMaterial color="#3f8a6a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[-3, 5.6, 0.8]}>
          <sphereGeometry args={[0.95, 12, 10]} />
          <meshStandardMaterial color="#ffd95e" emissive="#ffd95e" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        <mesh position={[3, 5.6, 0.8]}>
          <sphereGeometry args={[0.7, 12, 10]} />
          <meshStandardMaterial color="#fff1d0" emissive="#ffd9a8" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      </group>
    </Landmark>
  );
}

const CAMPUS_TREES = plantTrees(
  mulberry32(828),
  Array.from({ length: 6 }, (_, i) => ({ x: Math.cos((i / 6) * Math.PI * 2) * 9, z: Math.sin((i / 6) * Math.PI * 2) * 9, s: 1.1 })),
  { shade: 0.7, elm: 0.3 },
);

function CampusMartius() {
  const [x, z] = blockCenter(4, 2);
  const jet = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (jet.current) jet.current.scale.y = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.2;
  });
  return (
    <Landmark name="Campus Martius Park" note="Heart of Woodward Avenue" position={[x, PAD, z]} labelHeight={16}>
      <mesh position={[0, 0.2, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[11, 36]} />
        <meshStandardMaterial color="#3a7a4e" />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[7, 11, 36]} />
        <meshStandardMaterial color="#8a877f" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[4, 4, 0.4, 24]} />
        <meshStandardMaterial color="#2a4a6a" emissive="#1f6b8a" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={jet} geometry={JET_PLUME} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#dfe9ec" emissive="#ffffff" emissiveIntensity={0.15} transparent opacity={0.55} />
      </mesh>
      <TreeStand trees={CAMPUS_TREES} quality="near" seed={1879} castShadow />
    </Landmark>
  );
}

function Penobscot() {
  const [x, z] = blockCenter(3, 3);
  return (
    <Landmark name="Penobscot Building" note="1928 · Art Deco · red beacon" position={[x, PAD, z]} labelHeight={88}>
      <WindowedBox w={18} h={30} d={18} color="#9c8468" winSize={[1.7, 2.1]} seed={71} />
      <WindowedBox w={14} h={18} d={14} position={[0, 30, 0]} color="#9c8468" winSize={[1.7, 2.1]} seed={72} />
      <WindowedBox w={10} h={14} d={10} position={[0, 48, 0]} color="#a8906f" winSize={[1.7, 2.1]} seed={73} />
      <WindowedBox w={6} h={8} d={6} position={[0, 62, 0]} color="#a8906f" winSize={[1.5, 2]} seed={74} />
      <mesh position={[0, 76, 0]}>
        <cylinderGeometry args={[0.25, 0.4, 12, 6]} />
        <meshStandardMaterial color="#2a2a44" />
      </mesh>
      <Beacon position={[0, 82.6, 0]} size={1.3} rate={0.7} />
    </Landmark>
  );
}

function Guardian() {
  const [x, z] = blockCenter(3, 4);
  return (
    <Landmark name="Guardian Building" note="1929 · Cathedral of Finance" position={[x, PAD, z]} labelHeight={70}>
      <WindowedBox w={13} h={52} d={16} color="#c0603a" winSize={[1.6, 2.6]} seed={91} warm="#ffe0b0" />
      <WindowedBox w={9} h={10} d={12} position={[0, 52, 0]} color="#c0603a" winSize={[1.6, 2.6]} seed={92} />
      {[14, 28, 42].map((y) => (
        <mesh key={y} position={[0, y, 8.1]}>
          <boxGeometry args={[11, 1.2, 0.3]} />
          <meshStandardMaterial color="#c99a6a" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 63, 0]}>
        <coneGeometry args={[4, 5, 4]} />
        <meshStandardMaterial color="#8a3a1a" />
      </mesh>
    </Landmark>
  );
}

function AllyDetroitCenter() {
  const [x, z] = blockCenter(4, 4);
  return (
    <Landmark name="Ally Detroit Center" note="1993 · twin Flemish spires" position={[x, PAD, z]} labelHeight={80}>
      <WindowedBox w={17} h={54} d={17} color="#8c7a68" winSize={[1.7, 2.2]} seed={121} cool="#e8f4ff" />
      <mesh position={[0, 54.6, 0]}>
        <boxGeometry args={[18, 1.4, 18]} />
        <meshStandardMaterial color="#5c4e40" />
      </mesh>
      {[-5.2, 5.2].map((ox) => (
        <group key={ox} position={[ox, 55, 0]}>
          <mesh position={[0, 5, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[5.2, 10, 4]} />
            <meshStandardMaterial color="#3f8a6a" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 11.5, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 3, 5]} />
            <meshStandardMaterial color="#1d1d3f" />
          </mesh>
          <Beacon position={[0, 13.2, 0]} size={0.5} rate={1.1} />
        </group>
      ))}
    </Landmark>
  );
}

function BookTower() {
  const [x, z] = blockCenter(2, 2);
  return (
    <Landmark name="Book Tower" note="1926 · copper dome" position={[x, PAD, z]} labelHeight={64}>
      <WindowedBox w={12} h={46} d={14} color="#c9b48c" winSize={[1.6, 2.2]} seed={131} />
      {[12, 24, 36].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[13, 0.8, 15]} />
          <meshStandardMaterial color="#8a7a5a" />
        </mesh>
      ))}
      <mesh position={[0, 46.6, 0]}>
        <boxGeometry args={[13.4, 1.4, 15.4]} />
        <meshStandardMaterial color="#8a7a5a" />
      </mesh>
      <mesh position={[0, 49, 0]}>
        <cylinderGeometry args={[4.4, 4.4, 4, 16]} />
        <meshStandardMaterial color="#c9b48c" />
      </mesh>
      <mesh position={[0, 51, 0]}>
        <sphereGeometry args={[4.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3f8a6a" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 57, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 4, 5]} />
        <meshStandardMaterial color="#1d1d3f" />
      </mesh>
    </Landmark>
  );
}

function DavidStott() {
  const [x, z] = blockCenter(2, 3);
  return (
    <Landmark name="David Stott Building" note="1929 · slender brick Deco" position={[x, PAD, z]} labelHeight={60}>
      <WindowedBox w={9} h={44} d={11} color="#7a4034" winSize={[1.4, 2.2]} seed={141} />
      <WindowedBox w={7} h={8} d={9} position={[0, 44, 0]} color="#7a4034" winSize={[1.4, 2.2]} seed={142} />
      <mesh position={[0, 53, 0]}>
        <boxGeometry args={[7.6, 1.2, 9.6]} />
        <meshStandardMaterial color="#5c2f24" />
      </mesh>
      <mesh position={[0, 56, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 5, 5]} />
        <meshStandardMaterial color="#1d1d3f" />
      </mesh>
      <Beacon position={[0, 58.8, 0]} size={0.5} rate={1.3} />
    </Landmark>
  );
}

function CadillacTower() {
  const [x, z] = blockCenter(5, 2);
  return (
    <Landmark name="Cadillac Tower" note="1927 · 40 storeys" position={[x, PAD, z]} labelHeight={60}>
      <WindowedBox w={10} h={46} d={10} color="#b89a7a" winSize={[1.5, 2.2]} seed={151} />
      <mesh position={[0, 46.6, 0]}>
        <boxGeometry args={[10.8, 1.4, 10.8]} />
        <meshStandardMaterial color="#8a7050" />
      </mesh>
      <mesh position={[0, 50, 0]}>
        <coneGeometry args={[5.2, 6, 4]} />
        <meshStandardMaterial color="#8a7050" />
      </mesh>
      <mesh position={[0, 53.6, 0]}>
        <boxGeometry args={[1.2, 2.4, 1.2]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffd27a" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </Landmark>
  );
}

function Fisher() {
  const dn = useDayNight();
  const [x, z] = blockCenter(3, -6);
  const roof = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (roof.current) roof.current.emissiveIntensity = dn.night * 1.1;
  }, [dn]);
  return (
    <Landmark name="Fisher Building" note="1928 · New Center · golden tower" position={[x, PAD, z]} labelHeight={66}>
      <WindowedBox w={15} h={48} d={15} color="#b8a070" winSize={[1.8, 2.3]} seed={81} />
      <mesh position={[0, 50.5, 0]}>
        <boxGeometry args={[11, 5, 11]} />
        <meshStandardMaterial color="#a8925f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 57.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[7.6, 9, 4]} />
        <meshStandardMaterial ref={roof} color="#9c8a3c" metalness={0.55} roughness={0.42} emissive="#ffb02e" emissiveIntensity={0} />
      </mesh>
    </Landmark>
  );
}

function StadiumLights({ radius, height, count }: { radius: number; height: number; count: number }) {
  const dn = useDayNight();
  const [lamp] = useState(() => new MeshStandardMaterial({ color: "#fff6d8", emissive: "#fff2c0", emissiveIntensity: 3, toneMapped: false }));
  useEffect(() => () => lamp.dispose(), [lamp]);
  useEffect(() => setEmissiveIntensity(lamp, 0.3 + dn.night * 4), [lamp, dn.night]);
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / count;
        return (
          <group key={i} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.2, 0.3, height, 6]} />
              <meshStandardMaterial color="#5a5a78" />
            </mesh>
            <mesh position={[0, height + 0.4, 0]} rotation={[0, -a, 0]} material={lamp}>
              <boxGeometry args={[3.2, 1.6, 0.4]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ComericaPark() {
  const [x, z] = blockCenter(5, 1);
  return (
    <Landmark name="Comerica Park" note="Home of the Tigers" position={[x, PAD, z]} labelHeight={24}>
      <mesh position={[0, 3.6, 0]}>
        <cylinderGeometry args={[10.5, 11, 7.2, 36, 1, true, Math.PI * 0.15, Math.PI * 1.7]} />
        <meshStandardMaterial color="#8a4a3a" roughness={0.8} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 7.3, 0]} rotation={[Math.PI / 2, 0, Math.PI * 0.15]}>
        <torusGeometry args={[10.6, 0.4, 8, 36, Math.PI * 1.7]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9.6, 36]} />
        <meshStandardMaterial color="#2f8a5a" />
      </mesh>
      <mesh position={[0, 0.35, 2]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#b07a5a" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 8, 9.2, 8]}>
          <boxGeometry args={[2.6, 2.2, 1.2]} />
          <meshStandardMaterial color="#ff8a2e" roughness={0.6} />
        </mesh>
      ))}
      <StadiumLights radius={9.4} height={16} count={4} />
    </Landmark>
  );
}

function FordField() {
  const [x, z] = blockCenter(6, 1);
  return (
    <Landmark name="Ford Field" note="Home of the Lions" position={[x, PAD, z]} labelHeight={28}>
      <WindowedBox w={21} h={14} d={19} color="#5a6a7a" winSize={[3.2, 3]} seed={161} cool="#dff4ff" />
      <mesh position={[0, 14.4, 0]}>
        <boxGeometry args={[22, 1.2, 20]} />
        <meshStandardMaterial color="#3a4452" />
      </mesh>
      <mesh position={[0, 16, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[9, 9, 20, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#9fb6c8" roughness={0.3} metalness={0.4} />
      </mesh>
      <PaintedSign text="FORD FIELD" bg="#1f3a6a" fg="#f4f1ea" width={12} height={2.6} position={[0, 10, 9.7]} />
    </Landmark>
  );
}

function LittleCaesarsArena() {
  const [x, z] = blockCenter(3, 0);
  return (
    <Landmark name="Little Caesars Arena" note="Red Wings · Pistons" position={[x, PAD, z]} labelHeight={26}>
      <mesh position={[0, 7, 0]}>
        <cylinderGeometry args={[11, 11.5, 14, 36]} />
        <meshStandardMaterial color="#3f4e66" roughness={0.6} />
      </mesh>
      <mesh position={[0, 14.4, 0]}>
        <cylinderGeometry args={[11.6, 11.6, 0.8, 36]} />
        <meshStandardMaterial color="#c8102e" emissive="#c8102e" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 16, 0]}>
        <sphereGeometry args={[11, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
        <meshStandardMaterial color="#9fb6c8" roughness={0.3} metalness={0.4} />
      </mesh>
    </Landmark>
  );
}

const MILLIKEN_TREES = plantTrees(
  mulberry32(1122),
  [-7, -2, 3].map((x, i) => ({ x, z: -6 + i * 3, s: 1 })),
  { shade: 0.5, elm: 0.5 },
);

function MillikenLighthouse() {
  const [x, z] = blockCenter(8, 5);
  const beam = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.elapsedTime * 1.2;
  });
  return (
    <Landmark name="Milliken State Park" note="Riverfront lighthouse" position={[x, PAD, z]} labelHeight={26}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[21, 0.4, 21]} />
        <meshStandardMaterial color="#3a7a4e" />
      </mesh>
      <mesh position={[4, 8, 5]}>
        <cylinderGeometry args={[1.6, 2.4, 16, 12]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
      </mesh>
      <mesh position={[4, 17, 5]}>
        <cylinderGeometry args={[1.4, 1.4, 2.2, 12]} />
        <meshStandardMaterial color="#1d1d3f" />
      </mesh>
      <mesh position={[4, 18.2, 5]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#fff6d8" emissive="#fff6d8" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <mesh position={[4, 19.6, 5]}>
        <coneGeometry args={[1.8, 2, 12]} />
        <meshStandardMaterial color="#c8102e" />
      </mesh>
      <group ref={beam} position={[4, 18.2, 5]}>
        <mesh position={[12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[2.2, 24, 10, 1, true]} />
          <meshBasicMaterial color="#fff2c0" transparent opacity={0.08} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <TreeStand trees={MILLIKEN_TREES} quality="near" seed={1879} castShadow />
    </Landmark>
  );
}

function Carousel() {
  const [x, z] = blockCenter(7, 5);
  const spin = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.elapsedTime * 0.4;
  });
  return (
    <Landmark name="Rivard Plaza" note="Riverwalk carousel" position={[x, PAD, z]} labelHeight={16}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[21, 0.4, 21]} />
        <meshStandardMaterial color="#3a7a4e" />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[6.5, 6.5, 0.4, 24]} />
        <meshStandardMaterial color="#8a877f" />
      </mesh>
      <group ref={spin}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 4.5, 2.6, Math.sin(a) * 4.5]}>
              <boxGeometry args={[0.9, 2.4, 1.8]} />
              <meshStandardMaterial color={["#ff4fa3", "#49f2d6", "#ffb02e", "#c9a6ff"][i % 4]} />
            </mesh>
          );
        })}
      </group>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 6, 3.4, Math.sin(a) * 6]}>
            <cylinderGeometry args={[0.15, 0.15, 6, 6]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
        );
      })}
      <mesh position={[0, 7.4, 0]}>
        <coneGeometry args={[7.4, 3.4, 12]} />
        <meshStandardMaterial color="#c8102e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 6.2, 0]}>
        <torusGeometry args={[7, 0.2, 6, 32]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffd27a" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
    </Landmark>
  );
}

function AdBoard() {
  const [x, z] = blockCenter(6, 4);
  const poster = useMemo(() => wheatpastePosterTexture(SITE.artist.toUpperCase(), `Live at ${destinationById("club").label}`, "DETROIT · ONE NIGHT ONLY"), []);
  return (
    <Landmark name="Rivertown Lofts" note="Converted warehouse" position={[x, PAD, z]} labelHeight={32}>
      <WindowedBox w={16} h={18} d={16} color="#a3563f" winSize={[2.4, 2.6]} seed={171} />
      <group position={[0, 24, 2]} rotation={[0, 0, -0.1]}>
        <PaintedSign texture={poster} width={12} height={6.4} />
      </group>
      {[-5, 5].map((px) => (
        <mesh key={px} position={[px, 19.5, 2]}>
          <cylinderGeometry args={[0.25, 0.3, 4, 6]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
      ))}
    </Landmark>
  );
}

function Welcome() {
  return (
    <group position={[0, PAD, CITY_HALF_Z + 10.2]}>
      <Text font={DISPLAY_FONT} fontSize={3.4} color={new Color("#f3dfae").multiplyScalar(1.5)} anchorX="center" anchorY="bottom" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, 0]} letterSpacing={0.18} material-toneMapped={false}>
        DETROIT · ADAMS UNIVERSECITY
      </Text>
    </group>
  );
}

export default function Landmarks() {
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  return (
    <group ref={root}>
      <ClubAdams />
      <ListenTower />
      <MerchWarehouse />
      <MichiganCentral />
      <CreativesBillboard />
      <HuntingtonPlace />
      <HartPlaza />
      <SpiritOfDetroit />
      <CampusMartius />
      <Penobscot />
      <Guardian />
      <AllyDetroitCenter />
      <BookTower />
      <DavidStott />
      <CadillacTower />
      <Fisher />
      <ComericaPark />
      <FordField />
      <LittleCaesarsArena />
      <MillikenLighthouse />
      <Carousel />
      <AdBoard />
      <AmbassadorBridge />
      <Welcome />
    </group>
  );
}
