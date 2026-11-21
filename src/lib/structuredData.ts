import { placeById } from "@/components/city/layout";
import type { SiteCopy } from "@/content/copy";
import { SITE_URL, type Post, type SiteLink } from "@/content/site";

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

function absolute(src: string): string {
  return src.startsWith("/") ? `${SITE_URL}${src}` : src;
}

function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function siteGraph(copy: SiteCopy, links: SiteLink[]) {
  const { SITE, DESCRIPTION, SEARCH } = copy;
  const sameAs = links.map((link) => link.href).filter((href) => /^https?:\/\//.test(href));
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": WEBSITE_ID, url: `${SITE_URL}/`, name: SITE.name, description: DESCRIPTION, publisher: { "@id": PERSON_ID }, inLanguage: "en-US" },
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: SITE.artist,
        ...(SITE.nickname ? { alternateName: SITE.nickname } : {}),
        jobTitle: SEARCH.role,
        description: DESCRIPTION,
        url: `${SITE_URL}/`,
        homeLocation: { "@type": "Place", name: SITE.city },
        ...(sameAs.length ? { sameAs } : {}),
      },
    ],
  };
}

export function postGraph(copy: SiteCopy, post: Post) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const blog = placeById("blog");
  const description = post.summary || copy.ROOMS.blog.description;
  const videos = post.blocks.flatMap((block) => (block.kind === "video" && block.youtube ? [block] : []));
  const image = post.cover ? absolute(post.cover) : videos.length ? youtubeThumbnail(videos[0].youtube) : `${SITE_URL}/share-image`;
  const videoId = (index: number) => `${url}#video-${index + 1}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#post`,
        headline: post.title,
        description,
        datePublished: post.date,
        image: [image],
        author: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
        isPartOf: { "@id": WEBSITE_ID },
        mainEntityOfPage: url,
        ...(videos.length ? { video: videos.map((_, index) => ({ "@id": videoId(index) })) } : {}),
      },
      ...videos.map((video, index) => ({
        "@type": "VideoObject",
        "@id": videoId(index),
        name: video.caption || post.title,
        description: video.caption || description,
        thumbnailUrl: youtubeThumbnail(video.youtube),
        uploadDate: post.date,
        embedUrl: `https://www.youtube.com/embed/${video.youtube}`,
        contentUrl: `https://www.youtube.com/watch?v=${video.youtube}`,
      })),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: copy.SITE.name, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: blog.label, item: `${SITE_URL}${blog.href}` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
}
