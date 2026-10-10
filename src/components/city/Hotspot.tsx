"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from "three";
import { SITE } from "@/content/site";
import { useCity } from "./CityContext";
import { HOLOGRAM_TIME } from "./HologramClock";
import { gradientColors } from "./instancing";
import { seedOf } from "./rng";
import type { Destination } from "./layout";

const BEACON_HEIGHT = 10;

const BEACON_COLUMN = gradientColors(new CylinderGeometry(0.12, 0.12, BEACON_HEIGHT, 8, 1, true), "y", -BEACON_HEIGHT / 2, BEACON_HEIGHT, 1.4);
const CRYSTAL = new OctahedronGeometry(1, 0).scale(1.1, 2.1, 1.1);

const hologramVert = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying float vY;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const hologramFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uScanSpeed;
  uniform float uSeed;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  varying float vY;
  #include <fog_pars_fragment>
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 1.6);
    float scan = 0.45 + 0.55 * step(0.45, fract(vY * 2.4 - uTime * uScanSpeed));
    float glitch = 1.0 - 0.6 * step(0.985, fract(sin(mod(floor(uTime * 14.0), 613.0) * 91.7 + uSeed * 17.3) * 43758.5)) * step(0.0001, uTime);
    float a = (0.22 + 0.78 * fres) * scan * glitch * uIntensity;
    #ifdef USE_FOG
      a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor = vec4(uColor * (1.1 + fres * 1.8), a);
    #include <colorspace_fragment>
  }
`;

function makeHologramMaterial(color: string, seed: number) {
  const mat = new ShaderMaterial({
    vertexShader: hologramVert,
    fragmentShader: hologramFrag,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uColor: { value: new Color(color) },
        uTime: { value: 0 },
        uIntensity: { value: 0.8 },
        uScanSpeed: { value: 0.6 },
        uSeed: { value: seed },
      },
    ]),
    fog: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  mat.uniforms.uTime = HOLOGRAM_TIME;
  return mat;
}

function tickHologram(mat: ShaderMaterial, hot: boolean, k: number) {
  const u = mat.uniforms;
  u.uIntensity.value = MathUtils.lerp(u.uIntensity.value, hot ? 1.6 : 0.8, k);
  u.uScanSpeed.value = MathUtils.lerp(u.uScanSpeed.value, hot ? 2.2 : 0.6, k);
}

function easeScale(g: Group, target: number, k: number) {
  const s = g.scale.x;
  if (s === target) return;
  const next = Math.abs(target - s) < 1e-4 ? target : MathUtils.lerp(s, target, k);
  g.scale.setScalar(next);
  g.updateMatrix();
}

interface HotspotProps {
  dest: Destination;
  position: [number, number, number];
  children: React.ReactNode;
}

export default function Hotspot({ dest, position, children }: HotspotProps) {
  const { hovered, setHovered, flyTo, navigating } = useCity();
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const crystal = useRef<Mesh>(null);
  const [hologram] = useState(() => makeHologramMaterial(dest.color, seedOf(dest.id) % 997));
  useEffect(() => () => hologram.dispose(), [hologram]);
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

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 10);
    if (inner.current) easeScale(inner.current, isHovered ? 1.035 : 1, k);
    if (crystal.current) {
      crystal.current.rotation.y = HOLOGRAM_TIME.value * 0.5;
      crystal.current.position.y = BEACON_HEIGHT + 2.65 + Math.sin(HOLOGRAM_TIME.value * 2.2) * 0.25;
    }
    tickHologram(hologram, isHovered, k);
    if (columnMat.current) {
      columnMat.current.opacity = MathUtils.lerp(columnMat.current.opacity, isHovered ? 0.9 : 0.55, k);
    }
    if (ring.current) {
      const target = isHovered ? 1 : 0;
      const s = MathUtils.lerp(ring.current.scale.x, target, k);
      ring.current.scale.set(s, s, s);
      ring.current.visible = s > 0.001;
      ring.current.rotation.z = HOLOGRAM_TIME.value * 0.6;
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (navigating) return;
    if (!SITE.navLocked) setLocal(true);
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
      <group ref={inner} matrixAutoUpdate={false} onPointerOver={over} onPointerOut={out} onClick={click}>
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
        <mesh ref={crystal} geometry={CRYSTAL} material={hologram} position={[0, BEACON_HEIGHT + 2.4, 0]} userData={{ noReflect: true }} />
      </group>
      <mesh ref={ring} position={[0, dest.markerHeight + BEACON_HEIGHT + 2.4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0} visible={false}>
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
          position={[0, dest.markerHeight + BEACON_HEIGHT + 7, 0]}
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
