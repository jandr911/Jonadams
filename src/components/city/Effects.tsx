"use client";

import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, Noise, SMAA, Vignette } from "@react-three/postprocessing";
import { BlendFunction, type BloomEffect, type BrightnessContrastEffect, type HueSaturationEffect } from "postprocessing";
import { useEffect, useRef, useState } from "react";
import { useCity } from "./CityContext";
import { useDayNight } from "./DayNightContext";
import { FilmGradeEffect } from "./filmGrade";

export default function Effects() {
  const dn = useDayNight();
  const { quality } = useCity();
  const [grade] = useState(() => new FilmGradeEffect());
  useEffect(() => () => grade.dispose(), [grade]);
  const bloom = useRef<BloomEffect>(null);
  const hueSat = useRef<HueSaturationEffect>(null);
  const tone = useRef<BrightnessContrastEffect>(null);
  useEffect(() => {
    const day = 1 - dn.night;
    if (bloom.current) bloom.current.intensity = dn.bloom;
    if (hueSat.current) hueSat.current.saturation = -0.08 - day * 0.1;
    if (tone.current) tone.current.contrast = 0.1 + day * 0.08;
  }, [dn, quality]);
  if (quality === "low") return null;
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.3} radius={0.5} />
      <HueSaturation ref={hueSat} saturation={-0.08} />
      <BrightnessContrast ref={tone} brightness={-0.02} contrast={0.1} />
      <primitive object={grade} />
      <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.1} />
      <Vignette eskil={false} offset={0.16} darkness={0.66} />
    </EffectComposer>
  );
}
