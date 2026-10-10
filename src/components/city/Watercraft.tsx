"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, ExtrudeGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Shape, ShapeGeometry } from "three";
import { useDayNight } from "./DayNightContext";
import { labelTexture } from "./labels";
import { enableReflection } from "./layers";
import { RIVER_FAR, RIVER_NEAR } from "./layout";
import NeonSign, { DISPLAY_FONT } from "./NeonSign";
import { mulberry32, pick, range } from "./rng";

const WATER_Y = -0.6;
const LOOP = 1000;

function hullGeometry(length: number, beam: number, height: number, bow = 0.22, stern = 0.06) {
  const s = new Shape();
  const L = length / 2;
  const B = beam / 2;
  s.moveTo(-L + length * stern, -B);
  s.lineTo(L - length * bow, -B);
  s.quadraticCurveTo(L - length * bow * 0.3, -B * 0.55, L, 0);
  s.quadraticCurveTo(L - length * bow * 0.3, B * 0.55, L - length * bow, B);
  s.lineTo(-L + length * stern, B);
  s.quadraticCurveTo(-L, B * 0.6, -L, 0);
  s.quadraticCurveTo(-L, -B * 0.6, -L + length * stern, -B);
  const g = new ExtrudeGeometry(s, { depth: height, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(Math.PI / 2);
  return g;
}

function wakeTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.5, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.lineTo(64, 128);
  ctx.lineTo(0, 128);
  ctx.closePath();
  ctx.fill();
  return new CanvasTexture(c);
}
let wakeTex: CanvasTexture | null = null;

function Wake({ length, width, opacity }: { length: number; width: number; opacity: number }) {
  const tex = useMemo(() => (wakeTex ??= wakeTexture()), []);
  return (
    <mesh position={[-length / 2 - 1, WATER_Y + 0.06, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} renderOrder={1}>
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial color="#dfe9f5" alphaMap={tex} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function BowSpray({ x, size }: { x: number; size: number }) {
  return (
    <group position={[x, WATER_Y + 0.15, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-size * 0.4, size * 0.25, s * size * 0.45]} rotation={[0, s * 0.5, s * 0.6]}>
          <planeGeometry args={[size, size * 0.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Smoke({ at, size = 0.5, drift = -1 }: { at: [number, number, number]; size?: number; drift?: number }) {
  const puffs = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < puffs.current.length; i++) {
      const m = puffs.current[i];
      if (!m) continue;
      const u = (t * 0.35 + i / 6) % 1;
      m.position.set(at[0] + drift * u * 6 + Math.sin(t + i) * 0.3, at[1] + u * 6, at[2] + Math.cos(t * 0.7 + i) * 0.4);
      const s = size * (0.6 + u * 2.2);
      m.scale.setScalar(s);
      (m.material as MeshStandardMaterial).opacity = (1 - u) * 0.35;
    }
  });
  return (
    <group>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            puffs.current[i] = el;
          }}
        >
          <sphereGeometry args={[1, 7, 6]} />
          <meshStandardMaterial color="#9a95a8" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function NavLights({ length, beam, mastY = 2.4, night }: { length: number; beam: number; mastY?: number; night: number }) {
  const i = 0.5 + night * 3.5;
  return (
    <group>
      <mesh position={[length * 0.42, 0.7, -beam / 2]}>
        <sphereGeometry args={[0.11, 6, 6]} />
        <meshStandardMaterial color="#ff2a3c" emissive="#ff2a3c" emissiveIntensity={i} toneMapped={false} />
      </mesh>
      <mesh position={[length * 0.42, 0.7, beam / 2]}>
        <sphereGeometry args={[0.11, 6, 6]} />
        <meshStandardMaterial color="#2aff7a" emissive="#2aff7a" emissiveIntensity={i} toneMapped={false} />
      </mesh>
      <mesh position={[-length * 0.44, mastY, 0]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial color="#fff6d8" emissive="#fff2c0" emissiveIntensity={i} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Figure({ position, top, scale = 1, rotation = 0, hat = true, skin = "#d9a176", armsUp = false }: { position: [number, number, number]; top: string; scale?: number; rotation?: number; hat?: boolean; skin?: string; armsUp?: boolean }) {
  return (
    <group position={position} scale={scale} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.4, 0.55, 0.24]} />
        <meshStandardMaterial color={top} roughness={0.9} />
      </mesh>
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, armsUp ? 0.9 : 0.5, 0]} rotation={[armsUp ? Math.PI * 0.9 : 0, 0, 0]}>
          <boxGeometry args={[0.1, 0.5, 0.1]} />
          <meshStandardMaterial color={top} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.17, 8, 6]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      {hat && (
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 8]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
      )}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.36, 0.3, 0.22]} />
        <meshStandardMaterial color="#1d1d2a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function LifeRing({ position, rotation = [0, 0, 0] as [number, number, number] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <torusGeometry args={[0.28, 0.09, 6, 12]} />
      <meshStandardMaterial color="#ff7a1a" roughness={0.8} />
    </mesh>
  );
}

function NamePlate({ text, position, rotation = [0, 0, 0] as [number, number, number], width = 6, height = 0.9, bg = "#1a1a22", fg = "#f3dfae" }: { text: string; position: [number, number, number]; rotation?: [number, number, number]; width?: number; height?: number; bg?: string; fg?: string }) {
  const tex = useMemo(() => labelTexture(text, { width: 512, height: 96, bg, fg }), [text, bg, fg]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={tex} roughness={0.7} />
    </mesh>
  );
}

function Radar({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  const bar = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (bar.current) bar.current.rotation.y += dt * 2.2;
  });
  return (
    <group position={position} scale={size}>
      <mesh>
        <cylinderGeometry args={[0.06, 0.08, 0.6, 6]} />
        <meshStandardMaterial color="#c8ccd8" />
      </mesh>
      <mesh ref={bar} position={[0, 0.35, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.16]} />
        <meshStandardMaterial color="#e8e2d2" />
      </mesh>
    </group>
  );
}

function Speedboat({ color, night }: { color: string; night: number }) {
  const hull = useMemo(() => hullGeometry(7, 2.2, 1.0, 0.3), []);
  useEffect(() => () => hull.dispose(), [hull]);
  return (
    <group>
      <mesh geometry={hull}>
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.3} />
      </mesh>
      <mesh position={[0.2, -0.3, 0]}>
        <boxGeometry args={[6.2, 0.16, 2.3]} />
        <meshStandardMaterial color="#f3dfae" roughness={0.4} />
      </mesh>
      <mesh position={[0.2, 0.08, 0]}>
        <boxGeometry args={[5.4, 0.16, 1.8]} />
        <meshStandardMaterial color="#e8e2d2" roughness={0.6} />
      </mesh>
      <mesh position={[-0.9, 0.5, 0]}>
        <boxGeometry args={[2.6, 0.7, 1.9]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[0.5, 0.95, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.08, 0.8, 1.9]} />
        <meshStandardMaterial color="#9fd8ff" roughness={0.05} metalness={0.4} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.68, 1.3, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.06, 0.06, 1.95]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 0.9, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.9]} />
        <meshStandardMaterial color="#15151c" roughness={0.6} />
      </mesh>
      <mesh position={[0.2, 1.05, 0.25]} rotation={[0, 0, 0.5]}>
        <torusGeometry args={[0.16, 0.025, 5, 10]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.8} />
      </mesh>
      {[-0.5, 0.5].map((z) => (
        <group key={z} position={[-1.2, 1.0, z]}>
          <mesh>
            <boxGeometry args={[0.7, 0.5, 0.6]} />
            <meshStandardMaterial color="#1d1d3f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <boxGeometry args={[0.66, 0.06, 0.56]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[-2.6, 0.95, 0]}>
        <boxGeometry args={[1.2, 0.3, 1.8]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
      </mesh>
      <Figure position={[-0.4, 0.85, 0.5]} top="#ff4fa3" />
      <Figure position={[-2.6, 1.0, -0.4]} top="#49d2f2" scale={0.9} hat={false} armsUp />
      <group position={[-3.75, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 1.0, 0.5]} />
          <meshStandardMaterial color="#15151c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.62, 0.1, 0.52]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.9, 0]}>
          <boxGeometry args={[0.2, 0.9, 0.14]} />
          <meshStandardMaterial color="#15151c" />
        </mesh>
        <mesh position={[-0.1, -1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 8]} />
          <meshStandardMaterial color="#c8ccd8" metalness={0.8} />
        </mesh>
      </group>
      <mesh position={[2.6, 0.45, 0]}>
        <torusGeometry args={[0.7, 0.03, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.8} roughness={0.3} />
      </mesh>
      {[-0.7, 0.7].map((z) => (
        <mesh key={z} position={[2.6, 0.22, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.45, 5]} />
          <meshStandardMaterial color="#c8ccd8" metalness={0.8} />
        </mesh>
      ))}
      {[[2.2, 0.9], [2.2, -0.9], [-2.9, 1.0], [-2.9, -1.0]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.08, z]}>
          <boxGeometry args={[0.22, 0.06, 0.08]} />
          <meshStandardMaterial color="#c8ccd8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {[-1.5, 1.0].map((x) => (
        <mesh key={x} position={[x, -0.2, -1.2]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[-3.2, 1.3, 0.7]}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 4]} />
        <meshStandardMaterial color="#c8ccd8" />
      </mesh>
      <mesh position={[-3.35, 1.78, 0.7]}>
        <boxGeometry args={[0.3, 0.2, 0.01]} />
        <meshStandardMaterial color="#d6b56e" side={DoubleSide} />
      </mesh>
      <NavLights length={7} beam={2.2} mastY={1.3} night={night} />
      <BowSpray x={2.8} size={1.6} />
      <Wake length={13} width={3.4} opacity={0.5} />
    </group>
  );
}

function Trawler({ night }: { night: number }) {
  const hull = useMemo(() => hullGeometry(11, 3.8, 1.7, 0.25, 0.1), []);
  useEffect(() => () => hull.dispose(), [hull]);
  return (
    <group>
      <mesh geometry={hull}>
        <meshStandardMaterial color="#7a2e22" roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[10.2, 0.3, 3.9]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[10, 0.2, 3.5]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.9} />
      </mesh>
      <group position={[-2.2, 0, 0]}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[3, 2, 2.8]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
        </mesh>
        {[-0.9, 0, 0.9].map((z) => (
          <mesh key={z} position={[1.52, 1.5, z]}>
            <boxGeometry args={[0.04, 0.6, 0.6]} />
            <meshStandardMaterial color="#1d2a3a" emissive="#ffd27a" emissiveIntensity={night * 1.4} roughness={0.1} metalness={0.5} toneMapped={false} />
          </mesh>
        ))}
        {[-1, 1].map((s) =>
          [-0.7, 0.7].map((x) => (
            <mesh key={`${s}${x}`} position={[x, 1.5, s * 1.42]}>
              <boxGeometry args={[0.7, 0.6, 0.04]} />
              <meshStandardMaterial color="#1d2a3a" emissive="#ffd27a" emissiveIntensity={night * 1.4} roughness={0.1} metalness={0.5} toneMapped={false} />
            </mesh>
          )),
        )}
        <mesh position={[-1.52, 0.9, 0.9]}>
          <boxGeometry args={[0.04, 1.4, 0.6]} />
          <meshStandardMaterial color="#5a4636" />
        </mesh>
        <LifeRing position={[0.2, 1.1, 1.45]} />
        <LifeRing position={[0.2, 1.1, -1.45]} />
        <Radar position={[0.4, 2.35, 0]} size={0.8} />
        <mesh position={[-0.8, 2.6, 0.6]}>
          <sphereGeometry args={[0.28, 8, 6]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
        <mesh position={[-1.0, 2.9, -0.8]}>
          <cylinderGeometry args={[0.015, 0.015, 1.8, 4]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
      </group>
      <mesh position={[-3.4, 2.8, 0.6]}>
        <cylinderGeometry args={[0.22, 0.26, 1.6, 8]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>
      <mesh position={[-3.4, 3.5, 0.6]}>
        <cylinderGeometry args={[0.25, 0.22, 0.2, 8]} />
        <meshStandardMaterial color="#d6b56e" metalness={0.6} />
      </mesh>
      <Smoke at={[-3.4, 3.7, 0.6]} size={0.3} />
      <mesh position={[0.8, 2.6, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 5, 6]} />
        <meshStandardMaterial color="#5a4636" />
      </mesh>
      <mesh position={[0.8, 4.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 2.4, 5]} />
        <meshStandardMaterial color="#5a4636" />
      </mesh>
      {[-0.8, 0.8].map((z) => (
        <mesh key={z} position={[1.6, 2.3, z * 1.6]} rotation={[z > 0 ? -0.5 : 0.5, 0, 0.9]}>
          <cylinderGeometry args={[0.05, 0.06, 4.2, 5]} />
          <meshStandardMaterial color="#5a4636" />
        </mesh>
      ))}
      <mesh position={[-4.6, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 2.2, 10]} />
        <meshStandardMaterial color="#3a3a46" roughness={0.9} />
      </mesh>
      <mesh position={[-4.2, 0.45, -1.1]}>
        <boxGeometry args={[1.6, 0.5, 1.0]} />
        <meshStandardMaterial color="#5a6a3a" roughness={1} />
      </mesh>
      {[[2.4, 0.5], [3.1, -0.6], [2.2, -0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.45, z]}>
          <boxGeometry args={[0.6, 0.5, 0.6]} />
          <meshStandardMaterial color={i % 2 ? "#8a7a5a" : "#c9b48c"} roughness={1} />
        </mesh>
      ))}
      <mesh position={[5.1, 0.5, 0.9]}>
        <boxGeometry args={[0.3, 0.5, 0.2]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>
      {[-2.5, -0.5, 1.5, 3.5].map((x) =>
        [-1, 1].map((side) => (
          <mesh key={`${x}${side}`} position={[x, 0.2, side * 1.95]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.28, 0.1, 6, 10]} />
            <meshStandardMaterial color="#15151a" roughness={1} />
          </mesh>
        )),
      )}
      <NamePlate text="MOTOR CITY" position={[3.6, 0.5, 1.96]} width={2.4} height={0.45} bg="#7a2e22" />
      <NamePlate text="MOTOR CITY" position={[3.6, 0.5, -1.96]} rotation={[0, Math.PI, 0]} width={2.4} height={0.45} bg="#7a2e22" />
      <Figure position={[-1, 1.0, -1.6]} top="#d6b56e" />
      <Figure position={[2.0, 0.2, 0.9]} top="#ffb02e" rotation={Math.PI / 2} />
      <NavLights length={11} beam={3.8} mastY={5.2} night={night} />
      <Wake length={14} width={4.4} opacity={0.32} />
    </group>
  );
}

function sailGeometry(w: number, h: number) {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(w, 0);
  s.quadraticCurveTo(w * 0.4, h * 0.55, 0, h);
  s.closePath();
  return new ShapeGeometry(s, 6);
}

function Stay({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz);
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const rotZ = -Math.atan2(dx, dy);
  const rotX = Math.atan2(dz, Math.hypot(dx, dy));
  return (
    <mesh position={mid} rotation={[rotX, 0, rotZ]}>
      <cylinderGeometry args={[0.012, 0.012, len, 4]} />
      <meshStandardMaterial color="#c8ccd8" />
    </mesh>
  );
}

function Sailboat({ color, night }: { color: string; night: number }) {
  const hull = useMemo(() => hullGeometry(8, 2.4, 1.1, 0.3, 0.1), []);
  useEffect(() => () => hull.dispose(), [hull]);
  const main = useMemo(() => sailGeometry(3.6, 8.2), []);
  useEffect(() => () => main.dispose(), [main]);
  const jib = useMemo(() => sailGeometry(2.6, 6.4), []);
  useEffect(() => () => jib.dispose(), [jib]);
  return (
    <group rotation={[0, 0, 0.1]}>
      <mesh geometry={hull}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[7.4, 0.12, 2.5]} />
        <meshStandardMaterial color="#c8102e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[7, 0.14, 2.1]} />
        <meshStandardMaterial color="#c9b48c" roughness={0.8} />
      </mesh>
      <group position={[-0.4, 0.45, 0]}>
        <mesh>
          <boxGeometry args={[2.6, 0.6, 1.5]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
        </mesh>
        {[-0.6, 0.4].map((x) =>
          [-1, 1].map((s) => (
            <mesh key={`${x}${s}`} position={[x, 0.1, s * 0.76]}>
              <boxGeometry args={[0.6, 0.25, 0.03]} />
              <meshStandardMaterial color="#1d2a3a" emissive="#ffd27a" emissiveIntensity={night * 1.2} roughness={0.1} metalness={0.5} />
            </mesh>
          )),
        )}
      </group>
      <mesh position={[0.8, 4.6, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 9.2, 6]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.8, 5.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 5]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.7} />
      </mesh>
      <mesh position={[-1.1, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 3.8, 5]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.7} roughness={0.3} />
      </mesh>
      <Stay from={[3.9, 0.3, 0]} to={[0.8, 9.1, 0]} />
      <Stay from={[-3.9, 0.3, 0]} to={[0.8, 9.1, 0]} />
      <Stay from={[0.8, 9.1, 0]} to={[0.8, 0.3, 1.2]} />
      <Stay from={[0.8, 9.1, 0]} to={[0.8, 0.3, -1.2]} />
      <mesh geometry={main} position={[0.76, 1.35, 0.02]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial color="#f8f4ea" side={DoubleSide} roughness={0.9} />
      </mesh>
      {[2.4, 4.2, 6.0].map((y) => (
        <mesh key={y} position={[0.76 - (3.6 * (1 - (y - 1.35) / 8.2) * 0.65) / 2, y, 0.03]}>
          <boxGeometry args={[3.6 * (1 - (y - 1.35) / 8.2) * 0.65, 0.03, 0.01]} />
          <meshStandardMaterial color="#9a95a8" />
        </mesh>
      ))}
      <Text font={DISPLAY_FONT} fontSize={1.1} color="#d6b56e" anchorX="center" anchorY="middle" position={[-0.4, 3.4, 0.05]} rotation={[0, 0, 0.08]} material-toneMapped={false}>
        ADAMS
      </Text>
      <Text font={DISPLAY_FONT} fontSize={1.1} color="#d6b56e" anchorX="center" anchorY="middle" position={[-0.4, 3.4, -0.02]} rotation={[0, Math.PI, -0.08]} material-toneMapped={false}>
        ADAMS
      </Text>
      <mesh geometry={jib} position={[0.9, 1.4, -0.02]}>
        <meshStandardMaterial color="#f3dfae" side={DoubleSide} roughness={0.9} />
      </mesh>
      <mesh position={[3.4, 0.5, 0]}>
        <torusGeometry args={[0.6, 0.025, 5, 10, Math.PI]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.5, s * 1.05]}>
          <boxGeometry args={[6.4, 0.015, 0.015]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
      ))}
      {[-1, 1].map((s) =>
        [-2.5, 0, 2.5].map((x) => (
          <mesh key={`${s}${x}`} position={[x, 0.3, s * 1.05]}>
            <cylinderGeometry args={[0.015, 0.015, 0.5, 4]} />
            <meshStandardMaterial color="#c8ccd8" />
          </mesh>
        )),
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-1.6, 0.25, s * 0.7]}>
          <cylinderGeometry args={[0.1, 0.1, 0.16, 8]} />
          <meshStandardMaterial color="#c8ccd8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[-3.0, 0.4, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[1.2, 0.05, 0.08]} />
        <meshStandardMaterial color="#5a4636" />
      </mesh>
      <mesh position={[-3.6, 0.6, 0]}>
        <boxGeometry args={[0.1, 0.9, 0.6]} />
        <meshStandardMaterial color="#5a4636" />
      </mesh>
      <mesh position={[0.85, 9.3, 0.15]}>
        <boxGeometry args={[0.01, 0.25, 0.35]} />
        <meshStandardMaterial color="#d6b56e" side={DoubleSide} />
      </mesh>
      <Figure position={[-2.2, 0.2, 0.4]} top="#2a3a7a" />
      <NavLights length={8} beam={2.4} mastY={9.3} night={night} />
      <Wake length={8} width={2.4} opacity={0.2} />
    </group>
  );
}

function RailPosts({ length, beam, y, count }: { length: number; beam: number; y: number; count: number }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new Object3D();
    let i = 0;
    for (let k = 0; k < count / 2; k++) {
      const x = -length / 2 + (k / (count / 2 - 1)) * length;
      for (const side of [-1, 1]) {
        d.position.set(x, y, side * beam * 0.5);
        d.updateMatrix();
        m.setMatrixAt(i++, d.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [length, beam, y, count]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.04, 0.04, 1.1, 5]} />
        <meshStandardMaterial color="#e8e2d2" />
      </instancedMesh>
      {[-1, 1].map((side) =>
        [0.5, 0.2].map((h) => (
          <mesh key={`${side}${h}`} position={[0, y + h, side * beam * 0.5]}>
            <boxGeometry args={[length, 0.05, 0.05]} />
            <meshStandardMaterial color="#e8e2d2" />
          </mesh>
        )),
      )}
    </group>
  );
}

function StringLights({ length, beam, y, count, night }: { length: number; beam: number; y: number; count: number; night: number }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new Object3D();
    let i = 0;
    for (let k = 0; k < count / 2; k++) {
      const x = -length / 2 + (k / (count / 2 - 1)) * length;
      for (const side of [-1, 1]) {
        d.position.set(x, y - Math.sin((k / (count / 2 - 1)) * Math.PI * 6) * 0.12, side * (beam * 0.5 + 0.08));
        d.updateMatrix();
        m.setMatrixAt(i++, d.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [length, beam, y, count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.09, 5, 5]} />
      <meshStandardMaterial color="#fff1c4" emissive="#ffd27a" emissiveIntensity={0.6 + night * 3.4} toneMapped={false} />
    </instancedMesh>
  );
}

function Windows({ length, beam, y, count, night, h = 0.7 }: { length: number; beam: number; y: number; count: number; night: number; h?: number }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new Object3D();
    let i = 0;
    for (let k = 0; k < count / 2; k++) {
      const x = -length / 2 + ((k + 0.5) / (count / 2)) * length;
      for (const side of [-1, 1]) {
        d.position.set(x, y, side * beam * 0.5);
        d.updateMatrix();
        m.setMatrixAt(i++, d.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [length, beam, y, count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.9, h, 0.06]} />
      <meshStandardMaterial color="#2a3a5a" emissive="#ffd27a" emissiveIntensity={0.4 + night * 2.2} roughness={0.1} metalness={0.5} toneMapped={false} />
    </instancedMesh>
  );
}

function Passengers({ spots, seed }: { spots: [number, number, number, number][]; seed: number }) {
  const rand = useMemo(() => mulberry32(seed), [seed]);
  const colors = useMemo(() => spots.map(() => pick(rand, ["#f4f1ea", "#1d1d3f", "#c8102e", "#ff4fa3", "#49d2f2", "#d6b56e", "#2a3a7a", "#3f8a6a"])), [spots, rand]);
  return (
    <group>
      {spots.map((s, i) => (
        <Figure key={i} position={[s[0], s[1], s[2]]} rotation={s[3]} top={colors[i]} hat={i % 3 === 0} scale={0.9} armsUp={i % 5 === 0} />
      ))}
    </group>
  );
}

function Bunting({ length, y, z, count }: { length: number; y: number; z: number; count: number }) {
  const colors = ["#ff4fa3", "#d6b56e", "#49d2f2", "#f4f1ea", "#c8102e"];
  return (
    <group>
      <mesh position={[0, y, z]}>
        <boxGeometry args={[length, 0.02, 0.02]} />
        <meshStandardMaterial color="#e8e2d2" />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[-length / 2 + ((i + 0.5) / count) * length, y - 0.2 - Math.sin((i / count) * Math.PI * 5) * 0.06, z]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.16, 0.36, 3]} />
          <meshStandardMaterial color={colors[i % colors.length]} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Spot({ color, angle, speed, phase, night }: { color: string; angle: number; speed: number; phase: number; night: number }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.set(angle + Math.sin(clock.elapsedTime * speed + phase) * 0.35, 0, Math.cos(clock.elapsedTime * speed * 0.8 + phase) * 0.35);
  });
  return (
    <group ref={g}>
      <mesh position={[0, 10, 0]}>
        <coneGeometry args={[2.2, 20, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.06 + night * 0.08} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3 + night * 4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Stage({ night }: { night: number }) {
  return (
    <group position={[-4.8, 5.9, 0]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[5, 0.5, 4.6]} />
        <meshStandardMaterial color="#15151c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.51, 0]}>
        <boxGeometry args={[4.6, 0.02, 4.2]} />
        <meshStandardMaterial color="#d6b56e" emissive="#d6b56e" emissiveIntensity={0.3 + night * 0.8} metalness={0.6} roughness={0.4} toneMapped={false} />
      </mesh>
      {[-1.9, 1.9].map((z) => (
        <group key={z} position={[-1.6, 1.0, z]}>
          <mesh>
            <boxGeometry args={[0.8, 1.0, 0.7]} />
            <meshStandardMaterial color="#0e0e14" roughness={0.9} />
          </mesh>
          <mesh position={[0.41, 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.24, 12]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
        </group>
      ))}
      <Figure position={[0.6, 0.5, 0]} top="#d6b56e" scale={1.05} rotation={Math.PI / 2} hat={false} armsUp />
      <mesh position={[1.1, 1.2, 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 5]} />
        <meshStandardMaterial color="#c8ccd8" />
      </mesh>
      <mesh position={[1.1, 1.98, 0.3]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.08, 0.22, 0.08]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>
      <group position={[-1.6, 3.4, 0]}>
        <mesh>
          <boxGeometry args={[0.1, 0.1, 4.4]} />
          <meshStandardMaterial color="#3a3a46" />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, -1.5, s * 2.15]}>
            <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
        ))}
        <group position={[0, -0.1, -1.6]}>
          <Spot color="#ff4fa3" angle={Math.PI + 0.5} speed={1.1} phase={0} night={night} />
        </group>
        <group position={[0, -0.1, 0]}>
          <Spot color="#d6b56e" angle={Math.PI + 0.3} speed={0.9} phase={2} night={night} />
        </group>
        <group position={[0, -0.1, 1.6]}>
          <Spot color="#49d2f2" angle={Math.PI + 0.5} speed={1.3} phase={4} night={night} />
        </group>
      </group>
    </group>
  );
}

function Princess({ night }: { night: number }) {
  const hull = useMemo(() => hullGeometry(28, 8.6, 2.4, 0.18, 0.08), []);
  useEffect(() => () => hull.dispose(), [hull]);
  const decks = [
    { y: 0, l: 25, w: 8.4 },
    { y: 2.8, l: 22, w: 7.6 },
    { y: 5.6, l: 17, w: 6.4 },
  ];
  const passengers = useMemo(() => {
    const rand = mulberry32(44);
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 16; i++) out.push([range(rand, -11, 11), 0.3, pick(rand, [-1, 1]) * 3.7, rand() * Math.PI * 2]);
    for (let i = 0; i < 12; i++) out.push([range(rand, -10, 9), 3.1, pick(rand, [-1, 1]) * 3.3, rand() * Math.PI * 2]);
    for (let i = 0; i < 14; i++) out.push([range(rand, -2, 6) - 3.4, 5.9, range(rand, -2.6, 2.6), Math.PI + range(rand, -0.6, 0.6)]);
    return out;
  }, []);
  return (
    <group>
      <mesh geometry={hull} position={[0, -0.2, 0]}>
        <meshStandardMaterial color="#f4f1ea" roughness={0.5} />
      </mesh>
      <mesh position={[0, -1.1, 0]}>
        <boxGeometry args={[27.6, 0.7, 8.75]} />
        <meshStandardMaterial color="#c8102e" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.72, 0]}>
        <boxGeometry args={[27.7, 0.08, 8.8]} />
        <meshStandardMaterial color="#d6b56e" metalness={0.5} roughness={0.5} />
      </mesh>
      {decks.map((d, i) => (
        <group key={i} position={[-1 - i * 1.2, d.y, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[d.l, 0.3, d.w]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.5} />
          </mesh>
          {i < 2 && (
            <>
              <mesh position={[0, 1.5, 0]}>
                <boxGeometry args={[d.l - 4, 2.4, d.w - 2.2]} />
                <meshStandardMaterial color="#f4f1ea" roughness={0.5} />
              </mesh>
              <Windows length={d.l - 5} beam={d.w - 2.14} y={1.6} count={i === 0 ? 24 : 20} night={night} />
              {[-1, 1].map((s) => (
                <mesh key={s} position={[(d.l - 4) / 2 - 1.2, 1.2, s * ((d.w - 2.2) / 2 + 0.02)]}>
                  <boxGeometry args={[0.9, 1.9, 0.04]} />
                  <meshStandardMaterial color="#5a4636" roughness={0.8} />
                </mesh>
              ))}
              <LifeRing position={[-(d.l - 4) / 2 + 1.5, 1.3, (d.w - 2.2) / 2 + 0.06]} />
              <LifeRing position={[-(d.l - 4) / 2 + 1.5, 1.3, -(d.w - 2.2) / 2 - 0.06]} />
            </>
          )}
          {i === 2 &&
            [-2.2, 0.2, 2.6].map((x) => (
              <mesh key={x} position={[x + 3, 0.55, 0]}>
                <boxGeometry args={[1.6, 0.5, 0.6]} />
                <meshStandardMaterial color="#5a4636" roughness={0.8} />
              </mesh>
            ))}
          <RailPosts length={d.l - 0.6} beam={d.w - 0.2} y={0.85} count={i === 2 ? 20 : 28} />
          <StringLights length={d.l - 0.6} beam={d.w - 0.2} y={2.7} count={i === 2 ? 24 : 36} night={night} />
        </group>
      ))}
      <Bunting length={16} y={8.4} z={3.1} count={26} />
      <Bunting length={16} y={8.4} z={-3.1} count={26} />
      <group position={[4.5, 5.9, 0]}>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[5, 2.2, 4.2]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.5} />
        </mesh>
        <Windows length={4.6} beam={4.26} y={1.3} count={8} night={night} h={0.9} />
        <mesh position={[2.52, 1.3, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[3.6, 0.9, 0.06]} />
          <meshStandardMaterial color="#2a3a5a" emissive="#ffd27a" emissiveIntensity={0.4 + night * 2.2} roughness={0.1} metalness={0.5} toneMapped={false} />
        </mesh>
        <Radar position={[0, 2.5, 0]} />
        <mesh position={[-1.4, 2.5, 1.2]}>
          <coneGeometry args={[0.2, 0.3, 8]} />
          <meshStandardMaterial color="#d6b56e" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {[-2.5, -6.5].map((x) => (
        <group key={x} position={[x, 8.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.55, 0.75, 4.4, 12]} />
            <meshStandardMaterial color="#15151c" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.7, 0.6, 0.5, 12]} />
            <meshStandardMaterial color="#d6b56e" metalness={0.6} roughness={0.4} />
          </mesh>
          <Smoke at={[0, 2.0, 0]} size={0.35} />
        </group>
      ))}
      <Stage night={night} />
      <Passengers spots={passengers} seed={9} />
      <mesh position={[11, 2.2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 4, 5]} />
        <meshStandardMaterial color="#c8ccd8" />
      </mesh>
      <mesh position={[11.4, 3.8, 0]}>
        <boxGeometry args={[0.9, 0.55, 0.03]} />
        <meshStandardMaterial color="#d6b56e" side={DoubleSide} />
      </mesh>
      <mesh position={[12.6, 0.5, 2.6]}>
        <boxGeometry args={[0.4, 0.5, 0.3]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>
      <mesh position={[13.2, 0.6, -3.2]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[3, 0.1, 0.9]} />
        <meshStandardMaterial color="#5a4636" />
      </mesh>
      <PaddleWheel />
      <mesh position={[-12.6, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3.0, 3.0, 8.6, 14, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#c8102e" side={DoubleSide} roughness={0.7} />
      </mesh>
      <NeonSign text="DETROIT PRINCESS" color="#f3dfae" width={13} height={1.5} fontSize={1.1} position={[-1, 1.5, 4.35]} depth={0.15} glow={1.6} doubleSided />
      <NeonSign text="J. ADAMS · LIVE ON DECK TONIGHT" color="#f3dfae" width={19} height={1.4} fontSize={0.95} position={[-2.2, 4.3, 3.95]} depth={0.15} glow={1.4} doubleSided />
      <NavLights length={28} beam={8.6} mastY={9.8} night={night} />
      <Wake length={26} width={9} opacity={0.3} />
    </group>
  );
}

function PaddleWheel() {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.z -= dt * 1.4;
  });
  return (
    <group ref={g} position={[-12.6, 1.4, 0]}>
      {[-4.2, 4.2].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.7, 2.7, 0.18, 18]} />
          <meshStandardMaterial color="#c8102e" roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]} position={[Math.cos((i / 12) * Math.PI * 2) * 2.2, Math.sin((i / 12) * Math.PI * 2) * 2.2, 0]}>
          <boxGeometry args={[0.9, 0.12, 8.2]} />
          <meshStandardMaterial color="#e8e2d2" roughness={0.8} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 9, 8]} />
        <meshStandardMaterial color="#3a3a46" metalness={0.6} />
      </mesh>
    </group>
  );
}

function Portholes({ count, length, y, z }: { count: number; length: number; y: number; z: number }) {
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[-length / 2 + ((i + 0.5) / count) * length, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 10]} />
          <meshStandardMaterial color="#1d2a3a" metalness={0.5} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function Laker({ night }: { night: number }) {
  const hull = useMemo(() => hullGeometry(96, 12, 5.2, 0.1, 0.05), []);
  useEffect(() => () => hull.dispose(), [hull]);
  const posts = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  useEffect(() => {
    const p = posts.current;
    const l = lamps.current;
    if (!p || !l) return;
    const d = new Object3D();
    let i = 0;
    for (let k = 0; k < 30; k++) {
      const x = -44 + (k / 29) * 88;
      for (const side of [-1, 1]) {
        d.position.set(x, 0.55, side * 5.8);
        d.updateMatrix();
        p.setMatrixAt(i++, d.matrix);
      }
    }
    p.instanceMatrix.needsUpdate = true;
    for (let k = 0; k < 10; k++) {
      d.position.set(-38 + k * 8.2, 1.6, (k % 2 ? 1 : -1) * 5.6);
      d.updateMatrix();
      l.setMatrixAt(k, d.matrix);
    }
    l.instanceMatrix.needsUpdate = true;
  }, []);
  const windows = (k: number) => (
    <mesh position={[0, 1.6, 0]}>
      <boxGeometry args={[9.04 - k * 1.2, 0.9, 10.44 - k * 1.4]} />
      <meshStandardMaterial color="#1d2a3a" emissive="#ffd27a" emissiveIntensity={0.3 + night * 1.8} roughness={0.1} metalness={0.5} toneMapped={false} />
    </mesh>
  );
  return (
    <group>
      <mesh geometry={hull} position={[0, -0.4, 0]}>
        <meshStandardMaterial color="#1a1a22" roughness={0.8} />
      </mesh>
      <mesh position={[0, -3.1, 0]}>
        <boxGeometry args={[94, 1.6, 12.2]} />
        <meshStandardMaterial color="#8a2b1d" roughness={0.85} />
      </mesh>
      <mesh position={[0, -2.25, 0]}>
        <boxGeometry args={[94.2, 0.12, 12.24]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <boxGeometry args={[92, 0.3, 11.6]} />
        <meshStandardMaterial color="#3a3a46" roughness={0.9} />
      </mesh>
      {Array.from({ length: 11 }).map((_, i) => (
        <group key={i} position={[-34 + i * 6.6, 0, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[5.8, 0.3, 8.8]} />
            <meshStandardMaterial color="#2a2a34" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[5.2, 0.5, 8.2]} />
            <meshStandardMaterial color="#5a1f16" roughness={0.9} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, 0.78, s * 3.6]}>
              <boxGeometry args={[5.0, 0.06, 0.3]} />
              <meshStandardMaterial color="#8a2b1d" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-4, 2.4, 5.0]} rotation={[0, 0, 0.012]}>
        <boxGeometry args={[62, 1.3, 1.3]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.6} />
      </mesh>
      {[-30, -10, 10, 24].map((x) => (
        <mesh key={x} position={[x, 1.3, 5.0]}>
          <boxGeometry args={[0.4, 1.2, 1.0]} />
          <meshStandardMaterial color="#3a3a46" />
        </mesh>
      ))}
      <group position={[-33, 0, 5.0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.4, 3.2, 0]} rotation={[0, 0, s * 0.35]}>
            <boxGeometry args={[0.3, 6.5, 0.3]} />
            <meshStandardMaterial color="#3a3a46" />
          </mesh>
        ))}
        <mesh position={[0, 6.2, 0]}>
          <boxGeometry args={[3.4, 0.3, 0.5]} />
          <meshStandardMaterial color="#3a3a46" />
        </mesh>
      </group>
      <group position={[40, 0, 0]}>
        {[0, 1, 2, 3].map((k) => (
          <group key={k} position={[-k * 0.6, k * 2.6, 0]}>
            <mesh position={[0, 1.3, 0]}>
              <boxGeometry args={[9 - k * 1.2, 2.6, 10.4 - k * 1.4]} />
              <meshStandardMaterial color="#f4f1ea" roughness={0.55} />
            </mesh>
            {k === 3 ? windows(k) : <Portholes count={5} length={7 - k} y={1.5} z={(10.44 - k * 1.4) / 2} />}
            {k < 3 && <Portholes count={5} length={7 - k} y={1.5} z={-(10.44 - k * 1.4) / 2} />}
          </group>
        ))}
        <mesh position={[0, 12.6, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 5, 6]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
        <mesh position={[0, 11.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 4, 5]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
        <Radar position={[0, 10.9, 0]} size={1.4} />
        <mesh position={[3.2, 0.9, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 1.0, 10]} />
          <meshStandardMaterial color="#3a3a46" metalness={0.4} />
        </mesh>
        <mesh position={[4.2, 2.2, 3.4]}>
          <boxGeometry args={[0.2, 4, 0.5]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
      </group>
      <group position={[-40, 0, 0]}>
        <mesh position={[0, 2.4, 0]}>
          <boxGeometry args={[11, 4.8, 10.6]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.55} />
        </mesh>
        <Portholes count={6} length={9} y={1.6} z={5.32} />
        <Portholes count={6} length={9} y={1.6} z={-5.32} />
        <mesh position={[0, 3.4, 0]}>
          <boxGeometry args={[11.04, 0.8, 10.64]} />
          <meshStandardMaterial color="#1d2a3a" emissive="#ffd27a" emissiveIntensity={0.3 + night * 1.8} roughness={0.1} metalness={0.5} toneMapped={false} />
        </mesh>
        <mesh position={[-1.5, 8.2, 0]}>
          <cylinderGeometry args={[1.3, 1.6, 6.4, 14]} />
          <meshStandardMaterial color="#15151c" roughness={0.7} />
        </mesh>
        <mesh position={[-1.5, 9.6, 0]}>
          <cylinderGeometry args={[1.36, 1.36, 1.1, 14]} />
          <meshStandardMaterial color="#d6b56e" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[-1.5, 7.2, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 0.9, 14]} />
          <meshStandardMaterial color="#c8102e" roughness={0.6} />
        </mesh>
        <Smoke at={[-1.5, 10.3, 0]} size={0.9} drift={-1} />
        {[-1, 1].map((s) => (
          <group key={s} position={[2.5, 5.4, s * 5.9]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.6, 2.6, 4, 8]} />
              <meshStandardMaterial color="#ff7a1a" roughness={0.7} />
            </mesh>
            {[-1.4, 1.4].map((x) => (
              <mesh key={x} position={[x, 0.9, 0]}>
                <boxGeometry args={[0.12, 1.8, 0.12]} />
                <meshStandardMaterial color="#c8ccd8" />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 7.6, 3.5]}>
          <boxGeometry args={[1.2, 0.2, 1.2]} />
          <meshStandardMaterial color="#3a3a46" />
        </mesh>
        <mesh position={[-5.3, 2.4, 0]}>
          <boxGeometry args={[0.1, 4.4, 0.4]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
      </group>
      <mesh position={[47.2, 0.9, 0]}>
        <boxGeometry args={[1.4, 1.4, 2.2]} />
        <meshStandardMaterial color="#3a3a46" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[46, -1.2, s * 5.9]}>
          <boxGeometry args={[1.2, 1.4, 0.4]} />
          <meshStandardMaterial color="#15151c" />
        </mesh>
      ))}
      <instancedMesh ref={posts} args={[undefined, undefined, 60]}>
        <cylinderGeometry args={[0.05, 0.05, 1.1, 4]} />
        <meshStandardMaterial color="#c8ccd8" />
      </instancedMesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.05, s * 5.8]}>
          <boxGeometry args={[88, 0.05, 0.05]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
      ))}
      <instancedMesh ref={lamps} args={[undefined, undefined, 10]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial color="#fff6d8" emissive="#ffd27a" emissiveIntensity={0.4 + night * 3} toneMapped={false} />
      </instancedMesh>
      <NamePlate text="JONATHAN ADAMS" position={[38, -1.1, 6.1]} width={14} height={1.6} bg="#1a1a22" />
      <NamePlate text="JONATHAN ADAMS" position={[38, -1.1, -6.1]} rotation={[0, Math.PI, 0]} width={14} height={1.6} bg="#1a1a22" />
      <NamePlate text="JONATHAN ADAMS · DETROIT" position={[-48.1, -1.0, 0]} rotation={[0, -Math.PI / 2, 0]} width={9} height={1.2} bg="#1a1a22" />
      <Text font={DISPLAY_FONT} fontSize={2.0} color={new Color("#f3dfae").multiplyScalar(1.3)} anchorX="center" anchorY="middle" position={[-4, 2.4, 5.7]} letterSpacing={0.12} material-toneMapped={false}>
        ADAMS LINE
      </Text>
      <Text font={DISPLAY_FONT} fontSize={2.0} color={new Color("#f3dfae").multiplyScalar(1.3)} anchorX="center" anchorY="middle" position={[-4, 2.4, 4.3]} rotation={[0, Math.PI, 0]} letterSpacing={0.12} material-toneMapped={false}>
        ADAMS LINE
      </Text>
      <Figure position={[43, 10.6, 2.8]} top="#f4f1ea" scale={1.1} rotation={Math.PI / 2} />
      <Figure position={[-20, 1.1, 4.6]} top="#ffb02e" />
      <NavLights length={96} beam={12} mastY={15} night={night} />
      <Wake length={60} width={14} opacity={0.22} />
    </group>
  );
}

function JetSki({ color, night }: { color: string; night: number }) {
  const hull = useMemo(() => hullGeometry(2.6, 1.0, 0.6, 0.35, 0.05), []);
  useEffect(() => () => hull.dispose(), [hull]);
  return (
    <group>
      <mesh geometry={hull}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[-0.2, 0.3, 0]}>
        <boxGeometry args={[1.4, 0.4, 0.5]} />
        <meshStandardMaterial color="#15151c" roughness={0.8} />
      </mesh>
      <mesh position={[0.55, 0.55, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <meshStandardMaterial color="#c8ccd8" metalness={0.8} />
      </mesh>
      <mesh position={[0.68, 0.76, 0]}>
        <boxGeometry args={[0.06, 0.05, 0.6]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>
      <Figure position={[-0.3, 0.5, 0]} top="#ff4fa3" scale={0.85} rotation={Math.PI / 2} hat={false} />
      <mesh position={[0.3, 0.3, 0]}>
        <sphereGeometry args={[0.05, 5, 5]} />
        <meshStandardMaterial color="#ff2a3c" emissive="#ff2a3c" emissiveIntensity={0.4 + night * 3} toneMapped={false} />
      </mesh>
      <BowSpray x={1.1} size={1.1} />
      <Wake length={9} width={2.2} opacity={0.55} />
    </group>
  );
}

interface Craft {
  kind: "speed" | "trawler" | "sail" | "princess" | "laker" | "jetski";
  z: number;
  speed: number;
  start: number;
  color: string;
  bob: number;
  weave: number;
  min: number;
  max: number;
  returnZ?: number;
}

interface Lane {
  z: number;
  speed: number;
  min: number;
  max: number;
  returnZ?: number;
}

interface CraftPose {
  x: number;
  z: number;
  yaw: number;
  calm: number;
}

const WEAVE_EASE = 20;

function easeFromEnds(s: number, straight: number) {
  return Math.min(1, Math.min(s, straight - s) / WEAVE_EASE);
}

function laneLength(b: Craft) {
  const straight = b.max - b.min;
  if (b.returnZ === undefined) return straight;
  return 2 * straight + Math.PI * Math.abs(b.returnZ - b.z);
}

function poseCraft(b: Craft, travelled: number, out: CraftPose) {
  const straight = b.max - b.min;
  const length = laneLength(b);
  let s = ((travelled % length) + length) % length;
  out.calm = 1;
  if (b.returnZ === undefined) {
    out.x = b.speed > 0 ? b.min + s : b.max - s;
    out.z = b.z;
    out.yaw = b.speed > 0 ? 0 : -Math.PI;
    return;
  }
  const r = (b.returnZ - b.z) / 2;
  const turn = Math.PI * r;
  if (s < straight) {
    out.x = b.min + s;
    out.z = b.z;
    out.yaw = 0;
    out.calm = easeFromEnds(s, straight);
    return;
  }
  s -= straight;
  out.calm = 0;
  if (s < turn) {
    const a = s / r;
    out.x = b.max + Math.sin(a) * r;
    out.z = b.z + r - Math.cos(a) * r;
    out.yaw = -a;
    return;
  }
  s -= turn;
  if (s < straight) {
    out.x = b.max - s;
    out.z = b.returnZ;
    out.yaw = -Math.PI;
    out.calm = easeFromEnds(s, straight);
    return;
  }
  s -= straight;
  const a = s / r;
  out.x = b.min - Math.sin(a) * r;
  out.z = b.returnZ - r + Math.cos(a) * r;
  out.yaw = -Math.PI - a;
}

const CHANNEL = { min: -LOOP / 2, max: LOOP / 2 };
const LANES = {
  north: { z: RIVER_NEAR + 2.5, returnZ: RIVER_NEAR + 6, speed: 10, min: -480, max: 200 },
  princess: { z: RIVER_FAR - 25, speed: 2.4, ...CHANNEL },
  sail: { z: RIVER_FAR - 18.7, speed: -2, ...CHANNEL },
  laker: { z: RIVER_FAR - 11, speed: 1.7, ...CHANNEL },
} satisfies Record<string, Lane>;

function inLane(lane: Lane, kind: Craft["kind"], slot: number, slots: number, extra: Partial<Craft> = {}): Craft {
  const craft: Craft = { kind, z: lane.z, returnZ: lane.returnZ, speed: lane.speed, start: 0, color: "", bob: 0.12, weave: 0, min: lane.min, max: lane.max, ...extra };
  craft.start = (laneLength(craft) * slot) / slots;
  return craft;
}

function buildFleet(): Craft[] {
  const rand = mulberry32(17);
  const speedColor = () => pick(rand, ["#f4f1ea", "#1d2a6a", "#c8102e", "#49d2f2", "#ff4fa3"]);
  const skiColor = () => pick(rand, ["#ffb02e", "#49d2f2", "#ff4fa3"]);
  const sailColor = () => pick(rand, ["#f4f1ea", "#1d2a6a", "#2f6ea8"]);
  return [
    inLane(LANES.laker, "laker", 0, 3, { bob: 0 }),
    inLane(LANES.laker, "trawler", 1, 3, { bob: 0.1 }),
    inLane(LANES.laker, "trawler", 2, 3, { bob: 0.1 }),
    inLane(LANES.princess, "princess", 0, 1),
    inLane(LANES.sail, "sail", 0, 3, { color: sailColor(), bob: 0.16 }),
    inLane(LANES.sail, "sail", 1, 3, { color: sailColor(), bob: 0.16 }),
    inLane(LANES.sail, "sail", 2, 3, { color: sailColor(), bob: 0.16 }),
    inLane(LANES.north, "speed", 0, 5, { color: speedColor(), bob: 0.14 }),
    inLane(LANES.north, "jetski", 1, 5, { color: skiColor(), bob: 0.2, weave: 1.2 }),
    inLane(LANES.north, "speed", 2, 5, { color: speedColor(), bob: 0.14 }),
    inLane(LANES.north, "jetski", 3, 5, { color: skiColor(), bob: 0.2, weave: 1.2 }),
    inLane(LANES.north, "speed", 4, 5, { color: speedColor(), bob: 0.14 }),
  ];
}

export default function Watercraft() {
  const dn = useDayNight();
  const [fleet] = useState(() => buildFleet());
  const refs = useRef<(Group | null)[]>([]);
  const root = useRef<Group>(null);
  const [pose] = useState<CraftPose>(() => ({ x: 0, z: 0, yaw: 0, calm: 1 }));
  useEffect(() => enableReflection(root.current), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < fleet.length; i++) {
      const b = fleet[i];
      const g = refs.current[i];
      if (!g) continue;
      poseCraft(b, b.start + t * Math.abs(b.speed), pose);
      const sway = b.weave * pose.calm;
      const weaving = sway > 0;
      const weave = weaving ? Math.sin(t * 0.9 + i) * sway : 0;
      g.position.set(pose.x, WATER_Y + 0.55 + Math.sin(t * 1.1 + i) * b.bob, pose.z + weave);
      const heading = weaving ? Math.atan2(Math.cos(t * 0.9 + i) * sway * 0.9, Math.abs(b.speed)) : 0;
      const along = Math.cos(pose.yaw) >= 0 ? 1 : -1;
      g.rotation.set(Math.sin(t * 0.9 + i) * b.bob * 0.12, pose.yaw - along * heading, Math.sin(t * 0.7 + i) * b.bob * 0.15 + (weaving ? -Math.cos(t * 0.9 + i) * 0.2 * pose.calm : 0));
    }
  });
  return (
    <group ref={root}>
      {fleet.map((b, i) => (
        <group
          key={i}
          name={b.kind}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          {b.kind === "speed" && <Speedboat color={b.color} night={dn.night} />}
          {b.kind === "trawler" && <Trawler night={dn.night} />}
          {b.kind === "sail" && <Sailboat color={b.color} night={dn.night} />}
          {b.kind === "princess" && <Princess night={dn.night} />}
          {b.kind === "laker" && <Laker night={dn.night} />}
          {b.kind === "jetski" && <JetSki color={b.color} night={dn.night} />}
        </group>
      ))}
    </group>
  );
}
