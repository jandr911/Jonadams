import { Effect } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
  uniform float uStrength;
  uniform float uContrast;

  const float BRIGHTNESS = -0.02;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Saturation pushes strong colours below zero, and pow() inside the sRGB conversions turns a
    // negative into NaN, which phone GPUs draw black. Clamp before each conversion.
    vec3 s = sRGBTransferOETF(vec4(max(inputColor.rgb, 0.0), 1.0)).rgb;
    s = (s + BRIGHTNESS - 0.5) / (1.0 - uContrast) + 0.5;
    vec3 c = sRGBToLinear(vec4(max(s, 0.0), 1.0)).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float shadows = 1.0 - smoothstep(0.0, 0.18, l);
    float highlights = smoothstep(0.25, 1.0, l);
    c *= mix(vec3(1.0), vec3(0.96, 0.99, 1.05), shadows * uStrength);
    c *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), highlights * uStrength);
    c += 0.004 * uStrength * (1.0 - min(c, 1.0));
    outputColor = vec4(c, inputColor.a);
  }
`;

export class FilmGradeEffect extends Effect {
  constructor(strength = 1) {
    super("FilmGradeEffect", fragmentShader, {
      uniforms: new Map([
        ["uStrength", new Uniform(strength)],
        ["uContrast", new Uniform(0.1)],
      ]),
    });
  }
}

export function setGradeContrast(effect: FilmGradeEffect, value: number) {
  (effect.uniforms.get("uContrast") as Uniform<number>).value = value;
}
