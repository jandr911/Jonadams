import {
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Plane,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { REFLECT_LAYER } from "./layers";

export const MIRROR_SCALE = 0.4;

interface MirrorScratch {
  virtualCamera: PerspectiveCamera;
  reflectorPos: Vector3;
  cameraPos: Vector3;
  normal: Vector3;
  view: Vector3;
  target: Vector3;
  lookAt: Vector3;
  rotation: Matrix4;
  plane: Plane;
  clip: Vector4;
  q: Vector4;
}

export function makeMirrorScratch(): MirrorScratch {
  return {
    virtualCamera: new PerspectiveCamera(),
    reflectorPos: new Vector3(),
    cameraPos: new Vector3(),
    normal: new Vector3(0, 1, 0),
    view: new Vector3(),
    target: new Vector3(),
    lookAt: new Vector3(),
    rotation: new Matrix4(),
    plane: new Plane(),
    clip: new Vector4(),
    q: new Vector4(),
  };
}

export function renderMirror(
  gl: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  mesh: Mesh,
  rt: WebGLRenderTarget,
  s: MirrorScratch,
) {
  const vc = s.virtualCamera;
  s.reflectorPos.setFromMatrixPosition(mesh.matrixWorld);
  s.cameraPos.setFromMatrixPosition(camera.matrixWorld);
  s.view.subVectors(s.reflectorPos, s.cameraPos);
  if (s.view.dot(s.normal) > 0) return;
  s.view.reflect(s.normal).negate().add(s.reflectorPos);

  s.rotation.extractRotation(camera.matrixWorld);
  s.lookAt.set(0, 0, -1).applyMatrix4(s.rotation).add(s.cameraPos);
  s.target.subVectors(s.reflectorPos, s.lookAt).reflect(s.normal).negate().add(s.reflectorPos);

  vc.position.copy(s.view);
  vc.up.set(0, 1, 0).applyMatrix4(s.rotation).reflect(s.normal);
  vc.lookAt(s.target);
  vc.near = camera.near;
  vc.far = camera.far;
  vc.updateMatrixWorld();
  vc.projectionMatrix.copy(camera.projectionMatrix);
  vc.layers.set(REFLECT_LAYER);

  const mat = mesh.material as ShaderMaterial;
  const textureMatrix: Matrix4 = mat.uniforms.uTextureMatrix.value;
  textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  textureMatrix.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse).multiply(mesh.matrixWorld);

  s.plane.setFromNormalAndCoplanarPoint(s.normal, s.reflectorPos).applyMatrix4(vc.matrixWorldInverse);
  s.clip.set(s.plane.normal.x, s.plane.normal.y, s.plane.normal.z, s.plane.constant);
  const pm = vc.projectionMatrix;
  s.q.x = (Math.sign(s.clip.x) + pm.elements[8]) / pm.elements[0];
  s.q.y = (Math.sign(s.clip.y) + pm.elements[9]) / pm.elements[5];
  s.q.z = -1;
  s.q.w = (1 + pm.elements[10]) / pm.elements[14];
  s.clip.multiplyScalar(2 / s.clip.dot(s.q));
  pm.elements[2] = s.clip.x;
  pm.elements[6] = s.clip.y;
  pm.elements[10] = s.clip.z + 1 - 0.0001;
  pm.elements[14] = s.clip.w;

  mat.uniforms.uMirror.value = rt.texture;

  const prevTarget = gl.getRenderTarget();
  const prevXr = gl.xr.enabled;
  const prevShadow = gl.shadowMap.autoUpdate;
  const prevShadowNeeded = gl.shadowMap.needsUpdate;
  mesh.visible = false;
  gl.xr.enabled = false;
  gl.shadowMap.autoUpdate = false;
  gl.shadowMap.needsUpdate = false;
  gl.setRenderTarget(rt);
  gl.state.buffers.depth.setMask(true);
  gl.clear();
  gl.render(scene, vc);
  gl.setRenderTarget(prevTarget);
  gl.xr.enabled = prevXr;
  gl.shadowMap.autoUpdate = prevShadow;
  gl.shadowMap.needsUpdate = prevShadowNeeded;
  mesh.visible = true;
}
