"use client";

import { useEffect, useState } from "react";
import { BoxGeometry, MeshStandardMaterial, type BufferGeometry, type Texture } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useDayNight } from "./DayNightContext";
import { labelTexture } from "./labels";

const FLOODLIGHT = "#ffd9a8";
const LAMP_HOOD = "#2a2724";
const LAMP_HEAD = new BoxGeometry(0.7, 0.18, 0.45);
const LAMP_SPACING = 5;

interface PaintedSignProps {
  text?: string;
  texture?: Texture;
  bg?: string;
  fg?: string;
  border?: string;
  width: number;
  height: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  depth?: number;
  doubleSided?: boolean;
}

function makeFace(map: Texture) {
  return new MeshStandardMaterial({ map, emissiveMap: map, emissive: FLOODLIGHT, emissiveIntensity: 0, roughness: 0.85 });
}

function makeLamp() {
  return new MeshStandardMaterial({ color: "#fff1d0", emissive: FLOODLIGHT, emissiveIntensity: 0, toneMapped: false });
}

function lampHeads(width: number, height: number, depth: number, sides: number[]): BufferGeometry {
  const count = Math.max(2, Math.round(width / LAMP_SPACING));
  const parts = sides.flatMap((ry) =>
    Array.from({ length: count }, (_, k) =>
      LAMP_HEAD.clone()
        .translate(-width / 2 + ((k + 0.5) * width) / count, height / 2 + 0.35, depth / 2 + 0.6)
        .rotateY(ry),
    ),
  );
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error("sign lamp heads could not be merged");
  return merged;
}

function light(face: MeshStandardMaterial, lamp: MeshStandardMaterial, night: number) {
  face.emissiveIntensity = 0.04 + night * 0.5;
  lamp.emissiveIntensity = 0.1 + night * 1.6;
}

export default function PaintedSign({
  text = "",
  texture,
  bg = "#e6dbc2",
  fg = "#1f1d1b",
  border,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  depth = 0.4,
  doubleSided = false,
}: PaintedSignProps) {
  const dn = useDayNight();
  const [map] = useState(
    () => texture ?? labelTexture(text, { width: 512, height: Math.max(64, Math.min(512, Math.round((512 * height) / width))), bg, fg, border, weathered: true }),
  );
  const [face] = useState(() => makeFace(map));
  const [lamp] = useState(makeLamp);
  const [sides] = useState(() => (doubleSided ? [0, Math.PI] : [0]));
  const [heads] = useState(() => lampHeads(width, height, depth, sides));
  useEffect(
    () => () => {
      face.dispose();
      lamp.dispose();
      heads.dispose();
    },
    [face, lamp, heads],
  );
  useEffect(() => light(face, lamp, dn.night), [dn, face, lamp]);
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[width + 0.3, height + 0.3, depth]} />
        <meshStandardMaterial color={LAMP_HOOD} roughness={0.9} />
      </mesh>
      {sides.map((ry) => (
        <group key={ry} rotation={[0, ry, 0]}>
          <mesh position={[0, 0, depth / 2 + 0.01]} material={face}>
            <planeGeometry args={[width, height]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={heads} material={lamp} />
    </group>
  );
}
