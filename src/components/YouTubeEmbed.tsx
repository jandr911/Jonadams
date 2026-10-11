import type { VideoSlot } from "@/content/site";
import { indexLabel } from "./city/layout";
import YouTubeFrame from "./YouTubeFrame";
import { youtubeHref } from "./youtube";

export default function YouTubeEmbed({ slot, index, pending, openYoutube }: { slot: VideoSlot; index: number; pending: string; openYoutube: string }) {
  return (
    <figure className="media-card">
      <div className="media-card__frame">
        {slot.id ? (
          <YouTubeFrame slot={slot} />
        ) : (
          <div className="media-card__empty">
            <span className="media-card__play" aria-hidden />
            <span className="eyebrow">{pending}</span>
          </div>
        )}
      </div>
      <figcaption className="media-card__caption">
        <span className="media-card__index">{indexLabel(index)}</span>
        <span className="media-card__title">{slot.title}</span>
        {slot.id ? (
          <a className="media-card__kind media-card__link" href={youtubeHref(slot.id)} target="_blank" rel="noreferrer">
            {openYoutube}
          </a>
        ) : (
          <span className="media-card__kind">{slot.kind}</span>
        )}
      </figcaption>
    </figure>
  );
}
