import { Effect } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
  uniform float uStrength;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = max(inputColor.rgb, 0.0);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float shadows = 1.0 - smoothstep(0.0, 0.18, l);
    float highlights = smoothstep(0.25, 1.0, l);
    c *= mix(vec3(1.0), vec3(0.96, 0.99, 1.05), shadows * uStrength);
    c *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), highlights * uStrength);
    c = mix(vec3(l), c, 1.0 - 0.1 * uStrength);
    c += 0.004 * uStrength * (1.0 - min(c, 1.0));
    outputColor = vec4(c, inputColor.a);
  }
`;

export class FilmGradeEffect extends Effect {
  constructor(strength = 1) {
    super("FilmGradeEffect", fragmentShader, {
      uniforms: new Map([["uStrength", new Uniform(strength)]]),
    });
  }
}
