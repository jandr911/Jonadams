import type { VideoSlot } from "@/content/site";

export default function YouTubeEmbed({ slot, index }: { slot: VideoSlot; index: number }) {
  return (
    <figure className="media-card">
      <div className="media-card__frame">
        {slot.id ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${slot.id}?rel=0&modestbranding=1`}
            title={slot.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="media-card__empty">
            <span className="media-card__play" aria-hidden />
            <span className="eyebrow">Arriving soon</span>
          </div>
        )}
      </div>
      <figcaption className="media-card__caption">
        <span className="media-card__index">{String(index + 1).padStart(2, "0")}</span>
        <span className="media-card__title">{slot.title}</span>
        <span className="media-card__kind">{slot.kind}</span>
      </figcaption>
    </figure>
  );
}
