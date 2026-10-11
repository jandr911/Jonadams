"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CanvasTexture, Color, Euler, InstancedMesh, Matrix4, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";
import { HIDDEN_MATRIX, cachedByKey } from "./instancing";
import { labelTexture } from "./labels";
import { makeHeadlightPoolTexture } from "./textures";
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
  pitch: number;
}
export type PoseFn = (i: number, out: VehiclePose, time: number) => void;

export function fleetStep(fleet: { last: number }, time: number) {
  const dt = fleet.last < 0 ? 0 : Math.min(time - fleet.last, 0.05);
  fleet.last = time;
  return dt;
}

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
    shared = { tire: w.tire, rim: w.rim, lamp: buildLampGeometry(), mirror: buildMirrorGeometry(), driver: buildDriverGeometry(), pool: buildPoolGeometry(), poolTex: makeHeadlightPoolTexture() };
  }
  return shared;
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
  const pool = new Matrix4().makeTranslation(0, 0.035, s.length / 2 + 3.4).multiply(sc.makeScale(s.width + 1.4, 1, 7.2));
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
  e: Euler;
  M: Matrix4;
  spin: Matrix4;
  out: Matrix4;
  night: number;
  brakes: Uint8Array;
  spinRaw: Float64Array;
  spinShown: Float32Array;
}

const SPIN_STEP_MAX = 0.4;
const TURN = Math.PI * 2;

function markMatrixDirty(im: InstancedMesh) {
  im.instanceMatrix.needsUpdate = true;
}

function runUpdate(
  meshes: Map<string, InstancedMesh>,
  bodies: Map<VehicleKind, InstancedMesh[]>,
  items: FleetItem[],
  groups: { slot: number[] },
  pose: PoseFn,
  time: number,
  s: Scratch,
) {
  const tire = meshes.get("tire");
  const rim = meshes.get("rim");
  const head = meshes.get("head");
  const tail = meshes.get("tail");
  const mirror = meshes.get("mirror");
  const driver = meshes.get("driver");
  const pool = meshes.get("pool");
  const { p, pos, q, e, M, spin, out } = s;
  const lightsOn = s.night > 0.18;
  if (s.spinRaw.length !== items.length) {
    s.spinRaw = new Float64Array(items.length);
    s.spinShown = new Float32Array(items.length);
  }
  let tailColorDirty = false;
  for (let i = 0; i < items.length; i++) {
    p.brake = false;
    p.pitch = 0;
    pose(i, p, time);
    const kind = items[i].kind;
    const gi = groups.slot[i];
    pos.set(p.x, p.y, p.z);
    q.setFromEuler(e.set(p.pitch, p.yaw, 0, "YXZ"));
    M.compose(pos, q, ONE);
    const parts = bodies.get(kind);
    if (parts) for (let k = 0; k < parts.length; k++) parts[k].setMatrixAt(gi, M);
    const loc = locals(kind);
    const turned = p.spin - s.spinRaw[i];
    s.spinRaw[i] = p.spin;
    s.spinShown[i] = (s.spinShown[i] + Math.max(-SPIN_STEP_MAX, Math.min(SPIN_STEP_MAX, turned))) % TURN;
    spin.makeRotationX(s.spinShown[i]);
    for (let w = 0; w < 4; w++) {
      out.multiplyMatrices(M, loc.wheels[w]).multiply(spin);
      tire?.setMatrixAt(i * 4 + w, out);
      rim?.setMatrixAt(i * 4 + w, out);
    }
    for (let k = 0; k < 2; k++) {
      head?.setMatrixAt(i * 2 + k, out.multiplyMatrices(M, loc.head[k]));
      tail?.setMatrixAt(i * 2 + k, out.multiplyMatrices(M, loc.tail[k]));
      if (loc.mirrors.length) mirror?.setMatrixAt(i * 2 + k, out.multiplyMatrices(M, loc.mirrors[k]));
      else mirror?.setMatrixAt(i * 2 + k, HIDDEN_MATRIX);
    }
    driver?.setMatrixAt(i, out.multiplyMatrices(M, loc.driver));
    if (pool) pool.setMatrixAt(i, lightsOn ? out.multiplyMatrices(M, loc.pool) : HIDDEN_MATRIX);
    const b = p.brake ? 1 : 0;
    if (tail && s.brakes[i] !== b) {
      s.brakes[i] = b;
      tail.setColorAt(i * 2, b ? TAIL_BRAKE : TAIL_IDLE);
      tail.setColorAt(i * 2 + 1, b ? TAIL_BRAKE : TAIL_IDLE);
      tailColorDirty = true;
    }
  }
  meshes.forEach(markMatrixDirty);
  if (tailColorDirty && tail?.instanceColor) tail.instanceColor.needsUpdate = true;
}

function indexBodyParts(meshes: Map<string, InstancedMesh>, bodies: Map<VehicleKind, InstancedMesh[]>, key: string) {
  const sep = key.indexOf(":");
  if (sep < 0) return;
  const kind = key.slice(0, sep) as VehicleKind;
  const list: InstancedMesh[] = [];
  for (const part of PARTS) {
    const im = meshes.get(`${kind}:${part}`);
    if (im) list.push(im);
  }
  bodies.set(kind, list);
}

function indexStrobes(mats: Map<string, MeshStandardMaterial | MeshBasicMaterial>, out: MeshStandardMaterial[]) {
  out.length = 0;
  for (const [key, m] of mats) if (key.endsWith(":strobe") && m instanceof MeshStandardMaterial) out.push(m);
}

function applyNight(mats: Map<string, MeshStandardMaterial | MeshBasicMaterial>, night: number) {
  for (const [key, m] of mats) {
    const part = key.includes(":") ? key.split(":")[1] : key;
    if (!(m instanceof MeshStandardMaterial)) {
      m.opacity = Math.max(0, night - 0.2) * 0.55;
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
  const { reducedMotion } = useCity();
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
  const bodies = useRef(new Map<VehicleKind, InstancedMesh[]>());
  const mats = useRef(new Map<string, MeshStandardMaterial | MeshBasicMaterial>());
  const strobes = useRef<MeshStandardMaterial[]>([]);
  const scratch = useRef<Scratch>({
    p: { x: 0, y: 0, z: 0, yaw: 0, spin: 0, brake: false, pitch: 0 },
    pos: new Vector3(),
    q: new Quaternion(),
    e: new Euler(),
    M: new Matrix4(),
    spin: new Matrix4(),
    out: new Matrix4(),
    night: 0,
    brakes: new Uint8Array(0),
    spinRaw: new Float64Array(0),
    spinShown: new Float32Array(0),
  });

  const bind = useMemo(
    () =>
      cachedByKey((key: string) => (m: InstancedMesh | null) => {
        if (m) meshes.current.set(key, m);
        else meshes.current.delete(key);
        indexBodyParts(meshes.current, bodies.current, key);
      }),
    [],
  );
  const bindMat = useMemo(
    () =>
      cachedByKey((key: string) => (m: MeshStandardMaterial | MeshBasicMaterial | null) => {
        if (m) mats.current.set(key, m);
        else mats.current.delete(key);
        if (key.endsWith(":strobe")) indexStrobes(mats.current, strobes.current);
      }),
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
    if (!dynamic) runUpdate(meshes.current, bodies.current, items, groups, pose, 0, scratch.current);
  }, [dn.night, dynamic, items, groups, pose]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (dynamic) runUpdate(meshes.current, bodies.current, items, groups, pose, t, scratch.current);
    const c = reducedMotion || Math.floor(t * 5) % 2 === 0 ? RED : BLUE;
    const list = strobes.current;
    for (let k = 0; k < list.length; k++) {
      if (list[k].emissive.equals(c)) continue;
      list[k].emissive.copy(c);
      list[k].color.copy(c);
    }
  });

  const n = items.length;
  return (
    <group>
      {groups.kinds.map((kind) => {
        const g = kindGeometry(kind);
        const count = groups.map.get(kind)!.length;
        const decal = VEHICLE_SPECS[kind].decal;
        const decalTex = g.parts.decal && decal ? labelTexture(decal.text, decal.opts) : null;
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
            {g.parts.decal && decalTex && (
              <instancedMesh ref={bind(`${kind}:decal`)} args={[g.parts.decal, undefined, count]} frustumCulled={false}>
                <meshStandardMaterial ref={bindMat(`${kind}:decal`)} map={decalTex} emissiveMap={decalTex} emissive="#ffffff" emissiveIntensity={0} roughness={0.5} metalness={0.2} />
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
          <meshBasicMaterial ref={bindMat("pool")} color="#fff1d2" alphaMap={geo.poolTex} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}
