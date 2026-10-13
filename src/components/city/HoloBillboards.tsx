"use client";

import { useEffect, useMemo, useState } from "react";
import { Color, DoubleSide, PlaneGeometry, ShaderMaterial, type Texture, UniformsLib, UniformsUtils } from "three";
import { useCopy } from "@/content/CopyProvider";
import { HOLOGRAM_TIME } from "./HologramClock";
import { hologramTexture } from "./labels";
import { destinationById, destinationPosition } from "./layout";

const PANEL = new PlaneGeometry(1, 0.5);

const vert = /* glsl */ `
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    vec2 uv = vec2(gl_FrontFacing ? vUv.x : 1.0 - vUv.x, vUv.y);
    float jitter = step(0.97, fract(sin(mod(floor(uTime * 9.0), 613.0) * 37.1 + uSeed) * 4375.5)) * step(0.0001, uTime);
    uv.x += jitter * 0.008 * sin(uv.y * 90.0);
    float alpha = texture2D(uMap, uv).a;
    float glyph = smoothstep(0.45, 0.9, alpha);
    float backing = step(0.2, alpha) * (1.0 - glyph);
    float scan = 0.72 + 0.28 * step(0.5, fract(uv.y * 70.0 - uTime * 1.2));
    float sweep = smoothstep(0.08, 0.0, abs(fract(uTime * 0.18 + uSeed) - uv.y)) * 0.6;
    float flicker = 0.9 + 0.1 * sin(uTime * 23.0 + uSeed * 3.0);
    float a = clamp(glyph * scan * flicker + sweep * glyph * 0.6 + backing * 0.34, 0.0, 1.0);
    vec3 col = mix(uColor * 0.14, uColor * (1.5 + sweep), glyph);
    #ifdef USE_FOG
      a *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a * 0.92);
    #include <colorspace_fragment>
  }
`;

function makeHoloMaterial(map: Texture, color: string, seed: number) {
  const mat = new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      { uMap: { value: null }, uColor: { value: new Color(color) }, uTime: { value: 0 }, uSeed: { value: seed } },
    ]),
    fog: true,
    transparent: true,
    depthWrite: true,
    side: DoubleSide,
    toneMapped: false,
  });
  mat.uniforms.uMap.value = map;
  mat.uniforms.uTime = HOLOGRAM_TIME;
  return mat;
}

interface Holo {
  kicker: string;
  headline: string;
  footer: string;
  color: string;
  position: [number, number, number];
  width: number;
  yaw: number;
}

function besideDistrict(id: string, dx: number, y: number, dz: number): [number, number, number] {
  const [x, z] = destinationPosition(destinationById(id));
  return [x + dx, y, z + dz];
}

const listen = destinationById("listen");
const club = destinationById("club");
const watch = destinationById("watch");

function holosOf(artist: string, cityName: string): Holo[] {
  return [
    { kicker: "Now playing", headline: artist.toUpperCase(), footer: `${listen.label} at the ${listen.sub}`, color: "#49f2d6", position: besideDistrict("listen", 33, 66, -64), width: 30, yaw: 0.12 },
    { kicker: "Live at", headline: club.label.toUpperCase(), footer: club.sub, color: "#ff7ac0", position: besideDistrict("club", 43, 74, -70), width: 28, yaw: -0.14 },
    { kicker: "New visuals", headline: watch.label.toUpperCase(), footer: watch.sub, color: "#7ff8e6", position: besideDistrict("watch", 0, 88, -37), width: 20, yaw: 0.3 },
    { kicker: "Detroit", headline: cityName.toUpperCase(), footer: "A city built on music", color: "#f3dfae", position: [-6, 104, -64], width: 40, yaw: 0 },
  ];
}

function HoloPanel({ holo, seed }: { holo: Holo; seed: number }) {
  const [mat] = useState(() => makeHoloMaterial(hologramTexture(holo.kicker, holo.headline, holo.footer), holo.color, seed));
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh
      geometry={PANEL}
      material={mat}
      position={holo.position}
      rotation={[0, holo.yaw, 0]}
      scale={[holo.width, holo.width, 1]}
      renderOrder={2}
    />
  );
}

export default function HoloBillboards() {
  const { SITE } = useCopy();
  const holos = useMemo(() => holosOf(SITE.artist, SITE.cityName), [SITE.artist, SITE.cityName]);
  return (
    <group name="holo-billboards">
      {holos.map((h, i) => (
        <HoloPanel key={h.headline} holo={h} seed={i * 1.37 + 0.4} />
      ))}
    </group>
  );
}
