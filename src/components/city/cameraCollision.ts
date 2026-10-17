import { Box3, InstancedMesh, Matrix4, Mesh, type Object3D, type Vector3 } from "three";
import { PITCH } from "./layout";

const SOLID = "solid";
const MAX_PUSHES = 4;

export function markSolid(o: Object3D | null) {
  if (o) o.userData[SOLID] = true;
}

const STRIDE = 5;
const CELL_OFFSET = 512;
const CELL_SPAN = 1024;

export interface Solids {
  boxes: Float32Array;
  cells: Map<number, number[]>;
}

function cellKey(ix: number, iz: number) {
  return (ix + CELL_OFFSET) * CELL_SPAN + iz + CELL_OFFSET;
}

function cellOf(v: number) {
  return Math.floor(v / PITCH);
}

export function collectSolids(root: Object3D, margin: number): Solids {
  const values: number[] = [];
  const box = new Box3();
  const local = new Box3();
  const instance = new Matrix4();
  const add = () => values.push(box.min.x - margin, box.max.x + margin, box.min.z - margin, box.max.z + margin, box.max.y + margin);
  root.updateMatrixWorld();
  root.traverse((o) => {
    if (!o.userData[SOLID] || !(o instanceof Mesh)) return;
    const geometry = o.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;
    local.copy(geometry.boundingBox);
    if (o instanceof InstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, instance);
        instance.premultiply(o.matrixWorld);
        box.copy(local).applyMatrix4(instance);
        add();
      }
      return;
    }
    box.copy(local).applyMatrix4(o.matrixWorld);
    add();
  });

  const boxes = new Float32Array(values);
  const cells = new Map<number, number[]>();
  for (let i = 0; i < boxes.length; i += STRIDE) {
    for (let ix = cellOf(boxes[i]); ix <= cellOf(boxes[i + 1]); ix++) {
      for (let iz = cellOf(boxes[i + 2]); iz <= cellOf(boxes[i + 3]); iz++) {
        const key = cellKey(ix, iz);
        const list = cells.get(key);
        if (list) list.push(i);
        else cells.set(key, [i]);
      }
    }
  }
  return { boxes, cells };
}

function contains(b: Float32Array, i: number, p: Vector3) {
  return p.x > b[i] && p.x < b[i + 1] && p.z > b[i + 2] && p.z < b[i + 3] && p.y < b[i + 4];
}

function firstContaining(solids: Solids, p: Vector3) {
  const ids = solids.cells.get(cellKey(cellOf(p.x), cellOf(p.z)));
  if (!ids) return -1;
  for (const i of ids) if (contains(solids.boxes, i, p)) return i;
  return -1;
}

function pushOut(b: Float32Array, i: number, p: Vector3) {
  const toLeft = p.x - b[i];
  const toRight = b[i + 1] - p.x;
  const toNear = p.z - b[i + 2];
  const toFar = b[i + 3] - p.z;
  const toTop = b[i + 4] - p.y;
  const least = Math.min(toLeft, toRight, toNear, toFar, toTop);
  if (least === toTop) p.y = b[i + 4];
  else if (least === toLeft) p.x = b[i];
  else if (least === toRight) p.x = b[i + 1];
  else if (least === toNear) p.z = b[i + 2];
  else p.z = b[i + 3];
}

export function pushOutOfSolids(solids: Solids, p: Vector3) {
  let hit = firstContaining(solids, p);
  if (hit < 0) return false;
  for (let n = 0; n < MAX_PUSHES && hit >= 0; n++) {
    pushOut(solids.boxes, hit, p);
    hit = firstContaining(solids, p);
  }
  while (hit >= 0) {
    p.y = solids.boxes[hit + 4];
    hit = firstContaining(solids, p);
  }
  return true;
}
