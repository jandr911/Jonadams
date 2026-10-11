"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, ExtrudeGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Path, Shape } from "three";
import { BRIDGE_LANDING } from "./BelleIsle";
import { useDayNight } from "./DayNightContext";
import { fillInstances } from "./instancing";
import { CITY_HALF_X, CITY_HALF_Z } from "./layout";
import { mulberry32, pick, range } from "./rng";
import { makeConcreteTexture } from "./textures";
import VehicleFleet, { fleetStep, type FleetItem, type PoseFn, type VehiclePose } from "./VehicleFleet";
import { FLEET_COLORS, type VehicleKind } from "./vehicles";

const A = { x: CITY_HALF_X + 90, z: CITY_HALF_Z + 3 };
const B = BRIDGE_LANDING;
const DX = B.x - A.x;
const DZ = B.z - A.z;
const LEN = Math.hypot(DX, DZ);
const YAW = Math.atan2(DX, DZ);
const RIGHT = { x: -DZ / LEN, z: DX / LEN };
const DECK_Y = 4.8;
const DECK_W = 12;
const GROUND_Y = 0.5;
const RAMP_T = 0.2;
const RAMP_LEN = LEN * RAMP_T;
const FLAT_LEN = LEN - 2 * RAMP_LEN;
const ARCHES = 8;
const SPAN = FLAT_LEN / ARCHES;
const PIER_W = 1.2;
const PANEL_BOTTOM = -1.5;
const PANEL_TOP = DECK_Y - 0.6;
const RAIL_X = DECK_W / 2 - 0.3;
const BALUSTER_STEP = 0.75;
const CONCRETE = "#c9c2b4";
const ASPHALT = "#4a4a55";
const LANES = [-2.0, 2.0];
const LANE_SPEED = 9;
const PER_LANE = 5;
const FLEET_T0 = -0.06;
const FLEET_T1 = 1.06;

function deckY(t: number) {
  const rise = DECK_Y - GROUND_Y;
  if (t < RAMP_T) return GROUND_Y + (rise * Math.max(0, t)) / RAMP_T;
  if (t > 1 - RAMP_T) return GROUND_Y + (rise * Math.max(0, 1 - t)) / RAMP_T;
  return DECK_Y;
}

function buildArchPanel() {
  const s = new Shape();
  s.moveTo(0, PANEL_BOTTOM);
  s.lineTo(SPAN, PANEL_BOTTOM);
  s.lineTo(SPAN, PANEL_TOP);
  s.lineTo(0, PANEL_TOP);
  s.closePath();
  const r = (SPAN - PIER_W) / 2;
  const cy = 1.1;
  const hole = new Path();
  hole.moveTo(PIER_W / 2, PANEL_BOTTOM);
  hole.lineTo(PIER_W / 2, cy);
  hole.absarc(SPAN / 2, cy, r, Math.PI, 0, true);
  hole.lineTo(SPAN - PIER_W / 2, PANEL_BOTTOM);
  hole.closePath();
  s.holes.push(hole);
  const g = new ExtrudeGeometry(s, { depth: DECK_W, bevelEnabled: false, curveSegments: 14 });
  g.rotateY(Math.PI / 2);
  g.translate(-DECK_W / 2, 0, SPAN / 2);
  return g;
}

interface Car {
  lane: number;
  t: number;
  spin: number;
}

interface Fleet {
  cars: Car[];
  items: FleetItem[];
  last: number;
}

function buildFleet(): Fleet {
  const rand = mulberry32(1923);
  const kinds: VehicleKind[] = ["sedan", "sedan", "suv"];
  const cars: Car[] = [];
  const items: FleetItem[] = [];
  for (const lane of LANES) {
    for (let k = 0; k < PER_LANE; k++) {
      cars.push({ lane, t: FLEET_T0 + ((k + range(rand, 0.2, 0.8)) / PER_LANE) * (FLEET_T1 - FLEET_T0), spin: rand() * 6 });
      items.push({ kind: pick(rand, kinds), color: new Color(pick(rand, FLEET_COLORS)) });
    }
  }
  return { cars, items, last: -1 };
}

function poseCar(f: Fleet, i: number, out: VehiclePose, time: number) {
  if (i === 0) {
    const dt = fleetStep(f, time);
    for (const c of f.cars) {
      const dir = c.lane > 0 ? 1 : -1;
      c.t += (LANE_SPEED * dt * dir) / LEN;
      c.spin += (LANE_SPEED * dt) / 0.4;
      if (c.t > FLEET_T1) c.t = FLEET_T0;
      if (c.t < FLEET_T0) c.t = FLEET_T1;
    }
  }
  const c = f.cars[i];
  const dir = c.lane > 0 ? 1 : -1;
  out.x = A.x + DX * c.t + RIGHT.x * c.lane;
  out.z = A.z + DZ * c.t + RIGHT.z * c.lane;
  out.y = deckY(c.t);
  out.yaw = dir > 0 ? YAW : YAW + Math.PI;
  out.pitch = -dir * Math.atan((deckY(c.t + 0.01) - deckY(c.t - 0.01)) / (0.02 * LEN));
  out.spin = c.spin;
}

function Ramp({ t, descending, texture }: { t: number; descending: boolean; texture: ReturnType<typeof makeConcreteTexture> }) {
  const pitch = Math.atan2(DECK_Y - GROUND_Y, RAMP_LEN) * (descending ? 1 : -1);
  return (
    <group position={[A.x + DX * t, (GROUND_Y + DECK_Y) / 2 - 0.3, A.z + DZ * t]} rotation-y={YAW}>
      <group rotation-x={pitch}>
        <mesh>
          <boxGeometry args={[DECK_W, 0.6, RAMP_LEN + 0.3]} />
          <meshStandardMaterial color={ASPHALT} roughness={1} />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
          <boxGeometry args={[DECK_W + 1.2, 1.8, RAMP_LEN]} />
          <meshStandardMaterial color={CONCRETE} map={texture} roughness={1} />
        </mesh>
        {[-RAIL_X, RAIL_X].map((x) => (
          <mesh key={x} position={[x, 0.65, 0]}>
            <boxGeometry args={[0.44, 0.9, RAMP_LEN]} />
            <meshStandardMaterial color={CONCRETE} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function MacArthurBridge() {
  const dn = useDayNight();
  const dummy = useMemo(() => new Object3D(), []);
  const panel = useMemo(() => buildArchPanel(), []);
  const concreteTex = useMemo(() => {
    const t = makeConcreteTexture();
    t.repeat.set(0.12, 0.12);
    return t;
  }, []);
  useEffect(
    () => () => {
      panel.dispose();
      concreteTex.dispose();
    },
    [panel, concreteTex],
  );
  const arches = useRef<InstancedMesh>(null);
  const balusters = useRef<InstancedMesh>(null);
  const posts = useRef<InstancedMesh>(null);
  const globes = useRef<InstancedMesh>(null);
  const globeMat = useRef<MeshStandardMaterial>(null);
  const balusterCount = Math.floor(FLAT_LEN / BALUSTER_STEP) * 2;
  const postCount = (ARCHES / 2 + 1) * 2;
  const [fleet] = useState(buildFleet);
  const pose = useCallback<PoseFn>((i, out, time) => poseCar(fleet, i, out, time), [fleet]);

  useEffect(() => {
    const side = (i: number) => (i & 1 ? RAIL_X : -RAIL_X);
    fillInstances(arches.current, dummy, ARCHES, (i, d) => d.position.set(0, 0, -FLAT_LEN / 2 + SPAN * (i + 0.5)));
    fillInstances(balusters.current, dummy, balusterCount, (i, d) => d.position.set(side(i), DECK_Y + 0.5, -FLAT_LEN / 2 + BALUSTER_STEP * ((i >> 1) + 0.5)));
    fillInstances(posts.current, dummy, postCount, (i, d) => d.position.set(side(i), DECK_Y + 2.7, -FLAT_LEN / 2 + SPAN * 2 * (i >> 1)));
    fillInstances(globes.current, dummy, postCount, (i, d) => d.position.set(side(i), DECK_Y + 4.6, -FLAT_LEN / 2 + SPAN * 2 * (i >> 1)));
  }, [dummy, balusterCount, postCount]);

  useEffect(() => {
    if (globeMat.current) globeMat.current.emissiveIntensity = 0.3 + dn.night * 3;
  }, [dn]);

  return (
    <group>
      <group position={[A.x + DX / 2, 0, A.z + DZ / 2]} rotation-y={YAW}>
        <instancedMesh ref={arches} args={[panel, undefined, ARCHES]}>
          <meshStandardMaterial color={CONCRETE} map={concreteTex} roughness={1} />
        </instancedMesh>
        <mesh position={[0, DECK_Y - 0.3, 0]}>
          <boxGeometry args={[DECK_W, 0.6, FLAT_LEN + 0.4]} />
          <meshStandardMaterial color={ASPHALT} roughness={1} />
        </mesh>
        <mesh position={[0, DECK_Y + 0.02, 0]}>
          <boxGeometry args={[0.22, 0.04, FLAT_LEN]} />
          <meshStandardMaterial color="#e6d98a" />
        </mesh>
        {[-RAIL_X, RAIL_X].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, DECK_Y + 0.1, 0]}>
              <boxGeometry args={[0.44, 0.2, FLAT_LEN]} />
              <meshStandardMaterial color={CONCRETE} roughness={0.9} />
            </mesh>
            <mesh position={[0, DECK_Y + 0.98, 0]}>
              <boxGeometry args={[0.44, 0.22, FLAT_LEN]} />
              <meshStandardMaterial color={CONCRETE} roughness={0.9} />
            </mesh>
          </group>
        ))}
        <instancedMesh ref={balusters} args={[undefined, undefined, balusterCount]}>
          <boxGeometry args={[0.14, 0.7, 0.14]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.9} />
        </instancedMesh>
        <instancedMesh ref={posts} args={[undefined, undefined, postCount]}>
          <cylinderGeometry args={[0.1, 0.16, 3.4, 6]} />
          <meshStandardMaterial color="#2a2d36" roughness={0.6} metalness={0.4} />
        </instancedMesh>
        <instancedMesh ref={globes} args={[undefined, undefined, postCount]}>
          <sphereGeometry args={[0.34, 8, 6]} />
          <meshStandardMaterial ref={globeMat} color="#fff6d8" emissive="#ffd27a" emissiveIntensity={3} toneMapped={false} />
        </instancedMesh>
      </group>
      <Ramp t={RAMP_T / 2} descending={false} texture={concreteTex} />
      <Ramp t={1 - RAMP_T / 2} descending texture={concreteTex} />
      <VehicleFleet items={fleet.items} pose={pose} dynamic />
    </group>
  );
}
