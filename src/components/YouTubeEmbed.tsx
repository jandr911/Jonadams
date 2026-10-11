import { ROOMS, type VideoSlot } from "@/content/site";
import { indexLabel } from "./city/layout";
import YouTubeFrame from "./YouTubeFrame";

export default function YouTubeEmbed({ slot, index }: { slot: VideoSlot; index: number }) {
  return (
    <figure className="media-card">
      <div className="media-card__frame">
        {slot.id ? (
          <YouTubeFrame slot={slot} />
        ) : (
          <div className="media-card__empty">
            <span className="media-card__play" aria-hidden />
            <span className="eyebrow">{ROOMS.listen.pending}</span>
          </div>
        )}
      </div>
      <figcaption className="media-card__caption">
        <span className="media-card__index">{indexLabel(index)}</span>
        <span className="media-card__title">{slot.title}</span>
        <span className="media-card__kind">{slot.kind}</span>
      </figcaption>
    </figure>
  );
}
