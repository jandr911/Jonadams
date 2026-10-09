"use client";

import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, Noise, SMAA, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";

export default function Effects() {
  const dn = useDayNight();
  const { quality } = useCity();
  if (quality === "low") return null;
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        mipmapBlur
        luminanceThreshold={0.92}
        luminanceSmoothing={0.25}
        intensity={dn.bloom}
        radius={0.72}
      />
      <HueSaturation saturation={-0.08} />
      <BrightnessContrast brightness={-0.02} contrast={0.1} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.26} />
      <Vignette eskil={false} offset={0.16} darkness={0.66} />
    </EffectComposer>
  );
}
