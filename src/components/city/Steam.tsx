"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  CircleGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Sphere,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from "three";
import { useDayNight } from "./DayNightContext";
import type { DayNight } from "./dayNight";
import { fillInstances } from "./instancing";
import { CITY_HALF_X, PEOPLE_MOVER_X, PEOPLE_MOVER_Z, RIVER_FAR, RIVER_NEAR, WOODWARD_INDEX, roadLinesX, roadLinesZ } from "./layout";
import { NOISE_GLSL } from "./noise";
import { mulberry32 } from "./rng";

const PUFFS_PER_VENT = 12;
const PLUME_HEIGHT = 14;
const STEAM_DAY = new Color("#d6d4cf");
const STEAM_NIGHT = new Color("#6e675c");
const MIST_COLOR = new Color("#8f97a3");
const MIST_LAYERS = [0.9, 2.6];

const steamVertex = /* glsl */ `
  uniform float uTime;
  attribute vec3 aVent;
  attribute float aPhase;
  attribute float aSeed;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vSeed;
  #include <fog_pars_vertex>

  void main() {
    float life = fract(uTime * 0.06 + aPhase);
    vec3 drift = vec3(sin(aSeed * 6.28 + uTime * 0.3), 0.0, cos(aSeed * 4.1 + uTime * 0.23)) * life * 1.4;
    vec3 center = aVent + vec3(0.0, 0.3 + life * ${PLUME_HEIGHT.toFixed(1)}, 0.0) + vec3(2.4, 0.0, -1.2) * life * life + drift;
    float size = mix(1.0, 6.0, sqrt(life));
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec4 mvPosition = viewMatrix * vec4(center + (right * position.x + up * position.y) * size, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    vSeed = aSeed;
    vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.4, 1.0, life));
    #include <fog_vertex>
  }
`;

const steamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vSeed;
  #include <fog_pars_fragment>
  ${NOISE_GLSL}

  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float n = vnoise(vUv * 3.0 + vSeed * 17.0) * 0.6 + vnoise(vUv * 7.0 - vSeed * 9.0) * 0.4;
    float a = (1.0 - smoothstep(0.3, 1.0, r + (n - 0.5) * 0.6)) * vAlpha * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const mistVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vUv;
  #include <fog_pars_vertex>

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vUv = uv;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const mistFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec3 vWorld;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  ${NOISE_GLSL}

  void main() {
    vec2 q = vWorld.xz * 0.025 + vec2(uTime * 0.012, uTime * 0.004) + vWorld.y * 3.1;
    float n = vnoise(q) * 0.55 + vnoise(q * 2.3 - uTime * 0.01) * 0.3 + vnoise(q * 5.1) * 0.15;
    float edges = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y)) * smoothstep(0.0, 0.1, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x));
    float a = smoothstep(0.35, 0.8, n) * edges * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function ventPositions(): Vector3[] {
  const xs = roadLinesX();
  const zs = roadLinesZ();
  const rand = mulberry32(313);
  const shuffled = <T,>(items: T[]) =>
    items
      .map((item) => ({ item, key: rand() }))
      .sort((a, b) => a.key - b.key)
      .map(({ item }) => item);
  const along = (count: number) => Array.from({ length: count - 1 }, (_, i) => i);
  const ns = xs
    .map((x, i) => ({ x, i }))
    .filter(({ i }) => i !== WOODWARD_INDEX && !PEOPLE_MOVER_X.includes(i))
    .flatMap(({ x }) => along(zs.length).map((j) => new Vector3(x, 0, (zs[j] + zs[j + 1]) / 2 + (rand() - 0.5) * 10)));
  const ew = zs
    .map((z, i) => ({ z, i }))
    .filter(({ i }) => !PEOPLE_MOVER_Z.includes(i))
    .flatMap(({ z }) => along(xs.length).map((j) => new Vector3((xs[j] + xs[j + 1]) / 2 + (rand() - 0.5) * 10, 0, z)));
  return [...shuffled(ns).slice(0, 5), ...shuffled(ew).slice(0, 3)];
}

function buildSteamGeometry(vents: Vector3[]) {
  const geo = new InstancedBufferGeometry();
  const quad = new PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute("position", quad.getAttribute("position"));
  geo.setAttribute("uv", quad.getAttribute("uv"));
  const count = vents.length * PUFFS_PER_VENT;
  const vent = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const seed = new Float32Array(count);
  const rand = mulberry32(911);
  vents.forEach((v, i) => {
    for (let p = 0; p < PUFFS_PER_VENT; p++) {
      const k = i * PUFFS_PER_VENT + p;
      v.toArray(vent, k * 3);
      phase[k] = p / PUFFS_PER_VENT + rand() * 0.05;
      seed[k] = rand();
    }
  });
  geo.setAttribute("aVent", new InstancedBufferAttribute(vent, 3));
  geo.setAttribute("aPhase", new InstancedBufferAttribute(phase, 1));
  geo.setAttribute("aSeed", new InstancedBufferAttribute(seed, 1));
  geo.instanceCount = count;
  const center = vents.reduce((acc, v) => acc.add(v), new Vector3()).divideScalar(vents.length);
  const radius = Math.max(...vents.map((v) => v.distanceTo(center))) + PLUME_HEIGHT + 8;
  geo.boundingSphere = new Sphere(center.setY(PLUME_HEIGHT / 2), radius);
  return geo;
}

function makeShader(vertexShader: string, fragmentShader: string, color: Color) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    transparent: true,
    depthWrite: false,
    uniforms: UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: color.clone() } }]),
  });
}

function setTime(mat: ShaderMaterial, t: number) {
  mat.uniforms.uTime.value = t;
}

function lightSteam(mat: ShaderMaterial, dn: DayNight) {
  (mat.uniforms.uColor.value as Color).copy(STEAM_DAY).lerp(STEAM_NIGHT, dn.night);
  mat.uniforms.uOpacity.value = 0.45 - dn.night * 0.1;
}

function lightMist(mat: ShaderMaterial, layers: (Mesh | null)[], dn: DayNight) {
  (mat.uniforms.uColor.value as Color).copy(dn.fog).multiplyScalar(1.3);
  mat.uniforms.uOpacity.value = dn.night * 0.22;
  for (const m of layers) if (m) m.visible = dn.night > 0.05;
}

function StreetSteam() {
  const dn = useDayNight();
  const [vents] = useState(ventPositions);
  const [geometry] = useState(() => buildSteamGeometry(vents));
  const [material] = useState(() => makeShader(steamVertex, steamFragment, STEAM_DAY));
  const [lid] = useState(() => new CircleGeometry(0.55, 12).rotateX(-Math.PI / 2));
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      lid.dispose();
    },
    [geometry, material, lid],
  );
  const lids = useRef<InstancedMesh>(null);
  useEffect(() => fillInstances(lids.current, vents.length, (i, o) => o.position.set(vents[i].x, 0.04, vents[i].z)), [vents]);
  useEffect(() => lightSteam(material, dn), [dn, material]);
  useFrame(({ clock }) => setTime(material, clock.elapsedTime));
  return (
    <group>
      <mesh geometry={geometry} material={material} userData={{ noCull: true }} renderOrder={2} />
      <instancedMesh ref={lids} args={[lid, undefined, vents.length]}>
        <meshStandardMaterial color="#2c2b29" roughness={0.6} metalness={0.6} />
      </instancedMesh>
    </group>
  );
}

function RiverMist() {
  const dn = useDayNight();
  const layers = useRef<(Mesh | null)[]>([]);
  const [material] = useState(() => makeShader(mistVertex, mistFragment, MIST_COLOR));
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => lightMist(material, layers.current, dn), [dn, material]);
  useFrame(({ clock }) => setTime(material, clock.elapsedTime));
  const width = CITY_HALF_X * 2 + 600;
  const depth = RIVER_FAR - RIVER_NEAR;
  return (
    <group>
      {MIST_LAYERS.map((y, i) => (
        <mesh
          key={y}
          ref={(el) => {
            layers.current[i] = el;
          }}
          material={material}
          position={[0, y, (RIVER_NEAR + RIVER_FAR) / 2]}
          rotation-x={-Math.PI / 2}
          renderOrder={2}
          userData={{ noCull: true }}
        >
          <planeGeometry args={[width, depth]} />
        </mesh>
      ))}
    </group>
  );
}

export default function Steam() {
  return (
    <group name="steam">
      <StreetSteam />
      <RiverMist />
    </group>
  );
}
