import { PLACES, placeById } from "@/components/city/layout";
import { fill, type SiteCopy } from "@/content/copy";
import { SITE_URL } from "@/content/site";
import { getContent } from "@/lib/content";

function isRoom(id: string, rooms: SiteCopy["ROOMS"]): id is keyof SiteCopy["ROOMS"] {
  return id in rooms;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function linkText(value: string): string {
  return oneLine(value).replace(/[[\]]/g, "\\$&");
}

export async function GET() {
  const { copy, posts } = await getContent();
  const { SITE, DESCRIPTION, SEARCH, ROOMS } = copy;
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${oneLine(DESCRIPTION)}`,
    "",
    fill(SEARCH.llms.about, { artist: SITE.artist, nickname: SITE.nickname, city: SITE.city }),
    "",
    `## ${SEARCH.llms.rooms}`,
    "",
    ...PLACES.flatMap((place) => (isRoom(place.id, ROOMS) ? [`- [${place.label}](${SITE_URL}${place.href}): ${oneLine(ROOMS[place.id].description)}`] : [])),
  ];
  if (posts.length) {
    lines.push("", `## ${placeById("blog").label}`, "", ...posts.map((post) => `- [${linkText(post.title)}](${SITE_URL}/blog/${post.slug})${post.summary ? `: ${oneLine(post.summary)}` : ""}`));
  }
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
