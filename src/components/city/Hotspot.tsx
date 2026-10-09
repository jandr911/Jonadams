"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from "three";
import { useCity } from "./CityContext";
import type { Destination } from "./layout";

const BEACON_HEIGHT = 10;

function makeBeaconColumn() {
  const geo = new CylinderGeometry(0.12, 0.12, BEACON_HEIGHT, 8, 1, true);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.pow((pos.getY(i) + BEACON_HEIGHT / 2) / BEACON_HEIGHT, 1.4);
    colors[i * 3] = a;
    colors[i * 3 + 1] = a;
    colors[i * 3 + 2] = a;
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}

const BEACON_COLUMN = makeBeaconColumn();

interface HotspotProps {
  dest: Destination;
  position: [number, number, number];
  children: React.ReactNode;
}

export default function Hotspot({ dest, position, children }: HotspotProps) {
  const { hovered, setHovered, flyTo, navigating } = useCity();
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const tip = useRef<Mesh>(null);
  const tipMat = useRef<MeshStandardMaterial>(null);
  const columnMat = useRef<MeshBasicMaterial>(null);
  const ring = useRef<Mesh>(null);
  const [local, setLocal] = useState(false);
  const isHovered = hovered?.id === dest.id;

  useEffect(() => {
    document.body.style.cursor = local ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [local]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 10);
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    if (inner.current) {
      const s = MathUtils.lerp(inner.current.scale.x, isHovered ? 1.035 : 1, k);
      inner.current.scale.setScalar(s);
    }
    if (tip.current) {
      tip.current.scale.setScalar(0.9 + pulse * 0.25);
    }
    if (tipMat.current) {
      tipMat.current.emissiveIntensity = MathUtils.lerp(
        tipMat.current.emissiveIntensity,
        (isHovered ? 4 : 1.4) + pulse * 0.6,
        k,
      );
    }
    if (columnMat.current) {
      columnMat.current.opacity = MathUtils.lerp(columnMat.current.opacity, isHovered ? 0.9 : 0.55, k);
    }
    if (ring.current) {
      const target = isHovered ? 1 : 0;
      const s = MathUtils.lerp(ring.current.scale.x, target, k);
      ring.current.scale.set(s, s, s);
      ring.current.rotation.z = t * 0.6;
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (navigating) return;
    setLocal(true);
    setHovered(dest);
  };
  const out = () => {
    setLocal(false);
    setHovered(null);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (navigating) return;
    flyTo(dest);
  };

  return (
    <group ref={group} position={position}>
      <group ref={inner} onPointerOver={over} onPointerOut={out} onClick={click}>
        {children}
      </group>
      <group position={[0, dest.markerHeight, 0]}>
        <mesh geometry={BEACON_COLUMN} position={[0, BEACON_HEIGHT / 2, 0]} userData={{ noReflect: true }}>
          <meshBasicMaterial
            ref={columnMat}
            color={dest.color}
            vertexColors
            transparent
            opacity={0.55}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={tip} position={[0, BEACON_HEIGHT, 0]}>
          <sphereGeometry args={[0.42, 10, 8]} />
          <meshStandardMaterial
            ref={tipMat}
            color={dest.color}
            emissive={dest.color}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh ref={ring} position={[0, dest.markerHeight + 4.6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0}>
        <torusGeometry args={[3.4, 0.22, 8, 32]} />
        <meshStandardMaterial
          color={dest.color}
          emissive={new Color(dest.color)}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      {isHovered && !navigating && (
        <Html
          position={[0, dest.markerHeight + 7.5, 0]}
          center
          distanceFactor={90}
          style={{ pointerEvents: "none" }}
          zIndexRange={[50, 0]}
        >
          <div className="hotspot-label" style={{ ["--c" as string]: dest.color }}>
            <strong>{dest.label}</strong>
            <span>{dest.sub}</span>
            <em>{dest.blurb}</em>
          </div>
        </Html>
      )}
    </group>
  );
}
