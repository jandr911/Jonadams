"use client";

import { useState } from "react";
import { ROOMS, type VideoSlot } from "@/content/site";
import { pauseMusic } from "./SiteMusic";

export default function YouTubeFrame({ slot }: { slot: VideoSlot }) {
  const [playing, setPlaying] = useState(false);
  const play = () => {
    pauseMusic();
    setPlaying(true);
  };
  if (!playing) {
    return (
      <button type="button" className="yt-facade" onClick={play} aria-label={ROOMS.listen.play(slot.title)}>
        <span className="media-card__play" aria-hidden />
        <span className="yt-facade__title">{slot.title}</span>
      </button>
    );
  }
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${slot.id}?rel=0&modestbranding=1&autoplay=1`}
      title={slot.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}
