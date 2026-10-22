import { BufferAttribute, BufferGeometry, Color, Euler, Matrix4, Mesh, Object3D, Texture, Vector2, Vector3, Vector4, type Material, type InstancedMesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DETAIL_CULLED } from "./DetailCull";

type Tintable = Material & { color: Color; vertexColors: boolean; emissive?: Color; emissiveIntensity?: number };

const BATCHABLE = new Set(["MeshStandardMaterial", "MeshLambertMaterial", "MeshBasicMaterial", "MeshPhongMaterial"]);
const IGNORED_KEYS = new Set(["uuid", "id", "name", "version", "color", "userData", "isMaterial", "type"]);
const WARMUP_FRAMES = 90;
const OBSERVE_EVERY = 10;
const CHECK_EVERY = 30;
const RESTLESS_CHECKS = 4;
const CELL = 90;
const NODE_SLOTS = 11;

interface R3FTagged {
  __r3f?: { eventCount?: number };
}

interface Kept {
  visible: boolean;
  raycast: Mesh["raycast"] | undefined;
}

interface Source {
  mesh: Mesh;
  owner: Object3D;
  chain: Object3D[];
  pose: Float64Array;
  look: Float64Array;
  kept: Kept | null;
  recolours: number;
}

interface Group {
  owner: Object3D;
  sources: Source[];
  batch: Mesh;
}

export interface Batcher {
  root: Object3D;
  label: string;
  frame: number;
  offset: number;
  watching: boolean;
  candidates: Mesh[];
  baseline: Map<Object3D, Float64Array>;
  looks: Map<Mesh, Float64Array>;
  lookChanges: Map<Mesh, number>;
  moving: Set<Object3D>;
  groups: Group[];
  pending: Source[];
  retired: WeakSet<Mesh>;
  gates: WeakSet<Object3D>;
  frozen: WeakMap<Object3D, { count: number; auto: boolean }>;
}

function hasHandlers(o: Object3D) {
  return ((o as unknown as R3FTagged).__r3f?.eventCount ?? 0) > 0;
}

function shown(o: Object3D) {
  return o.visible || o.userData[DETAIL_CULLED] === true;
}

function candidate(o: Object3D, b: Batcher): o is Mesh {
  if (!(o instanceof Mesh) || o.type !== "Mesh" || (o as InstancedMesh).isInstancedMesh || b.retired.has(o) || o.userData.batched) return false;
  const m = o.material;
  const g = o.geometry as BufferGeometry & { isInstancedBufferGeometry?: boolean };
  if (Array.isArray(m) || !BATCHABLE.has(m.type) || m.transparent || g.isInstancedBufferGeometry || !g.attributes.position) return false;
  if (Object.prototype.hasOwnProperty.call(m, "onBeforeCompile") || Object.prototype.hasOwnProperty.call(o, "onBeforeRender")) return false;
  if (Object.keys(g.morphAttributes).length > 0) return false;
  for (let p: Object3D | null = o; p && p !== b.root.parent; p = p.parent) if (!shown(p)) return false;
  return true;
}

function writeNode(out: Float64Array, at: number, o: Object3D) {
  out[at] = o.position.x;
  out[at + 1] = o.position.y;
  out[at + 2] = o.position.z;
  out[at + 3] = o.quaternion.x;
  out[at + 4] = o.quaternion.y;
  out[at + 5] = o.quaternion.z;
  out[at + 6] = o.quaternion.w;
  out[at + 7] = o.scale.x;
  out[at + 8] = o.scale.y;
  out[at + 9] = o.scale.z;
  out[at + 10] = shown(o) ? 1 : 0;
}

function nodeDiff(saved: Float64Array, at: number, o: Object3D) {
  const p = o.position;
  const q = o.quaternion;
  const s = o.scale;
  const moved =
    Math.abs(saved[at] - p.x) > 1e-6 ||
    Math.abs(saved[at + 1] - p.y) > 1e-6 ||
    Math.abs(saved[at + 2] - p.z) > 1e-6 ||
    Math.abs(saved[at + 3] - q.x) > 1e-6 ||
    Math.abs(saved[at + 4] - q.y) > 1e-6 ||
    Math.abs(saved[at + 5] - q.z) > 1e-6 ||
    Math.abs(saved[at + 6] - q.w) > 1e-6 ||
    Math.abs(saved[at + 7] - s.x) > 1e-6 ||
    Math.abs(saved[at + 8] - s.y) > 1e-6 ||
    Math.abs(saved[at + 9] - s.z) > 1e-6;
  if (moved) return 2;
  return saved[at + 10] !== (shown(o) ? 1 : 0) ? 1 : 0;
}

function geometryStamp(mesh: Mesh) {
  const position = mesh.geometry.attributes.position;
  return mesh.geometry.id * 1e6 + ("version" in position ? position.version : 0);
}

function writePose(s: Source) {
  s.pose[0] = geometryStamp(s.mesh);
  writeNode(s.pose, 1, s.mesh);
  for (let i = 0; i < s.chain.length; i++) writeNode(s.pose, 1 + (i + 1) * NODE_SLOTS, s.chain[i]);
}

function poseDiff(s: Source) {
  if (s.pose[0] !== geometryStamp(s.mesh) || nodeDiff(s.pose, 1, s.mesh) === 2) return 2;
  let worst = 0;
  for (let i = 0; i < s.chain.length; i++) worst = Math.max(worst, nodeDiff(s.pose, 1 + (i + 1) * NODE_SLOTS, s.chain[i]));
  return worst;
}

function writeLook(out: Float64Array, mesh: Mesh) {
  const m = mesh.material as Tintable;
  out[0] = m.color.r;
  out[1] = m.color.g;
  out[2] = m.color.b;
  out[3] = m.emissive?.r ?? 0;
  out[4] = m.emissive?.g ?? 0;
  out[5] = m.emissive?.b ?? 0;
  out[6] = m.emissiveIntensity ?? 0;
  out[7] = m.opacity;
  out[8] = m.visible ? 1 : 0;
}

function lookChanged(saved: Float64Array, mesh: Mesh) {
  const m = mesh.material as Tintable;
  return (
    Math.abs(saved[0] - m.color.r) > 1e-6 ||
    Math.abs(saved[1] - m.color.g) > 1e-6 ||
    Math.abs(saved[2] - m.color.b) > 1e-6 ||
    Math.abs(saved[3] - (m.emissive?.r ?? 0)) > 1e-6 ||
    Math.abs(saved[4] - (m.emissive?.g ?? 0)) > 1e-6 ||
    Math.abs(saved[5] - (m.emissive?.b ?? 0)) > 1e-6 ||
    Math.abs(saved[6] - (m.emissiveIntensity ?? 0)) > 1e-6 ||
    Math.abs(saved[7] - m.opacity) > 1e-6 ||
    saved[8] !== (m.visible ? 1 : 0)
  );
}

function valueKey(v: unknown): string | null {
  if (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string") return String(v);
  if (v instanceof Color) return v.getHexString();
  if (typeof v !== "object") return null;
  if (v instanceof Texture) return v.uuid;
  if (v instanceof Vector2 || v instanceof Vector3 || v instanceof Vector4 || v instanceof Euler) return v.toArray().join(",");
  return null;
}

function materialKey(m: Material) {
  const parts: string[] = [m.type, `alphaTest=${m.alphaTest}`, `defines=${JSON.stringify(m.defines ?? {})}`];
  for (const [k, v] of Object.entries(m)) {
    if (IGNORED_KEYS.has(k) || k.startsWith("_") || k === "defines") continue;
    const value = valueKey(v);
    if (value !== null) parts.push(`${k}=${value}`);
  }
  return parts.join("|");
}

function bakeColor(geo: BufferGeometry, material: Tintable) {
  const count = geo.attributes.position.count;
  const existing = material.vertexColors ? geo.attributes.color : undefined;
  const c = material.color;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = (existing ? existing.getX(i) : 1) * c.r;
    out[i * 3 + 1] = (existing ? existing.getY(i) : 1) * c.g;
    out[i * 3 + 2] = (existing ? existing.getZ(i) : 1) * c.b;
  }
  geo.setAttribute("color", new BufferAttribute(out, 3));
}

function ignoreRaycast() {}

function freeze(b: Batcher, o: Object3D) {
  const entry = b.frozen.get(o);
  if (entry) {
    entry.count += 1;
    return;
  }
  b.frozen.set(o, { count: 1, auto: o.matrixAutoUpdate });
  if (o.matrixAutoUpdate) {
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  }
}

function thaw(b: Batcher, o: Object3D) {
  const entry = b.frozen.get(o);
  if (!entry) return;
  entry.count -= 1;
  if (entry.count > 0) return;
  b.frozen.delete(o);
  o.matrixAutoUpdate = entry.auto;
}

function hide(b: Batcher, s: Source) {
  const m = s.mesh;
  s.kept = { visible: m.visible, raycast: Object.prototype.hasOwnProperty.call(m, "raycast") ? m.raycast : undefined };
  m.visible = false;
  m.userData[DETAIL_CULLED] = false;
  m.userData.batched = true;
  m.raycast = ignoreRaycast;
  freeze(b, m);
  for (const o of s.chain) freeze(b, o);
}

function reveal(b: Batcher, s: Source) {
  const m = s.mesh;
  const kept = s.kept;
  s.kept = null;
  m.userData.batched = false;
  if (kept) {
    m.visible = kept.visible;
    if (kept.raycast) m.raycast = kept.raycast;
    else delete (m as Partial<Mesh>).raycast;
  }
  thaw(b, m);
  for (const o of s.chain) thaw(b, o);
}

const local = new Matrix4();
const ownerInverse = new Matrix4();
const centre = new Vector3();

function merge(b: Batcher, owner: Object3D, sources: Source[]): Group | null {
  owner.updateWorldMatrix(true, true);
  ownerInverse.copy(owner.matrixWorld).invert();
  const parts = sources.map(({ mesh }) => {
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(local.multiplyMatrices(ownerInverse, mesh.matrixWorld));
    bakeColor(geo, mesh.material as Tintable);
    return geo;
  });
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!merged) {
    console.warn(`${b.label}: ${sources.length} meshes could not be merged`);
    return null;
  }
  merged.computeBoundingBox();
  merged.boundingBox?.getCenter(centre);
  merged.translate(-centre.x, -centre.y, -centre.z);
  merged.computeBoundingSphere();
  const source = sources[0].mesh;
  const batch = new Mesh(merged, batchMaterial(source.material as Material));
  batch.name = `${b.label}-batch`;
  batch.position.copy(centre);
  batch.layers.mask = source.layers.mask;
  batch.renderOrder = source.renderOrder;
  batch.userData.noCull = true;
  batch.updateMatrix();
  batch.matrixAutoUpdate = false;
  owner.add(batch);
  batch.updateMatrixWorld(true);
  for (const s of sources) {
    hide(b, s);
    writePose(s);
    writeLook(s.look, s.mesh);
  }
  return { owner, sources, batch };
}

export function batchMaterial(source: Material) {
  const material = source.clone() as Tintable;
  material.color.setRGB(1, 1, 1);
  material.vertexColors = true;
  return material;
}

const active = new Set<Batcher>();

function probeGeometry(source: BufferGeometry) {
  const color = source.attributes.color;
  if (color && color.itemSize === 3) return source;
  const probe = new BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) probe.setAttribute(name, attribute);
  probe.setAttribute("color", new BufferAttribute(new Float32Array(source.attributes.position.count * 3), 3));
  if (source.index) probe.setIndex(source.index);
  return probe;
}

export function batchVariantProbes() {
  const seen = new Set<string>();
  const probes = new Object3D();
  for (const b of active) {
    for (const mesh of b.candidates) {
      const material = mesh.material as Material;
      const key = `${materialKey(material)}#${Object.keys(mesh.geometry.attributes).sort().join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      probes.add(new Mesh(probeGeometry(mesh.geometry), batchMaterial(material)));
    }
  }
  return probes;
}

function cellOf(mesh: Mesh) {
  const e = mesh.matrixWorld.elements;
  return `${Math.floor(e[12] / CELL)},${Math.floor(e[14] / CELL)}`;
}

function build(b: Batcher, sources: Source[]) {
  b.root.updateWorldMatrix(true, true);
  const bins = new Map<string, { owner: Object3D; sources: Source[] }>();
  for (const s of sources) {
    const m = s.mesh;
    const g = m.geometry;
    const attrs = Object.keys(g.attributes).sort().join(",");
    const place = s.owner === b.root ? cellOf(m) : "";
    const key = [s.owner.uuid, place, materialKey(m.material as Material), attrs, g.index ? "i" : "n", m.layers.mask, m.renderOrder].join("#");
    const bin = bins.get(key) ?? { owner: s.owner, sources: [] };
    bin.sources.push(s);
    bins.set(key, bin);
  }
  for (const { owner, sources: members } of bins.values()) {
    if (members.length < 2) continue;
    const group = merge(b, owner, members);
    if (group) b.groups.push(group);
  }
}

function dissolve(b: Batcher, g: Group) {
  g.batch.removeFromParent();
  g.batch.geometry.dispose();
  (g.batch.material as Material).dispose();
  for (const s of g.sources) reveal(b, s);
}

function ownerFor(b: Batcher, mesh: Mesh) {
  for (let p = mesh.parent; p && p !== b.root; p = p.parent) {
    if (hasHandlers(p) || b.moving.has(p) || b.gates.has(p) || p.userData.gate) return p;
  }
  return b.root;
}

function sourceFor(b: Batcher, mesh: Mesh): Source {
  const owner = ownerFor(b, mesh);
  const chain: Object3D[] = [];
  for (let p = mesh.parent; p && p !== owner; p = p.parent) chain.push(p);
  return { mesh, owner, chain, pose: new Float64Array(1 + NODE_SLOTS * (chain.length + 1)), look: new Float64Array(9), kept: null, recolours: 0 };
}

function nodeSnapshot(o: Object3D) {
  const out = new Float64Array(NODE_SLOTS);
  writeNode(out, 0, o);
  return out;
}

function watchSources(b: Batcher) {
  b.root.traverse((o) => {
    if (!candidate(o, b)) return;
    b.candidates.push(o);
    const look = new Float64Array(9);
    writeLook(look, o);
    b.looks.set(o, look);
    b.lookChanges.set(o, 0);
    for (let p: Object3D | null = o; p && p !== b.root; p = p.parent) if (!b.baseline.has(p)) b.baseline.set(p, nodeSnapshot(p));
  });
}

function observe(b: Batcher) {
  for (const [o, saved] of b.baseline) {
    const d = nodeDiff(saved, 0, o);
    if (d === 2) b.moving.add(o);
    else if (d === 1) b.gates.add(o);
  }
  for (const [mesh, saved] of b.looks) {
    if (!lookChanged(saved, mesh)) continue;
    b.lookChanges.set(mesh, (b.lookChanges.get(mesh) ?? 0) + 1);
    writeLook(saved, mesh);
  }
}

function settle(b: Batcher) {
  observe(b);
  const steady: Source[] = [];
  for (const mesh of b.candidates) {
    if (b.moving.has(mesh) || (b.lookChanges.get(mesh) ?? 0) > 1 || !candidate(mesh, b)) b.retired.add(mesh);
    else steady.push(sourceFor(b, mesh));
  }
  b.watching = false;
  b.candidates = [];
  b.baseline.clear();
  b.looks.clear();
  b.lookChanges.clear();
  build(b, steady);
}

function attached(mesh: Mesh, root: Object3D) {
  let p: Object3D | null = mesh;
  while (p && p !== root) p = p.parent;
  return p === root;
}

function learnGates(b: Batcher, s: Source) {
  for (let i = 0; i < s.chain.length; i++) {
    if (s.pose[1 + (i + 1) * NODE_SLOTS + 10] !== (shown(s.chain[i]) ? 1 : 0)) b.gates.add(s.chain[i]);
  }
}

function inspect(b: Batcher) {
  let retained = 0;
  for (let i = 0; i < b.groups.length; i++) {
    const g = b.groups[i];
    let worst = 0;
    let recoloured = false;
    for (const s of g.sources) {
      const d = attached(s.mesh, b.root) ? poseDiff(s) : 2;
      if (d > worst) worst = d;
      if (!recoloured && lookChanged(s.look, s.mesh)) recoloured = true;
    }
    if (worst === 0 && !recoloured) {
      b.groups[retained++] = g;
      continue;
    }
    dissolve(b, g);
    for (const s of g.sources) {
      if (worst === 2) {
        b.retired.add(s.mesh);
        continue;
      }
      if (worst === 1) learnGates(b, s);
      writeLook(s.look, s.mesh);
      if (recoloured) s.recolours += 1;
      b.pending.push(s);
    }
  }
  b.groups.length = retained;
  if (b.pending.length === 0) return;
  const ready: Source[] = [];
  const waiting: Source[] = [];
  for (const s of b.pending) {
    if (!attached(s.mesh, b.root) || !candidate(s.mesh, b)) continue;
    if (!lookChanged(s.look, s.mesh)) {
      ready.push(sourceFor(b, s.mesh));
      continue;
    }
    s.recolours += 1;
    writeLook(s.look, s.mesh);
    if (s.recolours >= RESTLESS_CHECKS) b.retired.add(s.mesh);
    else waiting.push(s);
  }
  b.pending = waiting;
  if (ready.length > 0) build(b, ready);
}

function labelOffset(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) % CHECK_EVERY;
  return h;
}

export function createBatcher(root: Object3D, label: string): Batcher {
  const b: Batcher = {
    root,
    label,
    frame: 0,
    offset: labelOffset(label),
    watching: true,
    candidates: [],
    baseline: new Map(),
    looks: new Map(),
    lookChanges: new Map(),
    moving: new Set(),
    groups: [],
    pending: [],
    retired: new WeakSet(),
    gates: new WeakSet(),
    frozen: new WeakMap(),
  };
  watchSources(b);
  active.add(b);
  return b;
}

export function tickBatcher(b: Batcher) {
  b.frame += 1;
  if (b.watching) {
    if (b.frame >= WARMUP_FRAMES + b.offset) settle(b);
    else if (b.frame % OBSERVE_EVERY === 0) observe(b);
    return;
  }
  if ((b.frame + b.offset) % CHECK_EVERY === 0) inspect(b);
}

export function disposeBatcher(b: Batcher) {
  active.delete(b);
  for (const g of b.groups) dissolve(b, g);
  b.groups = [];
  b.pending = [];
  b.watching = false;
}
