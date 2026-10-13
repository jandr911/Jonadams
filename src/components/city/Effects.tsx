"use client";

import { Bloom, EffectComposer, HueSaturation, Noise, SMAA, Vignette } from "@react-three/postprocessing";
import { BlendFunction, type BloomEffect, type HueSaturationEffect } from "postprocessing";
import { useEffect, useRef, useState } from "react";
import { useDayNight } from "./DayNightContext";
import { FilmGradeEffect, setGradeContrast } from "./filmGrade";
import { InkEdgesEffect, setInkStrength } from "./inkEdges";

export default function Effects() {
  const dn = useDayNight();
  const [grade] = useState(() => new FilmGradeEffect());
  useEffect(() => () => grade.dispose(), [grade]);
  const [ink] = useState(() => new InkEdgesEffect());
  useEffect(() => () => ink.dispose(), [ink]);
  const bloom = useRef<BloomEffect>(null);
  const hueSat = useRef<HueSaturationEffect>(null);
  useEffect(() => {
    const day = 1 - dn.night;
    if (bloom.current) bloom.current.intensity = dn.bloom;
    if (hueSat.current) hueSat.current.saturation = 0.24 - day * 0.06;
    setGradeContrast(grade, 0.1 + day * 0.08);
    setInkStrength(ink, 0.4 + day * 0.3);
  }, [dn, ink, grade]);
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <primitive object={ink} />
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.3} radius={0.5} />
      <HueSaturation ref={hueSat} saturation={0.18} />
      <primitive object={grade} />
      <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.1} />
      <Vignette eskil={false} offset={0.16} darkness={0.66} />
    </EffectComposer>
  );
}
