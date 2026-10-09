"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial } from "three";
import { useCity } from "./CityContext";
import type { Destination } from "./layout";

interface HotspotProps {
  dest: Destination;
  position: [number, number, number];
  children: React.ReactNode;
}

export default function Hotspot({ dest, position, children }: HotspotProps) {
  const { hovered, setHovered, flyTo, navigating } = useCity();
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const arrow = useRef<Mesh>(null);
  const arrowMat = useRef<MeshStandardMaterial>(null);
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
    if (inner.current) {
      const s = MathUtils.lerp(inner.current.scale.x, isHovered ? 1.035 : 1, k);
      inner.current.scale.setScalar(s);
    }
    if (arrow.current) {
      arrow.current.position.y = dest.markerHeight + Math.sin(t * 2.2) * 0.8;
      arrow.current.rotation.y = t * 0.8;
    }
    if (arrowMat.current) {
      arrowMat.current.emissiveIntensity = MathUtils.lerp(
        arrowMat.current.emissiveIntensity,
        isHovered ? 4 : 1.4,
        k,
      );
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
      <mesh ref={arrow} position={[0, dest.markerHeight, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.6, 3.2, 4]} />
        <meshStandardMaterial
          ref={arrowMat}
          color={dest.color}
          emissive={dest.color}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
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
          </div>
        </Html>
      )}
    </group>
  );
}
