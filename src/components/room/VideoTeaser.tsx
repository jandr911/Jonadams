"use client";

import Image from "next/image";
import { youtubeThumb } from "../youtube";

export default function VideoTeaser({ youtube, target, label, note, sizes }: { youtube: string; target: string; label: string; note: string; sizes: string }) {
  const playBelow = () => {
    const figure = document.getElementById(target);
    if (!figure) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    figure.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    figure.querySelector<HTMLButtonElement>("[data-play]")?.click();
  };
  return (
    <button type="button" className="yt-facade yt-facade--poster" onClick={playBelow} aria-label={label}>
      <Image src={youtubeThumb(youtube)} alt="" fill sizes={sizes} unoptimized className="yt-facade__poster" />
      <span className="media-card__play" aria-hidden />
      <span className="video-teaser__note" aria-hidden>
        {note}
      </span>
    </button>
  );
}
