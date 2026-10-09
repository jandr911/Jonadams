"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CanvasTexture, Color, InstancedMesh, Matrix4, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { useDayNight } from "./DayNightContext";
import { labelTexture } from "./labels";
import {
  VEHICLE_SPECS,
  buildDriverGeometry,
  buildKindGeometry,
  buildLampGeometry,
  buildMirrorGeometry,
  buildPoolGeometry,
  buildWheelGeometry,
  type VehicleKind,
  type VehicleKindGeometry,
} from "./vehicles";

export interface FleetItem {
  kind: VehicleKind;
  color: Color;
}
export interface VehiclePose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  spin: number;
  brake?: boolean;
}
export type PoseFn = (i: number, out: VehiclePose, time: number) => void;

const KIND_GEO = new Map<VehicleKind, VehicleKindGeometry>();
function kindGeometry(kind: VehicleKind) {
  let g = KIND_GEO.get(kind);
  if (!g) {
    g = buildKindGeometry(kind);
    KIND_GEO.set(kind, g);
  }
  return g;
}
type Shared = {
  tire: ReturnType<typeof buildWheelGeometry>["tire"];
  rim: ReturnType<typeof buildWheelGeometry>["rim"];
  lamp: ReturnType<typeof buildLampGeometry>;
  mirror: ReturnType<typeof buildMirrorGeometry>;
  driver: ReturnType<typeof buildDriverGeometry>;
  pool: ReturnType<typeof buildPoolGeometry>;
  poolTex: CanvasTexture;
};
let shared: Shared | null = null;
function sharedGeometry() {
  if (!shared) {
    const w = buildWheelGeometry();
    shared = { tire: w.tire, rim: w.rim, lamp: buildLampGeometry(), mirror: buildMirrorGeometry(), driver: buildDriverGeometry(), pool: buildPoolGeometry(), poolTex: poolTexture() };
  }
  return shared;
}

function poolTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.translate(32, 10);
  ctx.scale(0.5, 1.15);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-100, -20, 200, 140);
  return new CanvasTexture(c);
}

interface Locals {
  wheels: Matrix4[];
  head: Matrix4[];
  tail: Matrix4[];
  mirrors: Matrix4[];
  driver: Matrix4;
  pool: Matrix4;
}

function buildLocals(kind: VehicleKind): Locals {
  const s = VEHICLE_SPECS[kind];
  const t = new Matrix4();
  const sc = new Matrix4();
  const wheels: Matrix4[] = [];
  for (const z of s.axles) {
    for (const side of [-1, 1]) {
      const m = new Matrix4().makeTranslation(side * (s.width / 2 - 0.1), s.wheelR, z);
      m.multiply(sc.makeScale(1, s.wheelR, s.wheelR));
      wheels.push(m);
    }
  }
  const lampAt = (z: number) =>
    [-1, 1].map((side) => new Matrix4().makeTranslation(side * (s.width / 2 - s.lamp.inset), s.lamp.y, z).multiply(sc.makeScale(s.lamp.w, 0.2, 1)));
  const mirrors = s.mirror
    ? [-1, 1].map((side) => {
        const m = new Matrix4().makeTranslation(side * (s.width / 2), s.mirror!.y, s.mirror!.z);
        if (side < 0) m.multiply(t.makeRotationY(Math.PI));
        return m;
      })
    : [];
  const driver = new Matrix4().makeTranslation(...s.driver);
  const pool = new Matrix4().makeTranslation(0, 0.035, s.length / 2 + 4.6).multiply(sc.makeScale(s.width + 2.4, 1, 9.2));
  return { wheels, head: lampAt(s.lamp.z), tail: lampAt(-s.lamp.z - 0.02), mirrors, driver, pool };
}
const LOCALS = new Map<VehicleKind, Locals>();
function locals(kind: VehicleKind) {
  let l = LOCALS.get(kind);
  if (!l) {
    l = buildLocals(kind);
    LOCALS.set(kind, l);
  }
  return l;
}

const UP = new Vector3(0, 1, 0);
const ONE = new Vector3(1, 1, 1);
const RED = new Color("#ff2a3c");
const BLUE = new Color("#3f7bff");
const TAIL_IDLE = new Color(0.45, 0.45, 0.45);
const TAIL_BRAKE = new Color(1.6, 1.6, 1.6);
const PARTS = ["body", "glass", "dark", "trim", "chrome", "accent", "amber", "strobe", "decal"] as const;

interface Scratch {
  p: VehiclePose;
  pos: Vector3;
  q: Quaternion;
  M: Matrix4;
  spin: Matrix4;
  out: Matrix4;
  zero: Matrix4;
  night: number;
  brakes: Uint8Array;
}

function runUpdate(meshes: Map<string, InstancedMesh>, items: FleetItem[], groups: { slot: number[] }, pose: PoseFn, time: number, s: Scratch) {
  const tire = meshes.get("tire");
  const rim = meshes.get("rim");
  const head = meshes.get("head");
  const tail = meshes.get("tail");
  const mirror = meshes.get("mirror");
  const driver = meshes.get("driver");
  const pool = meshes.get("pool");
  const { p, pos, q, M, spin, out, zero } = s;
  const lightsOn = s.night > 0.18;
  let tailColorDirty = false;
  for (let i = 0; i < items.length; i++) {
    p.brake = false;
    pose(i, p, time);
    const kind = items[i].kind;
    const gi = groups.slot[i];
    pos.set(p.x, p.y, p.z);
    q.setFromAxisAngle(UP, p.yaw);
    M.compose(pos, q, ONE);
    for (const part of PARTS) {
      const im = meshes.get(`${kind}:${part}`);
      if (im) im.setMatrixAt(gi, M);
    }
    const loc = locals(kind);
    spin.makeRotationX(p.spin);
    for (let w = 0; w < 4; w++) {
      out.multiplyMatrices(M, loc.wheels[w]).multiply(spin);
      tire?.setMatrixAt(i * 4 + w, out);
      rim?.setMatrixAt(i * 4 + w, out);
    }
    for (let k = 0; k < 2; k++) {
      head?.setMatrixAt(i * 2 + k, out.multiplyMatrices(M, loc.head[k]));
      tail?.setMatrixAt(i * 2 + k, out.multiplyMatrices(M, loc.tail[k]));
      if (loc.mirrors.length) mirror?.setMatrixAt(i * 2 + k, out.multiplyMatrices(M, loc.mirrors[k]));
      else mirror?.setMatrixAt(i * 2 + k, zero);
    }
    driver?.setMatrixAt(i, out.multiplyMatrices(M, loc.driver));
    if (pool) pool.setMatrixAt(i, lightsOn ? out.multiplyMatrices(M, loc.pool) : zero);
    const b = p.brake ? 1 : 0;
    if (tail && s.brakes[i] !== b) {
      s.brakes[i] = b;
      tail.setColorAt(i * 2, b ? TAIL_BRAKE : TAIL_IDLE);
      tail.setColorAt(i * 2 + 1, b ? TAIL_BRAKE : TAIL_IDLE);
      tailColorDirty = true;
    }
  }
  for (const im of meshes.values()) im.instanceMatrix.needsUpdate = true;
  if (tailColorDirty && tail?.instanceColor) tail.instanceColor.needsUpdate = true;
}

function applyNight(mats: Map<string, MeshStandardMaterial | MeshBasicMaterial>, night: number) {
  for (const [key, m] of mats) {
    const part = key.includes(":") ? key.split(":")[1] : key;
    if (!(m instanceof MeshStandardMaterial)) {
      m.opacity = Math.max(0, night - 0.2) * 0.75;
      continue;
    }
    if (part === "head") m.emissiveIntensity = 0.4 + night * 3.2;
    if (part === "tail") m.emissiveIntensity = 1.2 + night * 3.2;
    if (part === "glass") m.emissiveIntensity = night * 0.55;
    if (part === "accent") m.emissiveIntensity = 0.5 + night * 1.6;
    if (part === "amber") m.emissiveIntensity = 0.2 + night * 1.2;
    if (part === "decal") m.emissiveIntensity = night * 0.5;
  }
}

export default function VehicleFleet({
  items,
  pose,
  dynamic = false,
  pools = true,
  castShadow = false,
}: {
  items: FleetItem[];
  pose: PoseFn;
  dynamic?: boolean;
  pools?: boolean;
  castShadow?: boolean;
}) {
  const dn = useDayNight();
  const groups = useMemo(() => {
    const map = new Map<VehicleKind, number[]>();
    const slot = new Array<number>(items.length);
    items.forEach((it, i) => {
      const arr = map.get(it.kind) ?? [];
      slot[i] = arr.length;
      arr.push(i);
      map.set(it.kind, arr);
    });
    return { map, slot, kinds: [...map.keys()] };
  }, [items]);

  const geo = useMemo(() => sharedGeometry(), []);
  const meshes = useRef(new Map<string, InstancedMesh>());
  const mats = useRef(new Map<string, MeshStandardMaterial | MeshBasicMaterial>());
  const scratch = useRef<Scratch>({
    p: { x: 0, y: 0, z: 0, yaw: 0, spin: 0, brake: false },
    pos: new Vector3(),
    q: new Quaternion(),
    M: new Matrix4(),
    spin: new Matrix4(),
    out: new Matrix4(),
    zero: new Matrix4().makeScale(0, 0, 0),
    night: 0,
    brakes: new Uint8Array(0),
  });

  const bind = useCallback(
    (key: string) => (m: InstancedMesh | null) => {
      if (m) meshes.current.set(key, m);
      else meshes.current.delete(key);
    },
    [],
  );
  const bindMat = useCallback(
    (key: string) => (m: MeshStandardMaterial | MeshBasicMaterial | null) => {
      if (m) mats.current.set(key, m);
      else mats.current.delete(key);
    },
    [],
  );

  useEffect(() => {
    for (const kind of groups.kinds) {
      const body = meshes.current.get(`${kind}:body`);
      if (!body) continue;
      for (const i of groups.map.get(kind)!) body.setColorAt(groups.slot[i], items[i].color);
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
    }
    const tail = meshes.current.get("tail");
    if (tail) {
      for (let i = 0; i < items.length * 2; i++) tail.setColorAt(i, TAIL_IDLE);
      if (tail.instanceColor) tail.instanceColor.needsUpdate = true;
    }
    scratch.current.brakes = new Uint8Array(items.length).fill(255);
  }, [groups, items]);

  useEffect(() => {
    scratch.current.night = dn.night;
    applyNight(mats.current, dn.night);
    if (!dynamic) runUpdate(meshes.current, items, groups, pose, 0, scratch.current);
  }, [dn.night, dynamic, items, groups, pose]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (dynamic) runUpdate(meshes.current, items, groups, pose, t, scratch.current);
    const c = Math.floor(t * 5) % 2 === 0 ? RED : BLUE;
    for (const [key, m] of mats.current) {
      if (key.endsWith(":strobe") && m instanceof MeshStandardMaterial && !m.emissive.equals(c)) {
        m.emissive.copy(c);
        m.color.copy(c);
      }
    }
  });

  const n = items.length;
  return (
    <group>
      {groups.kinds.map((kind) => {
        const g = kindGeometry(kind);
        const count = groups.map.get(kind)!.length;
        const spec = VEHICLE_SPECS[kind];
        return (
          <group key={kind}>
            <instancedMesh ref={bind(`${kind}:body`)} args={[g.body, undefined, count]} castShadow={castShadow} frustumCulled={false}>
              <meshPhysicalMaterial color="#ffffff" roughness={0.28} metalness={0.45} clearcoat={1} clearcoatRoughness={0.08} />
            </instancedMesh>
            <instancedMesh ref={bind(`${kind}:glass`)} args={[g.glass, undefined, count]} frustumCulled={false}>
              <meshStandardMaterial ref={bindMat(`${kind}:glass`)} color="#18243c" roughness={0.08} metalness={0.6} emissive="#3b5a8c" emissiveIntensity={0} transparent opacity={0.82} />
            </instancedMesh>
            {g.parts.dark && (
              <instancedMesh ref={bind(`${kind}:dark`)} args={[g.parts.dark, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial color="#15151c" roughness={0.9} />
              </instancedMesh>
            )}
            {g.parts.trim && (
              <instancedMesh ref={bind(`${kind}:trim`)} args={[g.parts.trim, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial color="#aab0c4" roughness={0.3} metalness={0.85} />
              </instancedMesh>
            )}
            {g.parts.chrome && (
              <instancedMesh ref={bind(`${kind}:chrome`)} args={[g.parts.chrome, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial color="#e6eaf2" roughness={0.12} metalness={1} />
              </instancedMesh>
            )}
            {g.parts.accent && (
              <instancedMesh ref={bind(`${kind}:accent`)} args={[g.parts.accent, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial ref={bindMat(`${kind}:accent`)} color="#d6b56e" emissive="#d6b56e" emissiveIntensity={0.6} toneMapped={false} />
              </instancedMesh>
            )}
            {g.parts.amber && (
              <instancedMesh ref={bind(`${kind}:amber`)} args={[g.parts.amber, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial ref={bindMat(`${kind}:amber`)} color="#ffb02e" emissive="#ffb02e" emissiveIntensity={0.3} toneMapped={false} />
              </instancedMesh>
            )}
            {g.parts.strobe && (
              <instancedMesh ref={bind(`${kind}:strobe`)} args={[g.parts.strobe, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial ref={bindMat(`${kind}:strobe`)} color="#ff2a3c" emissive="#ff2a3c" emissiveIntensity={3} toneMapped={false} />
              </instancedMesh>
            )}
            {g.parts.decal && spec.decal && (
              <instancedMesh ref={bind(`${kind}:decal`)} args={[g.parts.decal, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial ref={bindMat(`${kind}:decal`)} map={labelTexture(spec.decal.text, spec.decal.opts)} emissiveMap={labelTexture(spec.decal.text, spec.decal.opts)} emissive="#ffffff" emissiveIntensity={0} roughness={0.5} metalness={0.2} />
              </instancedMesh>
            )}
          </group>
        );
      })}
      <instancedMesh ref={bind("tire")} args={[geo.tire, undefined, n * 4]} frustumCulled={false}>
        <meshStandardMaterial color="#15151a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={bind("rim")} args={[geo.rim, undefined, n * 4]} frustumCulled={false}>
        <meshStandardMaterial color="#c3c7d2" roughness={0.3} metalness={0.95} />
      </instancedMesh>
      <instancedMesh ref={bind("head")} args={[geo.lamp, undefined, n * 2]} frustumCulled={false}>
        <meshStandardMaterial ref={bindMat("head")} color="#fff6d8" emissive="#fff2c0" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bind("tail")} args={[geo.lamp, undefined, n * 2]} frustumCulled={false}>
        <meshStandardMaterial ref={bindMat("tail")} color="#ff3344" emissive="#ff2a3c" emissiveIntensity={2.6} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bind("mirror")} args={[geo.mirror, undefined, n * 2]} frustumCulled={false}>
        <meshStandardMaterial color="#aab0c4" roughness={0.3} metalness={0.85} />
      </instancedMesh>
      <instancedMesh ref={bind("driver")} args={[geo.driver, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial color="#1a1a26" roughness={0.9} />
      </instancedMesh>
      {pools && (
        <instancedMesh ref={bind("pool")} args={[geo.pool, undefined, n]} frustumCulled={false} renderOrder={2}>
          <meshBasicMaterial ref={bindMat("pool")} color="#ffe6a8" alphaMap={geo.poolTex} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}
