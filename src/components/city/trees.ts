"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, MeshStandardMaterial, type BufferGeometry } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32, pick, range } from "./rng";

export const TRUNK_COLOR = "#4a3f38";

export type TreeSpecies = "shade" | "elm" | "spruce" | "bare";
export type CrownQuality = "near" | "mid" | "far";

const GREENS = ["#3d5236", "#475c3a", "#4f5a36", "#566236", "#5c6236", "#41553a"];
const TURNING = ["#7a6e34", "#7e6232", "#74472c", "#836034", "#6c5a2e", "#646234"];
const SPRUCE = ["#2f4a30", "#2a4034", "#35503a", "#3a4a2e"];
const AUTUMN_SHARE = 0.22;

export function crownTint(species: TreeSpecies, rand: () => number): { tint: Color; autumn: boolean } {
  if (species === "spruce") return { tint: new Color(pick(rand, SPRUCE)), autumn: false };
  const autumn = rand() < AUTUMN_SHARE;
  return { tint: new Color(pick(rand, autumn ? TURNING : GREENS)), autumn };
}

function shadeVertices(geo: BufferGeometry, rand: () => number, low: number, high: number) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - low) / (high - low)));
    const up = nor.getY(i) * 0.5 + 0.5;
    const n = (rand() - 0.5) * 0.16;
    const k = (0.5 + 0.5 * t) * (0.7 + 0.3 * up) * (1 + n);
    colors[i * 3] = k * (1 + n * 0.4);
    colors[i * 3 + 1] = k;
    colors[i * 3 + 2] = k * (1 - n * 0.4);
  }
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

function lobe(radius: number, detail: number, rand: () => number, dx: number, dy: number, dz: number, squash: number) {
  const geo = mergeVertices(new IcosahedronGeometry(radius, detail));
  const pos = geo.attributes.position;
  const fx = range(rand, 1.4, 2.6) / radius;
  const fy = range(rand, 1.4, 2.6) / radius;
  const fz = range(rand, 1.4, 2.6) / radius;
  const px = rand() * Math.PI * 2;
  const py = rand() * Math.PI * 2;
  const pz = rand() * Math.PI * 2;
  const amp = range(rand, 0.16, 0.26);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * fx + px) * Math.sin(y * fy + py) + Math.sin(z * fz + pz) * Math.cos(x * fy + pz);
    const fine = Math.sin(x * fx * 2.7 + pz) * Math.sin(z * fz * 2.3 + px) * Math.cos(y * fy * 2.1 + py);
    const tuft = Math.sin(x * fx * 6.1 + py) * Math.sin(y * fy * 5.3 + pz) * Math.sin(z * fz * 5.7 + px);
    const k = 1 + amp * n + amp * 0.8 * fine + amp * 0.55 * tuft;
    pos.setXYZ(i, x * k + dx, y * k * squash + dy, z * k + dz);
  }
  geo.computeVertexNormals();
  return geo;
}

function cone(radius: number, height: number, y: number, rand: () => number) {
  const geo = mergeVertices(new ConeGeometry(radius, height, 7, 1));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) continue;
    const k = range(rand, 0.82, 1.12);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) + range(rand, -0.15, 0.15) * height, pos.getZ(i) * k);
  }
  geo.translate(0, y + height / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

function tube(rTop: number, rBottom: number, height: number, segments: number) {
  const geo = new CylinderGeometry(rTop, rBottom, height, segments, 1);
  geo.translate(0, height / 2, 0);
  return geo;
}

function limb(length: number, radius: number, tilt: number, yaw: number, baseY: number, segments = 5) {
  const geo = new CylinderGeometry(radius * 0.45, radius, length, segments, 1);
  geo.translate(0, length / 2, 0);
  geo.rotateZ(tilt);
  geo.rotateY(yaw);
  geo.translate(0, baseY, 0);
  return geo;
}

function merge(parts: BufferGeometry[]) {
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("tree parts could not be merged");
  return merged;
}

function trunkFor(species: TreeSpecies, quality: CrownQuality, rand: () => number) {
  const far = quality === "far";
  const segs = far ? 4 : 6;
  if (species === "shade") {
    const parts = [tube(0.3, 0.42, 2.6, segs)];
    if (!far) for (let k = 0; k < 3; k++) parts.push(limb(2, 0.15, 0.65, k * 2.1 + rand() * 0.6, 2.2));
    return merge(parts);
  }
  if (species === "elm") {
    const parts = [tube(0.26, 0.36, 3.8, segs)];
    if (!far) for (let k = 0; k < 2; k++) parts.push(limb(2.2, 0.13, 0.35, k * Math.PI + rand() * 0.8, 3.2));
    return merge(parts);
  }
  if (species === "spruce") return tube(0.16, 0.26, 1.6, segs);
  const parts = [tube(0.2, 0.32, 3.2, segs)];
  const lower = far ? 2 : 3;
  for (let k = 0; k < lower; k++) parts.push(limb(2, 0.12, 0.75, (k * Math.PI * 2) / lower + rand() * 0.7, 2.3, far ? 4 : 5));
  if (!far) {
    for (let k = 0; k < 3; k++) parts.push(limb(1.6, 0.09, 0.5, k * 2.1 + 1.05 + rand() * 0.6, 2.9));
    parts.push(limb(1.3, 0.1, 0.12, rand() * 6, 3.1));
  }
  return merge(parts);
}

function crownFor(species: TreeSpecies, quality: CrownQuality, rand: () => number): BufferGeometry | null {
  const detail = quality === "near" ? 2 : 1;
  if (species === "shade") {
    const r = 1.9;
    const y = 4.1;
    if (quality === "far") return lobe(r, 0, rand, 0, y, 0, 0.8);
    const lobes = [
      lobe(r, detail, rand, 0, y, 0, 0.8),
      lobe(r * 0.64, detail, rand, r * 0.6, y + r * 0.18, -r * 0.35, 0.86),
      lobe(r * 0.6, detail, rand, -r * 0.55, y + r * 0.4, r * 0.4, 0.86),
      lobe(r * 0.5, detail, rand, -r * 0.4, y - r * 0.2, -r * 0.6, 0.9),
      lobe(r * 0.45, detail, rand, r * 0.3, y + r * 0.7, r * 0.5, 0.95),
    ];
    if (quality === "near") {
      lobes.push(lobe(r * 0.55, detail, rand, r * 0.1, y - r * 0.3, r * 0.7, 0.9));
      lobes.push(lobe(r * 0.38, detail, rand, -r * 0.85, y + r * 0.05, -r * 0.1, 0.9));
    }
    return merge(lobes);
  }
  if (species === "elm") {
    const r = 1.6;
    const y = 5.4;
    if (quality === "far") return lobe(r, 0, rand, 0, y, 0, 1.45);
    return merge([lobe(r * 0.95, detail, rand, 0, y, 0, 1.3), lobe(r * 0.7, detail, rand, r * 0.1, y + r * 1.25, -r * 0.1, 1.1), lobe(r * 0.5, detail, rand, -r * 0.6, y + r * 0.5, r * 0.3, 1.0)]);
  }
  if (species === "spruce") {
    if (quality === "far") return cone(1.4, 4.6, 0.9, rand);
    return merge([cone(1.5, 2.8, 0.9, rand), cone(1.15, 2.4, 2.4, rand), cone(0.75, 2.1, 3.8, rand)]);
  }
  return null;
}

export interface TreeGeometry {
  trunk: BufferGeometry;
  crown: BufferGeometry | null;
}

export function makeTreeGeometry(species: TreeSpecies, quality: CrownQuality, seed: number): TreeGeometry {
  const rand = mulberry32(seed);
  const trunk = trunkFor(species, quality, rand);
  trunk.computeBoundingBox();
  shadeVertices(trunk, rand, 0, trunk.boundingBox!.max.y);
  const crown = crownFor(species, quality, rand);
  if (crown) {
    crown.computeBoundingBox();
    shadeVertices(crown, rand, crown.boundingBox!.min.y, crown.boundingBox!.max.y);
  }
  return { trunk, crown };
}

interface SharedEntry<T> {
  value: T;
  refs: number;
}
const shared = new Map<string, SharedEntry<unknown>>();

function useShared<T>(key: string, create: () => T, dispose: (value: T) => void): T {
  const value = useMemo(() => {
    const hit = shared.get(key) as SharedEntry<T> | undefined;
    if (hit) return hit.value;
    const made = create();
    shared.set(key, { value: made, refs: 0 });
    return made;
  }, [key, create]);
  useEffect(() => {
    const entry = shared.get(key) as SharedEntry<T> | undefined;
    if (!entry) return;
    entry.refs += 1;
    return () => {
      entry.refs -= 1;
      if (entry.refs > 0) return;
      shared.delete(key);
      dispose(entry.value);
    };
  }, [key, dispose]);
  return value;
}

function disposeTreeGeometry(geo: TreeGeometry) {
  geo.trunk.dispose();
  geo.crown?.dispose();
}

export function useTreeGeometry(species: TreeSpecies, quality: CrownQuality, seed: number) {
  const create = useCallback(() => makeTreeGeometry(species, quality, seed), [species, quality, seed]);
  return useShared(`geometry|${species}|${quality}|${seed}`, create, disposeTreeGeometry);
}

const NEAR_FADE_START = 2.2;
const NEAR_FADE_LENGTH = 1.8;
const WIND = { value: 0 };

export function setWindTime(seconds: number) {
  WIND.value = seconds;
}

export function createCrownMaterial() {
  const mat = new MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 1 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = WIND;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWindTime;\nvarying vec3 vLeafPos;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLeafPos = position;
        #ifdef USE_INSTANCING
        {
          vec4 anchor = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float phase = anchor.x * 0.17 + anchor.z * 0.13;
          float sway = sin(uWindTime * 1.1 + phase) * 0.6 + sin(uWindTime * 2.7 + phase * 2.3) * 0.25;
          float reach = clamp(position.y * 0.18, 0.2, 1.4);
          transformed.x += sway * reach * 0.07;
          transformed.z += sway * reach * 0.04;
          vLeafPos = (instanceMatrix * vec4(position, 1.0)).xyz;
        }
        #endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLeafPos;
        #define LEAF_TUFT_NEAR 70.0
        #define LEAF_TUFT_FAR 120.0
        #define LEAF_DETAIL_FAR 260.0
        float leafHash(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.zyx + 31.32);
          return fract((p.x + p.y) * p.z);
        }
        float leafNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = mix(mix(leafHash(i), leafHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(leafHash(i + vec3(0.0, 1.0, 0.0)), leafHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
          float b = mix(mix(leafHash(i + vec3(0.0, 0.0, 1.0)), leafHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(leafHash(i + vec3(0.0, 1.0, 1.0)), leafHash(i + 1.0), f.x), f.y);
          return mix(a, b, f.z);
        }`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        {
          float nearHash = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (length(vViewPosition) < ${NEAR_FADE_START.toFixed(2)} + nearHash * ${NEAR_FADE_LENGTH.toFixed(2)}) discard;
        }`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        {
          float viewDist = length(vViewPosition);
          float rim = 1.0 - abs(dot(normalize(vNormal), vViewPosition / viewDist));
          float tufts = 1.0 - smoothstep(LEAF_TUFT_NEAR, LEAF_TUFT_FAR, viewDist);
          if (rim > 0.5 && tufts > 0.0 && leafNoise(vLeafPos * 5.5 + 9.3) < (rim - 0.5) * 2.4 * tufts) discard;
          if (viewDist < LEAF_DETAIL_FAR) {
            vec3 leafP = vLeafPos * 2.4;
            vec3 leaf = vec3(leafNoise(leafP), leafNoise(leafP + 17.1), leafNoise(leafP + 33.7)) - 0.5;
            normal = normalize(normal + leaf * 1.3);
          }
        }`,
      );
  };
  mat.customProgramCacheKey = () => "crown-wind-fade-leaf-tufts";
  return mat;
}

function disposeMaterial(mat: MeshStandardMaterial) {
  mat.dispose();
}

function createTrunkMaterial() {
  return new MeshStandardMaterial({ color: TRUNK_COLOR, vertexColors: true, roughness: 1 });
}

export function useCrownMaterial() {
  return useShared("material|crown", createCrownMaterial, disposeMaterial);
}

export function useTrunkMaterial() {
  return useShared("material|trunk", createTrunkMaterial, disposeMaterial);
}
