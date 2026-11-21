"use client";

import Image from "next/image";
import { useState } from "react";
import type { VideoSlot } from "@/content/site";
import { fill } from "@/content/copy";
import { pauseMusic } from "./SiteMusic";
import { useCopy } from "@/content/CopyProvider";
import { track } from "@/lib/analytics/track";
import { youtubeHref, youtubeThumb } from "./youtube";

export default function YouTubeFrame({ slot, poster = false }: { slot: VideoSlot; poster?: boolean }) {
  const { ROOMS } = useCopy();
  const [playing, setPlaying] = useState(false);
  const play = () => {
    pauseMusic();
    setPlaying(true);
    track("video_play", { video_title: slot.title });
  };
  if (!playing) {
    return (
      <>
        <button type="button" data-play className={poster ? "yt-facade yt-facade--poster" : "yt-facade"} onClick={play} aria-label={fill(ROOMS.listen.play, { title: slot.title })}>
          {poster && <Image src={youtubeThumb(slot.id)} alt="" fill sizes="(max-width: 760px) 100vw, 720px" unoptimized className="yt-facade__poster" />}
          <span className="media-card__play" aria-hidden />
          <span className="yt-facade__title">{slot.title}</span>
        </button>
        <a className="yt-facade__out" href={youtubeHref(slot.id)} target="_blank" rel="noreferrer">
          {ROOMS.listen.openYoutube}
        </a>
      </>
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
