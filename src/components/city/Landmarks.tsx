"use client";

import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, Color, CylinderGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import AmbassadorBridge from "./AmbassadorBridge";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";
import Hotspot from "./Hotspot";
import {
  CITY_HALF_Z,
  DESTINATIONS,
  blockCenter,
  destinationPosition,
} from "./layout";
import NeonSign, { DISPLAY_FONT, SCRIPT_FONT } from "./NeonSign";
import { useWindowMaterial } from "./useWindowMaterial";
import { baseBoxGeometry } from "./instancing";
import { enableReflection } from "./layers";
import type { WindowMaterialOptions } from "./windowMaterial";

const PAD = 0.4;

const BASE_BOX = baseBoxGeometry();
const BASE_CYLINDER = new CylinderGeometry(1, 1, 1, 28, 1).translate(0, 0.5, 0);
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

function WindowedCylinder({
  r,
  h,
  position = [0, 0, 0],
  ...opts
}: WindowMaterialOptions & { r: number; h: number; position?: [number, number, number] }) {
  const mat = useWindowMaterial({ ...opts, cylindrical: true, glow: opts.glow ?? 0.3 });
  return (
    <mesh material={mat} geometry={BASE_CYLINDER} position={position} scale={[r, h, r]} />
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

function makeStar(outer: number, inner: number) {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return new ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12 });
}

function StarBalloon({ position, color = "#ffd95e" }: { position: [number, number, number]; color?: string }) {
  const geo = useMemo(() => makeStar(3.2, 1.4), []);
  return (
    <group position={position}>
      <Float speed={1.6} rotationIntensity={0.3} floatIntensity={1.4}>
        <mesh geometry={geo}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} toneMapped={false} />
        </mesh>
        <mesh position={[0, -4.6, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 6, 4]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
      </Float>
    </group>
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
        opacity: 0.1,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [color],
  );
  useEffect(() => {
    const m = beam.current?.material as MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.14 * dn.night;
  }, [dn]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (a.current) a.current.rotation.set(Math.sin(t * 0.5) * 0.5, 0, Math.cos(t * 0.37) * 0.5);
    if (b.current) b.current.rotation.set(Math.cos(t * 0.43) * 0.5, 0, Math.sin(t * 0.61) * 0.5);
  });
  if (dn.night < 0.05) return null;
  return (
    <group position={position}>
      <group ref={a}>
        <mesh ref={beam} position={[0, 45, 0]} material={mat}>
          <coneGeometry args={[6, 90, 12, 1, true]} />
        </mesh>
      </group>
      <group ref={b}>
        <mesh position={[0, 45, 0]} material={mat}>
          <coneGeometry args={[6, 90, 12, 1, true]} />
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
  const [hover, setHover] = useState(false);
  return (
    <group position={position}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        {children}
      </group>
      {hover && !navigating && (
        <Html position={[0, labelHeight, 0]} center distanceFactor={90} style={{ pointerEvents: "none" }} zIndexRange={[40, 0]}>
          <div className="landmark-label">
            <strong>{name}</strong>
            <span>{note}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function BlueCrown({ position, r }: { position: [number, number, number]; r: number }) {
  const dn = useDayNight();
  const mat = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.6 + dn.night * 3.4;
  }, [dn]);
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.28, 8, 48]} />
      <meshStandardMaterial ref={mat} color="#4aa8ff" emissive="#3d8dff" emissiveIntensity={3} toneMapped={false} />
    </mesh>
  );
}

function ClubAdams() {
  const d = DESTINATIONS[0];
  const [x, z] = destinationPosition(d);
  const dish = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (dish.current) dish.current.rotation.y = clock.elapsedTime * 0.4;
  });
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={21} h={6} d={21} color="#2b2f45" winSize={[2.4, 2.2]} seed={3} />
      <WindowedCylinder r={7.2} h={66} color="#2e3a5c" winSize={[1.5, 1.9]} seed={4} litDensity={0.7} cool="#dff4ff" glow={0.22} />
      {[
        [-8.2, -8.2],
        [8.2, -8.2],
        [-8.2, 8.2],
        [8.2, 8.2],
      ].map(([ox, oz], i) => (
        <WindowedCylinder key={i} r={4.1} h={44} position={[ox, 0, oz]} color="#33405f" winSize={[1.4, 1.9]} seed={10 + i} cool="#dff4ff" glow={0.2} litDensity={0.62} />
      ))}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 7.3, 33, Math.sin(a) * 7.3]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.5, 64, 0.5]} />
            <meshStandardMaterial color="#ff8ac2" emissive="#ff8ac2" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[0, 66.6, 0]}>
        <cylinderGeometry args={[7.6, 7.6, 1.2, 28]} />
        <meshStandardMaterial color="#1b2238" roughness={0.6} />
      </mesh>
      <BlueCrown position={[0, 65.2, 0]} r={7.5} />
      <BlueCrown position={[0, 62.4, 0]} r={7.5} />
      {[
        [-8.2, -8.2],
        [8.2, -8.2],
        [-8.2, 8.2],
        [8.2, 8.2],
      ].map(([ox, oz], i) => (
        <BlueCrown key={i} position={[ox, 43.6, oz]} r={4.3} />
      ))}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[23, 1.2, 23]} />
        <meshStandardMaterial color="#2b2f45" />
      </mesh>
      <NeonSign text="CLUB ADAMS" color="#49f2d6" width={17} height={4.4} fontSize={2.9} position={[0, 70.4, 0]} blink="marquee" doubleSided depth={1} />
      <mesh position={[0, 73.4, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 2.4, 6]} />
        <meshStandardMaterial color="#1d1d3f" />
      </mesh>
      <Beacon position={[0, 74.8, 0]} />
      <NeonSign text="Club Adams" color="#ff8ac2" width={16} height={5} fontSize={3.1} position={[0, 3.4, 10.9]} backing="#2a0a33" glow={2.2} font={SCRIPT_FONT} />
      <group position={[8.2, 44.4, -8.2]}>
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.3, 0.4, 6, 6]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
        <group ref={dish} position={[0, 6.2, 0]}>
          <mesh rotation={[-0.6, 0, 0]} position={[0, 0.6, 0.8]}>
            <sphereGeometry args={[2.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
            <meshStandardMaterial color="#f4f4fa" roughness={0.4} side={2} />
          </mesh>
        </group>
        <Beacon position={[0, 8.6, 0]} size={0.4} rate={0.8} />
      </group>
      <SearchBeams position={[-8.2, 44.6, 8.2]} color="#ff4fa3" />
    </Hotspot>
  );
}

function MarqueeBulbs({ width, position }: { width: number; position: [number, number, number] }) {
  const ref = useRef<InstancedMesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const count = Math.floor(width / 0.9);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(-width / 2 + 0.45 + i * 0.9, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, new Color(i % 2 === 0 ? "#ffd27a" : "#ffffff"));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count, width, dummy]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = Math.floor(clock.elapsedTime * 6);
    for (let i = 0; i < count; i++) {
      const on = (i + t) % 3 === 0;
      m.setColorAt(i, new Color(on ? "#fff4c0" : "#6a4a20").multiplyScalar(on ? 3 : 0.6));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} position={position}>
      <sphereGeometry args={[0.22, 8, 6]} />
      <meshStandardMaterial ref={mat} color="#ffffff" emissive="#ffffff" emissiveIntensity={1} toneMapped={false} />
    </instancedMesh>
  );
}

function ListenTower() {
  const d = DESTINATIONS[1];
  const [x, z] = destinationPosition(d);
  const starGeo = useMemo(() => makeStar(2.6, 1.1), []);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={15} h={34} d={16} color="#b3382c" winSize={[1.8, 2.3]} seed={21} warm="#ffe08a" />
      <mesh position={[0, 34.4, 0]}>
        <boxGeometry args={[16.4, 0.8, 17.4]} />
        <meshStandardMaterial color="#7d1b18" />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-7 + i * 2.33, 35.8, 7.4]}>
          <coneGeometry args={[1.1, 2.2, 4]} />
          <meshStandardMaterial color="#ffb02e" emissive="#ffb02e" emissiveIntensity={0.7} />
        </mesh>
      ))}
      <NeonSign text="FOX" color="#ffb02e" width={4.6} height={8} fontSize={3.4} vertical position={[-4.6, 28, 8.5]} blink="slow" />
      <NeonSign text="LISTEN" color="#ffb02e" width={4.6} height={20} fontSize={3.1} vertical position={[2.2, 20, 8.5]} blink="slow" />
      <group position={[0, 8.2, 9.6]}>
        <mesh>
          <boxGeometry args={[17, 1, 5]} />
          <meshStandardMaterial color="#b52c24" />
        </mesh>
        <MarqueeBulbs width={16.4} position={[0, -0.7, 2.4]} />
        <NeonSign text="NOW PLAYING" color="#fff1c4" width={14} height={2.2} fontSize={1.5} position={[0, -1.9, 1.6]} glow={1.8} />
      </group>
      <mesh position={[0, 3.2, 8.3]}>
        <boxGeometry args={[6, 6, 0.4]} />
        <meshStandardMaterial color="#2a0a0a" />
      </mesh>
      <group position={[5.5, 38, 0]}>
        <mesh position={[0, -2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 6, 4]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
        <Float speed={2} rotationIntensity={0.4} floatIntensity={1.2}>
          <mesh geometry={starGeo} position={[0, 2.4, 0]}>
            <meshStandardMaterial color="#ffd95e" emissive="#ffd95e" emissiveIntensity={1.3} toneMapped={false} />
          </mesh>
        </Float>
      </group>
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

function MerchWarehouse() {
  const d = DESTINATIONS[2];
  const [x, z] = destinationPosition(d);
  const eyes = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (eyes.current) eyes.current.emissiveIntensity = 2.5 + Math.sin(clock.elapsedTime * 3) * 1.5;
  });
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
      <NeonSign text="RIVERTOWN" color="#49d2f2" width={12} height={2.2} fontSize={1.6} position={[0, 17.4, 0]} doubleSided depth={0.8} glow={2} />
      <group position={[6, 15.2, 2]}>
        <mesh position={[0, 3.5, 0]}>
          <boxGeometry args={[4.4, 5, 4.4]} />
          <meshStandardMaterial color="#1f6b8a" roughness={0.5} />
        </mesh>
        <mesh position={[0, 8, 0]}>
          <boxGeometry args={[3.6, 3, 3.6]} />
          <meshStandardMaterial color="#2e86a8" roughness={0.5} />
        </mesh>
        {[-0.9, 0.9].map((ex) => (
          <mesh key={ex} position={[ex, 8.3, 1.85]}>
            <boxGeometry args={[0.9, 0.5, 0.2]} />
            <meshStandardMaterial ref={ex < 0 ? eyes : undefined} color="#ff4fa3" emissive="#ff4fa3" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 10.4, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 1.8, 5]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
        <Beacon position={[0, 11.5, 0]} color="#49d2f2" size={0.35} rate={2} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 2.9, 4.4, 0]} rotation={[0, 0, s * 0.5]}>
            <boxGeometry args={[1, 3.6, 1]} />
            <meshStandardMaterial color="#1f6b8a" />
          </mesh>
        ))}
      </group>
    </Hotspot>
  );
}

function MichiganCentral() {
  const d = DESTINATIONS[3];
  const [x, z] = destinationPosition(d);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={22} h={11} d={16} color="#b89a7a" winSize={[2, 2.6]} seed={61} />
      {[-7, 0, 7].map((ax) => (
        <group key={ax}>
          <mesh position={[ax, 5, 8.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.6, 2.6, 0.4, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#1b1424" emissive="#ffd9a0" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[ax, 2.4, 8.1]}>
            <boxGeometry args={[5.2, 5.2, 0.4]} />
            <meshStandardMaterial color="#1b1424" emissive="#ffd9a0" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}
      <WindowedBox w={15} h={40} d={12} position={[0, 11, -1]} color="#c9b48c" winSize={[1.9, 2.4]} seed={62} />
      <mesh position={[0, 51.6, -1]}>
        <boxGeometry args={[16.4, 1.4, 13.4]} />
        <meshStandardMaterial color="#8a7050" />
      </mesh>
      {[-5, 5].map((ax) => (
        <mesh key={ax} position={[ax, 53.4, -1]}>
          <boxGeometry args={[2.2, 2.4, 2.2]} />
          <meshStandardMaterial color="#8a7050" />
        </mesh>
      ))}
      <Text font={DISPLAY_FONT} fontSize={1.7} letterSpacing={0.1} color="#fff2dc" anchorX="center" anchorY="middle" position={[0, 9.4, 8.3]} material-toneMapped={false}>
        MICHIGAN CENTRAL
      </Text>
      <NeonSign text="WATCH" color="#49f2d6" width={5.2} height={22} fontSize={3.6} vertical position={[0, 30, 5.2]} blink="slow" backing="#0b1424" />
      <StarBalloon position={[10, 60, -4]} color="#49f2d6" />
    </Hotspot>
  );
}

function Rocket({ position }: { position: [number, number, number] }) {
  const flame = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (flame.current) {
      const s = 0.8 + Math.sin(clock.elapsedTime * 22) * 0.25;
      flame.current.scale.set(1, s, 1);
    }
  });
  return (
    <group position={position} rotation={[0, 0, -0.5]}>
      <mesh>
        <capsuleGeometry args={[1.1, 3.2, 6, 12]} />
        <meshStandardMaterial color="#f4f4fa" roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <coneGeometry args={[1.1, 1.8, 12]} />
        <meshStandardMaterial color="#ff4d6d" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, -2.2, 0]} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
          <boxGeometry args={[0.2, 1.6, 2.4]} />
          <meshStandardMaterial color="#ff4d6d" />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 0.95]}>
        <circleGeometry args={[0.5, 12]} />
        <meshStandardMaterial color="#49d2f2" emissive="#49d2f2" emissiveIntensity={1} />
      </mesh>
      <mesh ref={flame} position={[0, -3.6, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.8, 2.6, 8]} />
        <meshStandardMaterial color="#ffb02e" emissive="#ffb02e" emissiveIntensity={3.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CreativesBillboard() {
  const d = DESTINATIONS[4];
  const [x, z] = destinationPosition(d);
  return (
    <Hotspot dest={d} position={[x, PAD, z]}>
      <WindowedBox w={15} h={16} d={15} color="#7a4034" winSize={[2.2, 2.4]} seed={51} />
      {[-5.5, 5.5].map((px) => (
        <mesh key={px} position={[px, 19, 2]}>
          <cylinderGeometry args={[0.3, 0.35, 6, 6]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
      ))}
      <group rotation={[0, 0, -0.07]}>
        <NeonSign text="THE CREATIVES" color="#c9a6ff" width={17} height={9} fontSize={3.4} position={[0, 25.5, 2]} blink="marquee" backing="#14102a" />
      </group>
      <Rocket position={[9.4, 29, 2]} />
      <StarBalloon position={[-7, 36, -2]} />
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
        <meshStandardMaterial color="#6a648c" />
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
          <meshStandardMaterial color="#aef3ff" emissive="#49f2d6" emissiveIntensity={1.2} transparent opacity={0.55} toneMapped={false} />
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
        <meshStandardMaterial color="#8a8ab0" side={2} />
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
        <meshStandardMaterial color="#6a648c" />
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
          <meshStandardMaterial color="#49f2d6" emissive="#49f2d6" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      </group>
    </Landmark>
  );
}

function CampusMartius() {
  const [x, z] = blockCenter(4, 4);
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
        <meshStandardMaterial color="#7a7498" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[4, 4, 0.4, 24]} />
        <meshStandardMaterial color="#2a4a6a" emissive="#1f6b8a" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={jet} geometry={JET_PLUME} position={[0, 0.6, 0]}>
        <meshStandardMaterial color="#aef3ff" emissive="#49f2d6" emissiveIntensity={1.2} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 9, 0, Math.sin(a) * 9]}>
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[0.2, 0.3, 4.4, 6]} />
              <meshStandardMaterial color="#4a2e2a" />
            </mesh>
            <mesh position={[0, 5.6, 0]}>
              <icosahedronGeometry args={[2.2, 0]} />
              <meshStandardMaterial color="#2f8a5a" flatShading />
            </mesh>
          </group>
        );
      })}
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
      {[14, 28, 42].map((y, i) => (
        <mesh key={y} position={[0, y, 8.1]}>
          <boxGeometry args={[11, 1.2, 0.3]} />
          <meshStandardMaterial color={["#ffb02e", "#49f2d6", "#ff4fa3"][i]} emissive={["#ffb02e", "#49f2d6", "#ff4fa3"][i]} emissiveIntensity={1.4} toneMapped={false} />
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
  const [x, z] = blockCenter(5, 3);
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
  const [x, z] = blockCenter(5, 4);
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
  const [x, z] = blockCenter(3, 0);
  const crown = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (crown.current) crown.current.emissiveIntensity = 0.3 + dn.night * 2.2;
  }, [dn]);
  return (
    <Landmark name="Fisher Building" note="1928 · New Center · golden tower" position={[x, PAD, z]} labelHeight={66}>
      <WindowedBox w={15} h={48} d={15} color="#b8a070" winSize={[1.8, 2.3]} seed={81} />
      <mesh position={[0, 51, 0]}>
        <boxGeometry args={[11, 6, 11]} />
        <meshStandardMaterial ref={crown} color="#ffb02e" emissive="#ffb02e" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 55.5, 0]}>
        <boxGeometry args={[7, 3, 7]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffd27a" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </Landmark>
  );
}

function StadiumLights({ radius, height, count }: { radius: number; height: number; count: number }) {
  const dn = useDayNight();
  const mat = useRef<MeshStandardMaterial>(null);
  useEffect(() => {
    if (mat.current) mat.current.emissiveIntensity = 0.3 + dn.night * 4;
  }, [dn]);
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
            <mesh position={[0, height + 0.4, 0]} rotation={[0, -a, 0]}>
              <boxGeometry args={[3.2, 1.6, 0.4]} />
              <meshStandardMaterial ref={i === 0 ? mat : undefined} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={3} toneMapped={false} />
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
        <meshStandardMaterial color="#8a4a3a" roughness={0.8} side={2} />
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
      <NeonSign text="FORD FIELD" color="#4a8cff" width={12} height={2.6} fontSize={1.9} position={[0, 10, 9.7]} glow={2} />
    </Landmark>
  );
}

function LittleCaesarsArena() {
  const [x, z] = blockCenter(4, 0);
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

function MillikenLighthouse() {
  const [x, z] = blockCenter(7, 5);
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
          <meshBasicMaterial color="#fff2c0" transparent opacity={0.08} blending={2} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      {[-7, -2, 3].map((tx, i) => (
        <group key={tx} position={[tx, 0, -6 + i * 3]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 4, 6]} />
            <meshStandardMaterial color="#4a2e2a" />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <icosahedronGeometry args={[2, 0]} />
            <meshStandardMaterial color="#2f8a5a" flatShading />
          </mesh>
        </group>
      ))}
    </Landmark>
  );
}

function Carousel() {
  const [x, z] = blockCenter(8, 5);
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
        <meshStandardMaterial color="#7a7498" />
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
  return (
    <Landmark name="Rivertown Lofts" note="Converted warehouse" position={[x, PAD, z]} labelHeight={32}>
      <WindowedBox w={16} h={18} d={16} color="#a3563f" winSize={[2.4, 2.6]} seed={171} />
      <group position={[0, 24, 2]} rotation={[0, 0, -0.1]}>
        <NeonSign text="YOUR AD HERE" color="#9dff57" width={12} height={6.4} fontSize={2.6} backing="#e84f9e" glow={2} />
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
    <group position={[0, PAD, CITY_HALF_Z + 6]}>
      <Text font={DISPLAY_FONT} fontSize={6} color={new Color("#f3dfae").multiplyScalar(1.5)} anchorX="center" anchorY="bottom" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.55, 0]} letterSpacing={0.18} material-toneMapped={false}>
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
