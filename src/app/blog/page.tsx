import type { Metadata } from "next";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import { indexLabel, placeById } from "@/components/city/layout";
import BlogScene from "@/components/room/BlogScene";
import PostCard, { BlogSoon } from "@/components/room/PostCard";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  return roomMetadata(copy, "blog", copy.ROOMS.blog.description);
}

export default async function BlogPage() {
  const { copy, posts } = await getContent();
  const phone =
    posts.length > 0 ? (
      <ul className="stage__list">
        {posts.map((p, i) => (
          <li key={p.id}>
            <PostCard post={p} index={indexLabel(i)} copy={copy} sizes="(max-width: 720px) 40vw, 0px" className="post-card--phone" />
          </li>
        ))}
      </ul>
    ) : (
      <BlogSoon copy={copy} className="merch-soon--phone" />
    );
  return (
    <Room
      district="blog"
      scene={{
        art: <BlogScene posts={posts} />,
        phone,
        plaques: copy.BLOG_DESK,
        links: roomLinks(["club", "listen", "watch", "creatives", "merch"]),
        sign: { eyebrow: copy.BLOG.eyebrow, title: placeById("blog").label },
      }}
    />
  );
}
