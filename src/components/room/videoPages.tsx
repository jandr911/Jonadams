import type { VideoSlot } from "@/content/site";
import { indexLabel } from "../city/layout";
import type { WallPage } from "./PagedConsole";
import PlayerScreen from "./PlayerScreen";

export function videoPages(videos: VideoSlot[], perPage: number, pending: string): WallPage[] {
  const pages: WallPage[] = [];
  for (let start = 0; start < videos.length; start += perPage) {
    const chunk = videos.slice(start, start + perPage);
    pages.push({
      keys: chunk.map((v, i) => ({ id: v.uid, index: indexLabel(start + i), label: v.title })),
      screens: chunk.map((v, i) => <PlayerScreen key={v.uid} slot={v} index={indexLabel(start + i)} pending={pending} />),
    });
  }
  return pages;
}
