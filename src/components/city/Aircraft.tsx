"use client";

import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CatmullRomCurve3, DoubleSide, Group, MathUtils, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from "three";
import { useDayNight } from "./DayNightContext";
import { labelTexture } from "./labels";
import { enableReflection } from "./layers";
import NeonSign from "./NeonSign";

function Searchlight({ length, radius, color, intensity }: { length: number; radius: number; color: string; intensity: number }) {
  return (
    <group>
      <mesh position={[0, -length / 2, 0]}>
        <coneGeometry args={[radius, length, 18, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.06 * intensity} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, -length * 0.5, 0]} scale={[0.45, 1, 0.45]}>
        <coneGeometry args={[radius, length, 14, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.09 * intensity} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={6 * intensity} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Strobe({ position, color, rate, offset = 0, size = 0.22, base = 0.3 }: { position: [number, number, number]; color: string; rate: number; offset?: number; size?: number; base?: number }) {
  const mat = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = Math.sin(clock.elapsedTime * rate + offset) > 0.75 ? 7 : base;
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 8, 6]} />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={base} toneMapped={false} />
    </mesh>
  );
}

function Glass() {
  return <meshStandardMaterial color="#49d2f2" roughness={0.05} metalness={0.3} transparent opacity={0.55} />;
}

function Pilot({ position, top = "#1d1d3f", rotation = 0 }: { position: [number, number, number]; top?: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.42, 0.55, 0.26]} />
        <meshStandardMaterial color={top} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.76, 0]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#e0ac7e" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.84, 0]}>
        <sphereGeometry args={[0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.4} />
      </mesh>
    </group>
  );
}

const BLIMP_MESSAGES = ["FLY AWAY WITH ADAMS", "J. ADAMS · NEW SINGLE OUT NOW", "CLUB ADAMS · TONIGHT · DETROIT"];

function Blimp() {
  const dn = useDayNight();
  const rig = useRef<Group>(null);
  const props = useRef<(Group | null)[]>([]);
  const surfaces = useRef<(Mesh | null)[]>([]);
  const beam = useRef<Group>(null);
  const [msg, setMsg] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsg((m) => (m + 1) % BLIMP_MESSAGES.length), 8000);
    return () => clearInterval(id);
  }, []);
  const nav = 0.4 + dn.night * 3;
  useFrame(({ clock }) => {
    const g = rig.current;
    if (!g) return;
    const t = clock.elapsedTime * 0.045;
    const r = 150;
    const x = Math.cos(t) * r;
    const z = -40 + Math.sin(t) * r * 0.55;
    g.position.set(x, 78 + Math.sin(clock.elapsedTime * 0.3) * 1.5, z);
    const heading = Math.atan2(-Math.sin(t) * r, Math.cos(t) * r * 0.55);
    g.rotation.y = MathUtils.lerp(g.rotation.y, heading + Math.PI / 2, 0.05);
    props.current.forEach((p) => {
      if (p) p.rotation.x = clock.elapsedTime * 22;
    });
    surfaces.current.forEach((s, i) => {
      if (s) s.rotation.y = Math.sin(clock.elapsedTime * 0.7 + i) * 0.18;
    });
    if (beam.current) beam.current.rotation.set(Math.sin(clock.elapsedTime * 0.35) * 0.35, 0, Math.cos(clock.elapsedTime * 0.27) * 0.4);
  });
  return (
    <group ref={rig} name="blimp">
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.6}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[5, 20, 12, 28]} />
          <meshStandardMaterial color="#8fa3c8" roughness={0.32} metalness={0.25} />
        </mesh>
        {[-9, -6, -3, 0, 3, 6, 9].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[5.03, 0.07, 6, 36]} />
            <meshStandardMaterial color="#6e82ab" roughness={0.6} />
          </mesh>
        ))}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <mesh key={`seam${k}`} rotation={[(k / 6) * Math.PI, 0, 0]} position={[0, 5.02, 0]}>
            <boxGeometry args={[19, 0.05, 0.05]} />
            <meshStandardMaterial color="#6e82ab" />
          </mesh>
        ))}
        <mesh position={[4.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[5.05, 0.42, 8, 40]} />
          <meshStandardMaterial color="#d6b56e" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[-11.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[4.4, 0.3, 8, 36]} />
          <meshStandardMaterial color="#ff4fa3" roughness={0.5} />
        </mesh>
        <mesh position={[15.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[1.4, 1.6, 12]} />
          <meshStandardMaterial color="#1d1d3f" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[16.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 1.2, 6]} />
          <meshStandardMaterial color="#c8ccd8" metalness={0.8} />
        </mesh>
        {[-4, 2].map((x) => (
          <mesh key={x} position={[x, 5.6, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 4]} />
            <meshStandardMaterial color="#c8ccd8" />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[-13, 0, 0]} rotation={[(i * Math.PI) / 2, 0, 0]}>
            <mesh position={[0, 5.4, 0]}>
              <boxGeometry args={[6.4, 6.2, 0.35]} />
              <meshStandardMaterial color="#6e82ab" roughness={0.6} />
            </mesh>
            <mesh position={[-2.6, 6.2, 0]}>
              <boxGeometry args={[1.2, 4.4, 0.4]} />
              <meshStandardMaterial color="#c8102e" roughness={0.6} />
            </mesh>
            <mesh
              ref={(el) => {
                surfaces.current[i] = el;
              }}
              position={[-3.9, 6.0, 0]}
            >
              <boxGeometry args={[1.4, 4.0, 0.3]} />
              <meshStandardMaterial color="#5e6f96" roughness={0.6} />
            </mesh>
            <mesh position={[-0.5, 8.6, 0]}>
              <sphereGeometry args={[0.16, 6, 6]} />
              <meshStandardMaterial color={i % 2 ? "#ff2a3c" : "#ffffff"} emissive={i % 2 ? "#ff2a3c" : "#ffffff"} emissiveIntensity={nav} toneMapped={false} />
            </mesh>
          </group>
        ))}
        <group position={[0, -5.9, 0]}>
          <mesh>
            <boxGeometry args={[7.6, 2.2, 2.8]} />
            <meshStandardMaterial color="#1d1d3f" roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, -0.6, 0]}>
            <boxGeometry args={[7.64, 0.18, 2.84]} />
            <meshStandardMaterial color="#d6b56e" roughness={0.3} metalness={0.7} />
          </mesh>
          {[-1, 1].map((s) =>
            [-2.6, -1.3, 0, 1.3, 2.6].map((x) => (
              <mesh key={`${s}${x}`} position={[x, 0.35, s * 1.41]}>
                <boxGeometry args={[0.9, 0.7, 0.04]} />
                <meshStandardMaterial color="#1d2a3a" emissive="#ffd27a" emissiveIntensity={0.3 + dn.night * 2} roughness={0.1} metalness={0.5} toneMapped={false} />
              </mesh>
            )),
          )}
          <mesh position={[3.81, 0.35, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[2.4, 0.8, 0.04]} />
            <meshStandardMaterial color="#1d2a3a" emissive="#ffd27a" emissiveIntensity={0.3 + dn.night * 2} roughness={0.1} metalness={0.5} toneMapped={false} />
          </mesh>
          <Pilot position={[2.9, -0.6, -0.5]} rotation={-Math.PI / 2} />
          <Pilot position={[2.9, -0.6, 0.5]} rotation={-Math.PI / 2} top="#d6b56e" />
          <mesh position={[-3.2, -0.2, 1.42]}>
            <boxGeometry args={[0.9, 1.6, 0.03]} />
            <meshStandardMaterial color="#0e0e14" />
          </mesh>
          <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.3, 10]} />
            <meshStandardMaterial color="#15151c" roughness={0.9} />
          </mesh>
          <mesh position={[0, -1.2, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.2]} />
            <meshStandardMaterial color="#3a3a58" />
          </mesh>
          {[-1, 1].map((side, k) => (
            <group key={side} position={[-1.2, 0.2, side * 2.6]}>
              <mesh position={[0, 0, -side * 0.8]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 1.6, 6]} />
                <meshStandardMaterial color="#3a3a58" />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.55, 0.6, 2, 12]} />
                <meshStandardMaterial color="#3a3a58" metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.58, 0.05, 6, 16]} />
                <meshStandardMaterial color="#d6b56e" metalness={0.7} roughness={0.3} />
              </mesh>
              <group
                ref={(el) => {
                  props.current[k] = el;
                }}
                position={[-1.15, 0, 0]}
              >
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.14, 0.14, 0.2, 8]} />
                  <meshStandardMaterial color="#15151c" />
                </mesh>
                <mesh>
                  <boxGeometry args={[0.08, 2.6, 0.22]} />
                  <meshStandardMaterial color="#c8ccd8" metalness={0.6} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <boxGeometry args={[0.08, 2.6, 0.22]} />
                  <meshStandardMaterial color="#c8ccd8" metalness={0.6} />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]}>
                  <circleGeometry args={[1.3, 20]} />
                  <meshBasicMaterial color="#c8ccd8" transparent opacity={0.12} side={DoubleSide} />
                </mesh>
              </group>
            </group>
          ))}
          <group ref={beam} position={[1.5, -1.2, 0]}>
            <Searchlight length={95} radius={14} color="#ffe6a8" intensity={0.25 + dn.night} />
          </group>
        </group>
        <NeonSign text={BLIMP_MESSAGES[msg]} color={msg === 1 ? "#ff8ac2" : msg === 2 ? "#f3dfae" : "#49f2d6"} width={20} height={2.6} fontSize={1.7} position={[0, 0.4, 0]} depth={10.4} backing="#101028" blink="marquee" doubleSided />
        <mesh position={[0, 0, 5.2]}>
          <sphereGeometry args={[0.22, 6, 6]} />
          <meshStandardMaterial color="#2aff7a" emissive="#2aff7a" emissiveIntensity={nav} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -5.2]}>
          <sphereGeometry args={[0.22, 6, 6]} />
          <meshStandardMaterial color="#ff2a3c" emissive="#ff2a3c" emissiveIntensity={nav} toneMapped={false} />
        </mesh>
        <Strobe position={[-15.6, 0, 0]} color="#ffffff" rate={6} size={0.28} />
        <Strobe position={[0, 5.3, 0]} color="#ff2a3c" rate={4} offset={1.2} />
      </Float>
    </group>
  );
}

function Helicopter() {
  const dn = useDayNight();
  const rig = useRef<Group>(null);
  const body = useRef<Group>(null);
  const rotor = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const tailTex = useMemo(() => labelTexture("ADAMS AIR", { width: 512, height: 256, bg: "#1d1d3f", fg: "#f3dfae", border: "#d6b56e", size: 120 }), []);
  const path = useMemo(
    () =>
      new CatmullRomCurve3(
        [new Vector3(-220, 70, 40), new Vector3(-80, 85, -120), new Vector3(120, 78, -90), new Vector3(200, 72, 60), new Vector3(40, 66, 110)],
        true,
        "catmullrom",
        0.4,
      ),
    [],
  );
  const tmp = useMemo(() => ({ p: new Vector3(), t: new Vector3(), t2: new Vector3(), look: new Vector3() }), []);
  useFrame(({ clock }) => {
    const g = rig.current;
    if (!g) return;
    const u = (clock.elapsedTime * 0.012) % 1;
    path.getPointAt(u, tmp.p);
    path.getTangentAt(u, tmp.t);
    path.getTangentAt((u + 0.01) % 1, tmp.t2);
    g.position.copy(tmp.p);
    tmp.look.copy(tmp.p).add(tmp.t);
    g.lookAt(tmp.look);
    const turn = tmp.t.x * tmp.t2.z - tmp.t.z * tmp.t2.x;
    if (body.current) {
      body.current.rotation.x = 0.1;
      body.current.rotation.z = MathUtils.lerp(body.current.rotation.z, MathUtils.clamp(turn * 28, -0.45, 0.45), 0.05);
    }
    if (rotor.current) rotor.current.rotation.y = clock.elapsedTime * 32;
    if (tail.current) tail.current.rotation.x = clock.elapsedTime * 44;
    if (beam.current) beam.current.rotation.set(0.35 + Math.sin(clock.elapsedTime * 0.5) * 0.25, 0, Math.sin(clock.elapsedTime * 0.37) * 0.3);
  });
  const nav = 0.4 + dn.night * 3;
  return (
    <group ref={rig} name="helicopter">
      <group ref={body}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[1.25, 2.6, 8, 16]} />
          <meshStandardMaterial color="#1d1d3f" roughness={0.3} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.0, 0.2]}>
          <boxGeometry args={[2.56, 0.12, 2.6]} />
          <meshStandardMaterial color="#d6b56e" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.25, 1.55]}>
          <sphereGeometry args={[1.12, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <Glass />
        </mesh>
        <mesh position={[0, 0.3, 1.55]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.1, 0.04, 6, 24, Math.PI]} />
          <meshStandardMaterial color="#15151c" />
        </mesh>
        <Pilot position={[-0.45, -0.4, 0.9]} />
        <Pilot position={[0.45, -0.4, 0.9]} top="#d6b56e" />
        <mesh position={[0, 0.1, 1.9]}>
          <boxGeometry args={[1.2, 0.3, 0.3]} />
          <meshStandardMaterial color="#15151c" emissive="#49f2d6" emissiveIntensity={dn.night * 1.2} toneMapped={false} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 1.22, 0.15, -0.3]}>
              <boxGeometry args={[0.06, 1.2, 1.2]} />
              <Glass />
            </mesh>
            <mesh position={[s * 1.25, 0.15, -0.3]}>
              <boxGeometry args={[0.03, 1.3, 1.3]} />
              <meshStandardMaterial color="#15151c" transparent opacity={0.0} />
            </mesh>
            <mesh position={[s * 1.26, -0.2, -0.3]}>
              <boxGeometry args={[0.03, 1.9, 1.3]} />
              <meshStandardMaterial color="#d6b56e" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[s * 1.29, -0.5, 0.1]}>
              <boxGeometry args={[0.03, 0.05, 0.25]} />
              <meshStandardMaterial color="#c8ccd8" metalness={0.9} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.85, 0.2]}>
          <boxGeometry args={[2.2, 0.5, 3.4]} />
          <meshStandardMaterial color="#15151c" roughness={0.8} />
        </mesh>
        <mesh position={[0, -1.1, 1.8]}>
          <boxGeometry args={[0.5, 0.16, 0.3]} />
          <meshStandardMaterial color="#fff6d8" emissive="#fff2c0" emissiveIntensity={0.3 + dn.night * 4} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.15, -0.4]}>
          <boxGeometry args={[1.7, 0.6, 2.8]} />
          <meshStandardMaterial color="#2a2a44" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.2, 1.1]}>
          <boxGeometry args={[1.2, 0.4, 0.4]} />
          <meshStandardMaterial color="#0e0e14" />
        </mesh>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, 1.25, -1.9]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 0.7, 8]} />
            <meshStandardMaterial color="#3a3a46" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, -4.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.72, 6.4, 12]} />
          <meshStandardMaterial color="#1d1d3f" roughness={0.3} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.5, -4.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.33, 0.74, 5.6, 12, 1, true]} />
          <meshStandardMaterial color="#d6b56e" roughness={0.3} metalness={0.7} transparent opacity={0.0} />
        </mesh>
        <mesh position={[0, 1.4, -7.4]}>
          <boxGeometry args={[0.14, 2.2, 1.1]} />
          <meshStandardMaterial color="#1d1d3f" roughness={0.4} metalness={0.5} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.08, 1.45, -7.4]} rotation={[0, s * (Math.PI / 2), 0]}>
            <planeGeometry args={[0.9, 1.2]} />
            <meshStandardMaterial map={tailTex} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.6, -6.2]}>
          <boxGeometry args={[2.6, 0.1, 0.7]} />
          <meshStandardMaterial color="#1d1d3f" />
        </mesh>
        {[-1.3, 1.3].map((x) => (
          <mesh key={x} position={[x, 0.85, -6.2]}>
            <boxGeometry args={[0.08, 0.5, 0.6]} />
            <meshStandardMaterial color="#d6b56e" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, -0.1, -7.6]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
          <meshStandardMaterial color="#5a5a78" />
        </mesh>
        <group ref={tail} position={[0.3, 1.5, -7.6]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.3, 8]} />
            <meshStandardMaterial color="#3a3a58" />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
              <boxGeometry args={[0.06, 1.9, 0.26]} />
              <meshStandardMaterial color="#9a95a8" />
            </mesh>
          ))}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[1.0, 20]} />
            <meshBasicMaterial color="#c8ccd8" transparent opacity={0.16} side={DoubleSide} />
          </mesh>
        </group>
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.14, 0.18, 0.7, 8]} />
          <meshStandardMaterial color="#3a3a58" metalness={0.6} />
        </mesh>
        <mesh position={[0.6, 1.5, -0.6]}>
          <cylinderGeometry args={[0.02, 0.02, 1.0, 4]} />
          <meshStandardMaterial color="#c8ccd8" />
        </mesh>
        <mesh position={[-0.5, 1.5, 0.8]}>
          <cylinderGeometry args={[0.12, 0.12, 0.06, 8]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
        <group ref={rotor} position={[0, 2.0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.34, 10]} />
            <meshStandardMaterial color="#3a3a58" metalness={0.6} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.cos((i * Math.PI) / 2) * 0.55, 0, -Math.sin((i * Math.PI) / 2) * 0.55]}>
              <boxGeometry args={[0.4, 0.16, 0.22]} />
              <meshStandardMaterial color="#15151c" />
            </mesh>
          ))}
          <mesh>
            <boxGeometry args={[10, 0.07, 0.44]} />
            <meshStandardMaterial color="#9a95a8" />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[10, 0.07, 0.44]} />
            <meshStandardMaterial color="#9a95a8" />
          </mesh>
          {[-4.95, 4.95].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <sphereGeometry args={[0.08, 5, 5]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={dn.night * 6} toneMapped={false} />
            </mesh>
          ))}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
            <circleGeometry args={[5, 28]} />
            <meshBasicMaterial color="#c8ccd8" transparent opacity={0.1} side={DoubleSide} />
          </mesh>
        </group>
        {[-1, 1].map((s) => (
          <group key={`skid${s}`} position={[s * 1.05, -1.75, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 4, 8]} />
              <meshStandardMaterial color="#5a5a78" metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.25, 2.2]} rotation={[0.9, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.7, 8]} />
              <meshStandardMaterial color="#5a5a78" metalness={0.5} />
            </mesh>
            {[-1.1, 1.1].map((z) => (
              <mesh key={z} position={[-s * 0.3, 0.55, z]} rotation={[0, 0, s * 0.45]}>
                <cylinderGeometry args={[0.06, 0.06, 1.3, 6]} />
                <meshStandardMaterial color="#5a5a78" metalness={0.5} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[-1.3, 0.3, 0.6]}>
          <sphereGeometry args={[0.16, 6, 6]} />
          <meshStandardMaterial color="#ff2a3c" emissive="#ff2a3c" emissiveIntensity={nav} toneMapped={false} />
        </mesh>
        <mesh position={[1.3, 0.3, 0.6]}>
          <sphereGeometry args={[0.16, 6, 6]} />
          <meshStandardMaterial color="#2aff7a" emissive="#2aff7a" emissiveIntensity={nav} toneMapped={false} />
        </mesh>
        <Strobe position={[0, 2.6, -7.5]} color="#ffffff" rate={7} size={0.16} base={0.5} />
        <Strobe position={[0, -1.15, 0.4]} color="#ff2a3c" rate={10} size={0.2} />
        <group ref={beam} position={[0, -1.0, 1.6]}>
          <Searchlight length={80} radius={9} color="#eaf4ff" intensity={0.3 + dn.night} />
        </group>
      </group>
    </group>
  );
}

function rippleBanner(geo: PlaneGeometry, t: number) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin(x * 0.45 - t * 5) * 0.28 * (0.3 + (x + 15) / 30));
  }
  pos.needsUpdate = true;
}

function BannerPlane() {
  const dn = useDayNight();
  const rig = useRef<Group>(null);
  const prop = useRef<Group>(null);
  const banner = useRef<Group>(null);
  const bannerGeo = useMemo(() => new PlaneGeometry(30, 4, 30, 1), []);
  const tex = useMemo(() => labelTexture("J. ADAMS · LIVE AT CLUB ADAMS · DETROIT", { width: 2048, height: 256, bg: "#07060f", fg: "#f3dfae", border: "#d6b56e", size: 150 }), []);
  const nav = 0.4 + dn.night * 3;
  useFrame(({ clock }) => {
    const g = rig.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const a = -t * 0.032 + 1.5;
    const rx = 330;
    const rz = 210;
    g.position.set(Math.cos(a) * rx, 96 + Math.sin(t * 0.4) * 2, 30 + Math.sin(a) * rz);
    const vx = 0.032 * Math.sin(a) * rx;
    const vz = -0.032 * Math.cos(a) * rz;
    g.rotation.set(0, Math.atan2(-vz, vx), 0);
    g.rotateZ(-0.12);
    if (prop.current) prop.current.rotation.x = t * 40;
    if (banner.current) {
      banner.current.rotation.set(0, Math.sin(t * 0.5) * 0.06, Math.sin(t * 0.7) * 0.05);
      rippleBanner(bannerGeo, t);
    }
  });
  return (
    <group ref={rig} name="plane">
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.75, 3.6, 6, 12]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0.2, 0.2, 0]}>
        <boxGeometry args={[2.4, 1.3, 1.5]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[5.2, 0.2, 1.56]} />
        <meshStandardMaterial color="#d6b56e" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[1.3, 0.5, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.06, 1.0, 1.3]} />
        <Glass />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.1, 0.45, s * 0.76]}>
          <boxGeometry args={[1.4, 0.6, 0.04]} />
          <Glass />
        </mesh>
      ))}
      <Pilot position={[0.2, -0.25, 0]} rotation={-Math.PI / 2} />
      <mesh position={[2.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.75, 0.9, 12]} />
        <meshStandardMaterial color="#1d1d3f" roughness={0.3} metalness={0.6} />
      </mesh>
      <group ref={prop} position={[3.3, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.3, 8]} />
          <meshStandardMaterial color="#c8ccd8" metalness={0.8} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.06, 3.0, 0.22]} />
          <meshStandardMaterial color="#15151c" />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[1.5, 20]} />
          <meshBasicMaterial color="#c8ccd8" transparent opacity={0.14} side={DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0.3, 1.0, 0]}>
        <boxGeometry args={[1.7, 0.14, 11]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0.9, 1.0, 0]}>
        <boxGeometry args={[0.1, 0.16, 11]} />
        <meshStandardMaterial color="#d6b56e" roughness={0.3} metalness={0.7} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.2, 0.3, s * 2.4]} rotation={[s * 0.5, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.2, 5]} />
          <meshStandardMaterial color="#9a95a8" />
        </mesh>
      ))}
      <mesh position={[-2.6, 0.2, 0]}>
        <boxGeometry args={[1.0, 0.1, 3.6]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[-2.5, 0.9, 0]}>
        <boxGeometry args={[1.1, 1.5, 0.1]} />
        <meshStandardMaterial color="#d6b56e" roughness={0.3} metalness={0.7} />
      </mesh>
      {[[1.4, -1, 0.8], [1.4, -1, -0.8], [2.4, -1, 0]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.16, 10]} />
            <meshStandardMaterial color="#15151c" />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[0.08, 0.7, 0.08]} />
            <meshStandardMaterial color="#9a95a8" />
          </mesh>
        </group>
      ))}
      <mesh position={[0.3, 1.0, 5.5]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial color="#2aff7a" emissive="#2aff7a" emissiveIntensity={nav} toneMapped={false} />
      </mesh>
      <mesh position={[0.3, 1.0, -5.5]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial color="#ff2a3c" emissive="#ff2a3c" emissiveIntensity={nav} toneMapped={false} />
      </mesh>
      <Strobe position={[-2.5, 1.7, 0]} color="#ffffff" rate={8} size={0.12} base={0.4} />
      <Strobe position={[0.2, -0.9, 0]} color="#ff2a3c" rate={6} size={0.12} />
      <mesh position={[-11.5, -0.4, 0]} rotation={[0, 0, Math.PI / 2 + 0.06]}>
        <cylinderGeometry args={[0.02, 0.02, 18, 4]} />
        <meshStandardMaterial color="#c8ccd8" />
      </mesh>
      <group ref={banner} position={[-35.5, -1.2, 0]}>
        <mesh geometry={bannerGeo}>
          <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3 + dn.night * 1.2} roughness={0.8} toneMapped={false} />
        </mesh>
        <mesh geometry={bannerGeo} rotation={[0, Math.PI, 0]} position={[0, 0, -0.02]}>
          <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.3 + dn.night * 1.2} roughness={0.8} toneMapped={false} />
        </mesh>
        <mesh position={[15, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 4.2, 6]} />
          <meshStandardMaterial color="#d6b56e" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export default function Aircraft() {
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  return (
    <group ref={root}>
      <Blimp />
      <Helicopter />
      <BannerPlane />
    </group>
  );
}
