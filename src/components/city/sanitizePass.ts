import { ShaderPass } from "postprocessing";
import { NoBlending, ShaderMaterial, Uniform } from "three";

const MAX_RADIANCE = 1024;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define MAX_RADIANCE ${MAX_RADIANCE.toFixed(1)}
  uniform sampler2D inputBuffer;
  varying vec2 vUv;

  float finite(float x) {
    uint bits = floatBitsToUint(x);
    if ((bits & 0x7f800000u) != 0x7f800000u) return x;
    return (bits & 0x807fffffu) == 0u ? MAX_RADIANCE : 0.0;
  }

  void main() {
    vec3 c = texture2D(inputBuffer, vUv).rgb;
    c = vec3(finite(c.r), finite(c.g), finite(c.b));
    gl_FragColor = vec4(clamp(c, 0.0, MAX_RADIANCE), 1.0);
  }
`;

// Bloom's mip blur spreads one NaN, infinite or negative texel across the whole frame, which Apple GPUs
// present as a fully black frame; this pass must run before every effect that samples neighbours.
// The test reads the exponent bits because fast-math compilers, Metal among them, may fold isnan() to false.
export function createSanitizePass() {
  return new ShaderPass(
    new ShaderMaterial({
      name: "SanitizeMaterial",
      uniforms: { inputBuffer: new Uniform(null) },
      vertexShader,
      fragmentShader,
      blending: NoBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    }),
  );
}
