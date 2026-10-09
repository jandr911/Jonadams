"use client";

import { Cloud, Clouds } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  DoubleSide,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { useDayNight } from "./DayNightContext";
import { mulberry32, range } from "./rng";
import { enableReflection } from "./layers";

const SKY_RADIUS = 1100;

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uNight;
  uniform vec3 uFog;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0
      ? mix(uHorizon, uZenith, pow(h, 0.5))
      : mix(uHorizon, uGround, pow(-h, 0.5));
    float haze = 1.0 - smoothstep(0.0, 0.16, h);
    col = mix(col, uFog, haze * 0.95);
    float s = max(dot(d, normalize(uSunDir)), 0.0);
    float glow = pow(s, 64.0) * 1.4 + pow(s, 8.0) * 0.22 + pow(s, 2.0) * 0.04;
    col += uSunColor * glow * mix(0.35, 1.0, uNight) * (1.0 - uNight * 0.75) * (1.0 - haze * 0.5);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const starVert = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uAlpha;
  varying float vA;
  void main() {
    float tw = 0.65 + 0.35 * sin(uTime * 1.7 + aPhase * 6.28318);
    vA = uAlpha * tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.8 + 0.4 * tw);
    gl_Position = projectionMatrix * mv;
  }
`;

const starFrag = /* glsl */ `
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.08, d) * vA;
    gl_FragColor = vec4(vec3(1.0, 0.98, 0.92) * 1.6, a);
  }
`;

function Dome() {
  const dn = useDayNight();
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uZenith: { value: new Color() },
          uHorizon: { value: new Color() },
          uGround: { value: new Color() },
          uSunDir: { value: new Vector3() },
          uSunColor: { value: new Color() },
          uNight: { value: 1 },
          uFog: { value: new Color() },
        },
      }),
    [],
  );
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    const m = ref.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    m.uniforms.uZenith.value.copy(dn.sky.zenith);
    m.uniforms.uHorizon.value.copy(dn.sky.horizon);
    m.uniforms.uGround.value.copy(dn.sky.ground);
    m.uniforms.uSunDir.value.set(...dn.sunDir);
    m.uniforms.uSunColor.value.copy(dn.sunColor);
    m.uniforms.uNight.value = dn.night;
    m.uniforms.uFog.value.copy(dn.fog);
  }, [dn]);
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    ref.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} material={mat} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[SKY_RADIUS, 48, 24]} />
    </mesh>
  );
}

function Stars() {
  const dn = useDayNight();
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(7);
    const n = 2200;
    const pos = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = rand();
      const v = rand();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(1 - v * 0.92);
      const r = SKY_RADIUS * 0.92;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) + 20;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      phase[i] = rand();
      size[i] = range(rand, 2.2, 5.2);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geometry.setAttribute("aPhase", new Float32BufferAttribute(phase, 1));
    geometry.setAttribute("aSize", new Float32BufferAttribute(size, 1));
    const material = new ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 } },
    });
    return { geometry, material };
  }, []);
  const ref = useRef<Points>(null);
  useEffect(() => {
    const m = ref.current?.material as ShaderMaterial | undefined;
    if (m) m.uniforms.uAlpha.value = dn.starAlpha;
  }, [dn]);
  const camera = useThree((s) => s.camera);
  useFrame(({ clock }) => {
    const p = ref.current;
    if (!p) return;
    (p.material as ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
    p.position.copy(camera.position);
  });
  return (
    <points
      ref={ref}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-9}
    />
  );
}

function SunAndMoon() {
  const dn = useDayNight();
  const sunPos = useMemo(() => {
    const v = new Vector3(...dn.sunDir).normalize().multiplyScalar(SKY_RADIUS * 0.8);
    return v;
  }, [dn.sunDir]);
  const moonPos = useMemo(
    () => new Vector3(-0.55, 0.58, -0.5).normalize().multiplyScalar(SKY_RADIUS * 0.8),
    [],
  );
  const group = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    group.current?.position.copy(camera.position);
  });
  const dayAmount = 1 - dn.night;
  return (
    <group ref={group}>
      <mesh position={sunPos} visible={dayAmount > 0.03}>
        <sphereGeometry args={[44, 24, 16]} />
        <meshBasicMaterial color={new Color("#fff3b0").multiplyScalar(1.35)} toneMapped={false} />
      </mesh>
      <mesh position={moonPos} visible={dn.night > 0.4}>
        <sphereGeometry args={[30, 24, 16]} />
        <meshBasicMaterial color={new Color("#f4eed7").multiplyScalar(1.35)} toneMapped={false} />
      </mesh>
      <mesh position={moonPos.clone().add(new Vector3(9, 6, 0))} visible={dn.night > 0.4}>
        <sphereGeometry args={[25, 24, 16]} />
        <meshBasicMaterial color="#0a0620" />
      </mesh>
    </group>
  );
}

const CLOUD_SPECS = (() => {
  const rand = mulberry32(21);
  const out: { x: number; y: number; z: number; w: number; seed: number; segments: number }[] = [];
  for (let i = 0; i < 6; i++) {
    out.push({ x: range(rand, -500, 500), y: range(rand, 330, 380), z: range(rand, -650, -180), w: range(rand, 60, 110), seed: i * 7 + 1, segments: 20 });
  }
  for (let i = 0; i < 2; i++) {
    out.push({ x: range(rand, -300, 300), y: range(rand, 340, 390), z: range(rand, 200, 420), w: range(rand, 55, 90), seed: 100 + i * 3, segments: 16 });
  }
  return out;
})();

function Cumulus() {
  const dn = useDayNight();
  const group = useRef<Group>(null);
  const tint = useMemo(() => {
    const dusk = Math.max(0, 1 - Math.abs(dn.night - 0.5) * 2.4);
    return new Color("#dfe2e6").lerp(new Color("#ffb48c"), dusk * 0.6).lerp(new Color("#2a2a58"), dn.night);
  }, [dn]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.position.x = -((clock.elapsedTime * 0.7) % 500) + 250;
  });
  return (
    <group ref={group}>
      <Clouds material={MeshBasicMaterial} limit={200} frustumCulled={false}>
        {CLOUD_SPECS.map((c, i) => (
          <Cloud
            key={i}
            seed={c.seed}
            segments={c.segments}
            bounds={[c.w, c.w * 0.32, c.w * 0.55]}
            volume={c.w * 0.95}
            position={[c.x, c.y, c.z]}
            color={tint}
            opacity={0.95 - dn.night * 0.35}
            speed={0.08}
            growth={10}
            fade={60}
          />
        ))}
      </Clouds>
    </group>
  );
}

const coverVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const coverFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  uniform vec3 uShade;
  uniform float uCoverage;
  uniform float uAlpha;
  uniform vec3 uSunDir;
  varying vec2 vUv;
  varying vec3 vWorld;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(17.0, 9.0);
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 p = vWorld.xz * 0.0022 + vec2(uTime * 0.006, uTime * 0.0015);
    float n = fbm(p);
    float cover = smoothstep(uCoverage, uCoverage + 0.22, n);
    vec2 toSun = normalize(uSunDir.xz + vec2(0.001)) * 0.03;
    float n2 = vnoise(p * 4.1 + toSun * 4.0 + vec2(17.0, 9.0)) * 0.125 + vnoise(p * 2.03 + toSun * 2.0 + vec2(17.0, 9.0)) * 0.25 + vnoise(p + toSun) * 0.5;
    float lit = clamp(0.55 + (n2 - n) * 9.0, 0.3, 1.15);
    vec3 col = mix(uShade, uTint, lit);
    float dist = length(vWorld.xz - cameraPosition.xz);
    float far = 1.0 - smoothstep(1800.0, 3600.0, dist);
    gl_FragColor = vec4(col, cover * uAlpha * far);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function CloudCover() {
  const dn = useDayNight();
  const ref = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: coverVert,
        fragmentShader: coverFrag,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uTint: { value: new Color("#e9ebee") },
          uShade: { value: new Color("#8d939e") },
          uCoverage: { value: 0.52 },
          uAlpha: { value: 0.85 },
          uSunDir: { value: new Vector3(0.5, 0.8, -0.3) },
        },
      }),
    [],
  );
  useEffect(() => {
    const m = ref.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    const dusk = Math.max(0, 1 - Math.abs(dn.night - 0.5) * 2.4);
    m.uniforms.uTint.value.set("#e9ebee").lerp(new Color("#ffc39a"), dusk * 0.7).lerp(new Color("#3a3a6a"), dn.night);
    m.uniforms.uShade.value.set("#8d939e").lerp(new Color("#c06a5a"), dusk * 0.6).lerp(new Color("#13142c"), dn.night);
    m.uniforms.uCoverage.value = 0.52 - (1 - dn.night) * 0.18;
    m.uniforms.uAlpha.value = 0.85 - dn.night * 0.35;
    m.uniforms.uSunDir.value.set(...dn.sunDir);
  }, [dn]);
  useFrame(({ clock }) => {
    const p = ref.current;
    if (!p) return;
    (p.material as ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh ref={ref} material={mat} rotation-x={-Math.PI / 2} position={[0, 520, 0]} frustumCulled={false} renderOrder={-5}>
      <planeGeometry args={[9000, 9000, 1, 1]} />
    </mesh>
  );
}

export default function Sky() {
  const root = useRef<Group>(null);
  useEffect(() => enableReflection(root.current), []);
  return (
    <group ref={root}>
      <Dome />
      <Stars />
      <SunAndMoon />
      <CloudCover />
      <Cumulus />
    </group>
  );
}
