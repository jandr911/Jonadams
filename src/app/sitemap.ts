import type { MetadataRoute } from "next";
import { PLACES } from "@/components/city/layout";
import { SITE_URL } from "@/content/site";
import { getContent } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts, creatives } = await getContent();
  return [
    { url: SITE_URL },
    ...PLACES.map((place) => ({ url: `${SITE_URL}${place.href}` })),
    ...posts.map((post) => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: post.date })),
    ...creatives.map((creative) => ({ url: `${SITE_URL}/creatives/${creative.slug}` })),
  ];
}
