import { Effect, EffectAttribute } from "postprocessing";
import { Uniform, Vector3 } from "three";

const fragmentShader = /* glsl */ `
  uniform float uStrength;
  uniform float uReach;
  uniform vec3 uInk;

  float inverseDepth(const in vec2 uv) {
    return -1.0 / getViewZ(readDepth(uv));
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    float w = -1.0 / getViewZ(depth);
    float wl = inverseDepth(uv - vec2(texelSize.x, 0.0));
    float wr = inverseDepth(uv + vec2(texelSize.x, 0.0));
    float wt = inverseDepth(uv + vec2(0.0, texelSize.y));
    float wb = inverseDepth(uv - vec2(0.0, texelSize.y));

    float jump = max(max(abs(wl - w), abs(wr - w)), max(abs(wt - w), abs(wb - w))) / w;
    float crease = (abs(wl + wr - 2.0 * w) + abs(wt + wb - 2.0 * w)) / w;

    float silhouette = smoothstep(0.03, 0.09, jump);
    float corner = smoothstep(0.0007, 0.002, crease);
    float reach = 1.0 - smoothstep(uReach * 0.3, uReach, 1.0 / w);
    float ink = max(silhouette, corner * 0.7) * reach * uStrength * step(depth, 0.9999);
    ink *= 1.0 - smoothstep(1.2, 2.0, dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722)));
    outputColor = vec4(mix(inputColor.rgb, uInk, ink), inputColor.a);
  }
`;

export class InkEdgesEffect extends Effect {
  constructor(strength = 0.6, reach = 450) {
    super("InkEdgesEffect", fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ["uStrength", new Uniform(strength)],
        ["uReach", new Uniform(reach)],
        ["uInk", new Uniform(new Vector3(0.05, 0.043, 0.038))],
      ]),
    });
  }
}

export function setInkStrength(effect: InkEdgesEffect, value: number) {
  (effect.uniforms.get("uStrength") as Uniform<number>).value = value;
}
