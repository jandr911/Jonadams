"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
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
    vec2 ripple = (vec2(n1, n2) - 0.5) * 0.018;
    vec4 uv = vMirror;
    uv.xy += ripple * uv.w;
    vec3 refl = texture2DProj(uMirror, uv).rgb;

    vec3 v = normalize(cameraPosition - vWorld);
    vec3 n = normalize(vec3((n1 - 0.5) * 0.25, 1.0, (n2 - 0.5) * 0.25));
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);
    vec3 hv = normalize(normalize(uSunDir) + v);
    float spec = pow(max(dot(n, hv), 0.0), 120.0);

    vec3 col = mix(uColor, refl * uStrength, 0.42 + 0.45 * fres);
    col += uSunColor * spec * 0.9;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

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
      new WebGLRenderTarget(Math.max(256, Math.floor(size.width * 0.5)), Math.max(144, Math.floor(size.height * 0.5)), {
        type: HalfFloatType,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
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
          },
        ]),
      }),
    [],
  );

  useEffect(() => {
    const m = mesh.current?.material as ShaderMaterial | undefined;
    if (!m) return;
    m.uniforms.uColor.value.set("#2d6aa8").lerp(new Color("#0e1436"), dn.night);
    m.uniforms.uStrength.value = 0.85 + dn.night * 0.15;
    m.uniforms.uSunDir.value.set(...dn.sunDir);
    m.uniforms.uSunColor.value.copy(dn.sunColor).multiplyScalar(0.25 + (1 - dn.night) * 0.75);
  }, [dn]);

  const scratch = useRef<MirrorScratch | null>(null);

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    (m.material as ShaderMaterial).uniforms.uTime.value = clock.elapsedTime;
    frame.current += 1;
    if (frame.current % 2 !== 0) return;
    if (!scratch.current) scratch.current = makeMirrorScratch();
    renderMirror(gl, scene, camera as PerspectiveCamera, m, rt, scratch.current);
  }, -1);

  return (
    <mesh ref={mesh} material={material} rotation-x={-Math.PI / 2} position={position}>
      <planeGeometry args={[width, depth]} />
    </mesh>
  );
}
