"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Group, MeshStandardMaterial } from "three";
import { useCity } from "./CityContext";
import { seedOf } from "./rng";

export const DISPLAY_FONT = "/fonts/BebasNeue-Regular.ttf";
export const SCRIPT_FONT = "/fonts/CormorantGaramond-Italic.ttf";

interface NeonSignProps {
  text: string;
  color: string;
  width: number;
  height: number;
  fontSize?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  blink?: "none" | "slow" | "fast" | "marquee";
  vertical?: boolean;
  font?: string;
  backing?: string;
  glow?: number;
  depth?: number;
  doubleSided?: boolean;
}

function setGlow(mat: MeshStandardMaterial, intensity: number) {
  mat.emissiveIntensity = intensity;
}

export default function NeonSign({
  text,
  color,
  width,
  height,
  fontSize,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  blink = "none",
  vertical = false,
  font = DISPLAY_FONT,
  backing = "#0c0a1e",
  glow = 2.6,
  depth = 0.6,
  doubleSided = false,
}: NeonSignProps) {
  const { reducedMotion } = useCity();
  const frameMat = useMemo(() => new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, toneMapped: false }), [color, glow]);
  useEffect(() => () => frameMat.dispose(), [frameMat]);
  const textGroups = useRef<(Group | null)[]>([]);
  const bright = useMemo(() => new Color(color).multiplyScalar(glow), [color, glow]);
  const phase = useMemo(() => ((seedOf(text) % 9973) / 9973) * 10, [text]);
  const content = vertical ? text.split("").join("\n") : text;
  const size = fontSize ?? (vertical ? width * 0.62 : Math.min(height * 0.62, (width / Math.max(text.length, 1)) * 2.1));

  useFrame(({ clock }) => {
    if (blink === "none") return;
    const t = clock.elapsedTime + phase;
    let on = 1;
    if (!reducedMotion && blink === "slow") on = Math.sin(t * 1.6) > -0.6 ? 1 : 0.15;
    else if (!reducedMotion && blink === "fast") on = Math.sin(t * 7) > 0 ? 1 : 0.2;
    else if (!reducedMotion && blink === "marquee") on = 0.75 + 0.25 * Math.sin(t * 3.2);
    setGlow(frameMat, glow * on);
    for (let i = 0; i < textGroups.current.length; i++) {
      const g = textGroups.current[i];
      if (!g) continue;
      g.scale.setScalar(0.96 + 0.04 * on);
      g.visible = on > 0.3;
    }
  });

  const bar = 0.12;
  const faces = doubleSided ? [0, Math.PI] : [0];
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={backing} roughness={0.7} />
      </mesh>
      {faces.map((ry, f) => (
        <group key={ry} rotation={[0, ry, 0]}>
          <group position={[0, 0, depth / 2 + 0.02]}>
            {[
              [0, height / 2 - bar / 2, width, bar],
              [0, -height / 2 + bar / 2, width, bar],
              [-width / 2 + bar / 2, 0, bar, height],
              [width / 2 - bar / 2, 0, bar, height],
            ].map(([x, y, w, h], i) => (
              <mesh key={i} position={[x, y, 0]} material={frameMat}>
                <boxGeometry args={[w, h, 0.08]} />
              </mesh>
            ))}
          </group>
          <group
            ref={(g) => {
              textGroups.current[f] = g;
            }}
            position={[0, 0, depth / 2 + 0.08]}>
            <Text
              font={font}
              fontSize={size}
              color={bright}
              anchorX="center"
              anchorY="middle"
              letterSpacing={font === SCRIPT_FONT ? 0.02 : 0.08}
              lineHeight={1.05}
              maxWidth={width * 0.94}
              textAlign="center"
              material-toneMapped={false}
            >
              {content}
            </Text>
          </group>
        </group>
      ))}
    </group>
  );
}
