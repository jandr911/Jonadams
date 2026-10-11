import { ROOMS, type VideoSlot } from "@/content/site";
import YouTubeFrame from "../YouTubeFrame";

export default function PlayerScreen({ slot, index }: { slot: VideoSlot; index: string }) {
  if (slot.id) {
    return (
      <div className="stage__player stage__player--live">
        <YouTubeFrame slot={slot} />
      </div>
    );
  }
  return (
    <div className="stage__player">
      <span className="stage__player-index">{index}</span>
      <span className="stage__player-kind">{slot.kind}</span>
      <span className="stage__player-ring" aria-hidden />
      <span className="stage__player-title">{slot.title}</span>
      <span className="stage__player-note">{ROOMS.listen.pending}</span>
    </div>
  );
}
