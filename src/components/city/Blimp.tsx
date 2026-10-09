"use client";

import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, MathUtils } from "three";
import NeonSign from "./NeonSign";

export default function Blimp() {
  const rig = useRef<Group>(null);
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
  });
  return (
    <group ref={rig}>
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.6}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[5, 20, 8, 20]} />
          <meshStandardMaterial color="#8fa3c8" roughness={0.5} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-14, 0, 0]} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
            <boxGeometry args={[6, 7, 0.4]} />
            <meshStandardMaterial color="#6e82ab" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -5.6, 0]}>
          <boxGeometry args={[7, 2, 2.6]} />
          <meshStandardMaterial color="#1d1d3f" roughness={0.6} />
        </mesh>
        <NeonSign
          text="FLY AWAY WITH ADAMS"
          color="#49f2d6"
          width={20}
          height={2.6}
          fontSize={1.7}
          position={[0, 0.4, 0]}
          depth={10.4}
          backing="#101028"
          blink="marquee"
          doubleSided
        />
        <mesh position={[0, -7.2, 0]}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshStandardMaterial color="#ff4d6d" emissive="#ff4d6d" emissiveIntensity={4} toneMapped={false} />
        </mesh>
      </Float>
    </group>
  );
}
