import {
  Color,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
} from "three";
import type { DayNight } from "./dayNight";

const vertexShader = /* glsl */ `
  attribute float aSeed;
  uniform float uSeed;
  uniform vec3 uColor;
  uniform float uCylindrical;
  varying vec3 vNormalW;
  varying vec2 vFace;
  varying vec2 vTopXZ;
  varying vec3 vSize;
  varying float vSeed;
  varying vec3 vColor;
  varying float vTop;
  varying float vLocalY;
  varying vec3 vWorld;
  #include <fog_pars_vertex>

  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
      vSeed = aSeed;
    #else
      vSeed = uSeed;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = uColor;
    #endif
    vec3 scale = vec3(length(m[0].xyz), length(m[1].xyz), length(m[2].xyz));
    vSize = scale;
    vNormalW = normalize(mat3(m) * normal);
    vec3 p = position;
    if (uCylindrical > 0.5) vFace = vec2(atan(p.z, p.x) * scale.x, p.y * scale.y);
    else if (abs(normal.x) > 0.5) vFace = vec2(p.z * scale.z, p.y * scale.y);
    else if (abs(normal.z) > 0.5) vFace = vec2(p.x * scale.x, p.y * scale.y);
    else vFace = vec2(-100.0);
    vTopXZ = vec2(p.x * scale.x, p.z * scale.z);
    vTop = abs(normal.y) > 0.5 ? 1.0 : 0.0;
    vLocalY = p.y * scale.y;
    vec4 wp = m * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uNight;
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uAmbient;
  uniform vec3 uHemiSky;
  uniform vec3 uHemiGround;
  uniform vec2 uWinSize;
  uniform vec2 uWinMargin;
  uniform float uLitDensity;
  uniform float uWinBoost;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform float uGlow;
  uniform float uCylindrical;
  varying vec3 vNormalW;
  varying vec2 vFace;
  varying vec2 vTopXZ;
  varying vec3 vSize;
  varying float vSeed;
  varying vec3 vColor;
  varying float vTop;
  varying float vLocalY;
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
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 l = normalize(uSunDir);
    float ndl = max(dot(n, l), 0.0);
    float hemi = n.y * 0.5 + 0.5;
    vec3 light = uSunColor * uSunIntensity * ndl + mix(uHemiGround, uHemiSky, hemi) * uAmbient * 2.2;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 hv = normalize(l + v);
    float spec = pow(max(dot(n, hv), 0.0), 48.0) * uSunIntensity * 0.35;

    float lum = dot(vColor, vec3(0.299, 0.587, 0.114));
    float isGlass = 1.0 - step(0.2, lum);
    float isStone = step(0.5, lum);

    // masonry coursing: bricks on brick, ashlar blocks on stone
    vec2 bsize = mix(vec2(1.1, 0.42), vec2(2.4, 1.1), isStone);
    vec2 bc = vFace / bsize;
    bc.x += step(0.5, fract(bc.y * 0.5)) * 0.5;
    float brickTone = 0.9 + 0.2 * hash(floor(bc) + vSeed * 7.1);
    float mortar = max(step(0.93, fract(bc.x)), step(0.88, fract(bc.y)));
    float masonry = mix(brickTone, 0.82, mortar * 0.6) * (1.0 - isGlass) + isGlass;

    // weathering + ground grime
    float streak = vnoise(vec2(vFace.x * 0.35 + vSeed, vFace.y * 0.05));
    float grime = 1.0 - 0.22 * streak * (1.0 - smoothstep(0.0, vSize.y * 0.6, vLocalY)) * (1.0 - isGlass);
    float groundAO = 0.72 + 0.28 * smoothstep(0.0, 4.5, vLocalY);

    vec3 base = vColor * masonry * grime * groundAO;
    vec3 glassBase = vColor * 0.9 + uHemiSky * fres * 0.5 + uHemiSky * 0.08;
    base = mix(base, glassBase, isGlass);
    vec3 facade = base * light + vColor * uGlow * (0.35 + 0.65 * uNight)
                + uHemiSky * fres * mix(0.3, 0.6, isGlass) + uSunColor * spec * mix(1.0, 2.0, isGlass);

    // bays + windows
    float shop = step(vLocalY, 3.6) * (1.0 - vTop);
    float cornice = step(vSize.y - 1.3, vLocalY) * (1.0 - vTop);
    vec2 winSize = mix(uWinSize, vec2(uWinSize.x * 2.4, 3.6), shop);
    vec2 margin = mix(uWinMargin, vec2(0.09, 0.2), isGlass);
    vec2 g = vFace / winSize;
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float inWin = step(margin.x, f.x) * step(f.x, 1.0 - margin.x)
                * step(margin.y, f.y) * step(f.y, 1.0 - margin.y);
    inWin *= (1.0 - vTop) * step(0.5, vLocalY) * (1.0 - cornice);

    float h = hash(cell + vSeed * 13.17);
    float floorDark = step(0.12, hash(vec2(cell.y, vSeed * 3.7)));
    float lit = max(step(1.0 - uLitDensity * uNight, h) * floorDark, shop * step(0.25, h) * uNight);
    float flick = 1.0 - 0.45 * step(0.992, hash(cell + floor(uTime * 0.7) + vSeed));
    vec3 tint = mix(uWarm, uCool, step(0.72, hash(cell * 1.71 + vSeed)));

    // blinds / curtains per window
    float dress = hash(cell * 2.3 + vSeed * 0.7);
    float fy = (f.y - margin.y) / max(1.0 - 2.0 * margin.y, 0.001);
    float blinds = step(dress, 0.28) * (0.7 + 0.3 * step(0.5, fract(fy * 7.0)));
    float curtain = step(0.28, dress) * step(dress, 0.5) * step(fy, 0.35 + 0.4 * hash(cell + 9.0));
    float dressing = mix(1.0, blinds, step(dress, 0.28)) * mix(1.0, mix(1.0, 0.25, 1.0 - step(fy, 0.35 + 0.4 * hash(cell + 9.0))), step(0.28, dress) * step(dress, 0.5));
    dressing = mix(dressing, 1.0, shop);

    // recessed look: lintel shadow at top, sill highlight at bottom
    float lintel = 1.0 - 0.45 * smoothstep(0.78, 1.0, fy);
    float sill = step(fy, 0.08) * 0.5;

    vec3 dayWin = mix(vColor * 0.4, uHemiSky * 0.95, 0.6) * (0.55 + 0.6 * ndl) * lintel
                + uSunColor * spec * 2.5 + uHemiSky * fres * 0.6;
    vec3 nightUnlit = (facade * 0.5 + vColor * 0.06) * lintel;
    vec3 nightLit = tint * uWinBoost * dressing + uHemiSky * fres * 0.3;
    vec3 win = mix(dayWin, mix(nightUnlit, nightLit, lit * flick), uNight);
    win = mix(win, facade * 1.15, sill * (1.0 - isGlass));

    // pilasters between bays, mullions on glass
    float edge = min(f.x, 1.0 - f.x);
    float pilaster = step(edge, 0.045) * (1.0 - vTop) * (1.0 - isGlass);
    float mullion = step(edge, 0.02) * (1.0 - vTop) * isGlass;
    float ledge = step(0.96, f.y) * (1.0 - vTop) * (1.0 - isGlass);
    float spandrel = step(0.92, f.y) * (1.0 - vTop) * isGlass;

    vec3 col = mix(facade, win, inWin);
    col = mix(col, facade * 0.78, pilaster * 0.7);
    col = mix(col, vec3(0.55, 0.6, 0.68) * light, mullion);
    col = mix(col, facade * 0.7, ledge * 0.6);
    col = mix(col, vColor * 0.55 * light, spandrel);
    col = mix(col, facade * 1.12, cornice * step(0.5, fract(vLocalY * 2.0)));
    col = mix(col, facade * 0.6, step(vLocalY, 0.5) * (1.0 - vTop));
    col = mix(col, mix(facade * 0.7, tint * 0.9, uNight), shop * step(0.96, f.y) * 0.8);

    // roof: gravel, parapet rim, slight AO
    vec2 rim = vSize.xz * 0.5 - abs(vTopXZ);
    float parapet = step(min(rim.x, rim.y), 0.7);
    float gravel = 0.85 + 0.3 * hash(floor(vTopXZ * 3.0) + vSeed);
    vec3 roof = vColor * 0.55 * light * gravel;
    roof = mix(roof, facade * 1.05, parapet);
    col = mix(col, roof, vTop * step(0.5, n.y));

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface WindowMaterialOptions {
  color?: string;
  seed?: number;
  winSize?: [number, number];
  winMargin?: [number, number];
  litDensity?: number;
  winBoost?: number;
  warm?: string;
  cool?: string;
  cylindrical?: boolean;
  glow?: number;
}

export function createWindowMaterial(opts: WindowMaterialOptions = {}) {
  const mat = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uSeed: { value: opts.seed ?? Math.random() * 100 },
        uCylindrical: { value: opts.cylindrical ? 1 : 0 },
        uGlow: { value: opts.glow ?? 0 },
        uColor: { value: new Color(opts.color ?? "#5a4d7a") },
        uNight: { value: 1 },
        uTime: { value: 0 },
        uSunDir: { value: new Vector3(0.5, 0.8, -0.3) },
        uSunColor: { value: new Color("#ffffff") },
        uSunIntensity: { value: 1 },
        uAmbient: { value: 0.3 },
        uHemiSky: { value: new Color("#8888ff") },
        uHemiGround: { value: new Color("#222222") },
        uWinSize: { value: new Vector2(...(opts.winSize ?? [1.6, 2.1])) },
        uWinMargin: { value: new Vector2(...(opts.winMargin ?? [0.27, 0.32])) },
        uLitDensity: { value: opts.litDensity ?? 0.3 },
        uWinBoost: { value: opts.winBoost ?? 1.55 },
        uWarm: { value: new Color(opts.warm ?? "#ffd9a0") },
        uCool: { value: new Color(opts.cool ?? "#bfe6ff") },
      },
    ]),
  });
  return mat;
}

export function tickWindowMaterial(mat: ShaderMaterial, time: number) {
  mat.uniforms.uTime.value = time;
}

export function applyDayNight(mat: ShaderMaterial, dn: DayNight) {
  const u = mat.uniforms;
  u.uNight.value = dn.night;
  (u.uSunDir.value as Vector3).set(...dn.sunDir);
  (u.uSunColor.value as Color).copy(dn.sunColor);
  u.uSunIntensity.value = dn.sunIntensity;
  u.uAmbient.value = dn.ambient;
  (u.uHemiSky.value as Color).copy(dn.hemiSky);
  (u.uHemiGround.value as Color).copy(dn.hemiGround);
}
