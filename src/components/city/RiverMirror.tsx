"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { useDayNight } from "./DayNightContext";
import { makeMirrorScratch, renderMirror, type MirrorScratch } from "./mirrorRender";

const vert = /* glsl */ `
  uniform mat4 uTextureMatrix;
  varying vec4 vMirror;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vMirror = uTextureMatrix * wp;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uMirror;
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec2 uShore;
  uniform float uNight;
  varying vec4 vMirror;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

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

  void main() {
    vec2 p = vWorld.xz * 0.12;
    float n1 = vnoise(p + vec2(uTime * 0.25, uTime * 0.11));
    float n2 = vnoise(p * 2.3 - vec2(uTime * 0.17, uTime * 0.21));
    float n3 = vnoise(p * 7.0 + vec2(-uTime * 0.5, uTime * 0.33));
    float far = smoothstep(30.0, 420.0, length(cameraPosition - vWorld));
    vec4 uv = vMirror;
    uv.x += ((n1 - 0.5) * 0.005 + (n3 - 0.5) * 0.003) * uv.w;
    uv.y += ((n2 - 0.5) * (0.006 + far * 0.008) * (1.0 + uNight * 1.6) + (n3 - 0.5) * 0.003) * uv.w;
    vec3 refl = texture2DProj(uMirror, uv, far * 0.5).rgb;
    refl = refl / (1.0 + refl * 0.45);
    float reflLum = dot(refl, vec3(0.3, 0.59, 0.11));
    refl = mix(vec3(reflLum), refl, 0.7);
    refl *= mix(1.0, smoothstep(0.04, 0.3, reflLum), uNight * 0.75);

    vec3 v = normalize(cameraPosition - vWorld);
    vec3 n = normalize(vec3((n1 - 0.5) * 0.25 + (n3 - 0.5) * 0.35, 1.0, (n2 - 0.5) * 0.25 + (n3 - 0.5) * 0.35));
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);
    vec3 hv = normalize(normalize(uSunDir) + v);
    float spec = pow(max(dot(n, hv), 0.0), 60.0);

    float chop = smoothstep(0.3, 0.75, n3) * 0.5 + smoothstep(0.5, 0.9, n2) * 0.3;
    vec3 water = uColor * (0.85 + 0.3 * chop);
    vec3 col = mix(water, refl * uStrength, 0.34 + 0.42 * fres);
    col += uSunColor * spec * 0.6;

    float shoreDist = min(abs(vWorld.z - uShore.x), abs(vWorld.z - uShore.y));
    if (shoreDist < 4.5) {
      float shore = 1.0 - smoothstep(0.0, 4.5, shoreDist);
      float foamNoise = smoothstep(0.5, 0.82, vnoise(vWorld.xz * vec2(0.6, 1.4) + vec2(uTime * 0.28, 0.0)) * 0.7 + n3 * 0.5);
      float foam = shore * foamNoise * (0.7 - uNight * 0.3);
      col = mix(col, vec3(0.82, 0.84, 0.82), foam);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const MIRROR_SCALE = 0.4;
const MIRROR_EVERY = 3;

export default function RiverMirror({
  width,
  depth,
  position,
}: {
  width: number;
  depth: number;
  position: [number, number, number];
}) {
  const dn = useDayNight();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const mesh = useRef<Mesh>(null);
  const frame = useRef(0);

  const rt = useMemo(
    () =>
      new WebGLRenderTarget(Math.max(256, Math.floor(size.width * MIRROR_SCALE)), Math.max(144, Math.floor(size.height * MIRROR_SCALE)), {
        type: HalfFloatType,
        minFilter: LinearMipmapLinearFilter,
        magFilter: LinearFilter,
        generateMipmaps: true,
        depthBuffer: true,
      }),
    [size.width, size.height],
  );
  useEffect(() => () => rt.dispose(), [rt]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uMirror: { value: null },
            uTextureMatrix: { value: new Matrix4() },
            uColor: { value: new Color("#1a2250") },
            uStrength: { value: 0.75 },
            uTime: { value: 0 },
            uSunDir: { value: new Vector3(0.5, 0.8, -0.3) },
            uSunColor: { value: new Color("#ffffff") },
            uShore: { value: new Vector2() },
            uNight: { value: 1 },
          },
        ]),
      }),
    [],
  );

  const shoreNear = position[2] - depth / 2;
  const shoreFar = position[2] + depth / 2;
  useEffect(() => {
    material.uniforms.uShore.value.set(shoreNear, shoreFar);
  }, [material, shoreNear, shoreFar]);

  useEffect(() => {
    const m = mesh.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    m.uniforms.uColor.value.set("#4b5046").lerp(new Color("#080c1c"), dn.night);
    m.uniforms.uStrength.value = 0.8 + dn.night * 0.2;
    m.uniforms.uNight.value = dn.night;
    m.uniforms.uSunDir.value.set(...dn.sunDir);
    m.uniforms.uSunColor.value.copy(dn.sunColor).multiplyScalar(0.25 + (1 - dn.night) * 0.75);
  }, [dn]);

  const scratch = useRef<MirrorScratch | null>(null);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    (m.material as ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
    frame.current += 1;
    if (frame.current % MIRROR_EVERY !== 0) return;
    if (!scratch.current) scratch.current = makeMirrorScratch();
    renderMirror(gl, scene, camera as PerspectiveCamera, m, rt, scratch.current);
  }, -1);

  return (
    <mesh ref={mesh} material={material} rotation-x={-Math.PI / 2} position={position}>
      <planeGeometry args={[width, depth]} />
    </mesh>
  );
}
