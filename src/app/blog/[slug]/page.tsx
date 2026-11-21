import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Room, { roomLinks, roomMetadata } from "@/components/Room";
import { BlogBackdrop } from "@/components/room/BlogScene";
import PostBody from "@/components/room/PostBody";
import PostCard, { postDate } from "@/components/room/PostCard";
import JsonLd from "@/components/JsonLd";
import { getContent } from "@/lib/content";
import { postGraph } from "@/lib/structuredData";

export const instant = false;

const NO_POST = "-";

type Params = Promise<{ slug: string }>;

async function postBySlug(slug: string) {
  const { posts } = await getContent();
  return posts.find((p) => p.slug === slug);
}

export async function generateStaticParams() {
  const { posts } = await getContent();
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: NO_POST }];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await postBySlug((await params).slug);
  if (!post) return {};
  const { copy } = await getContent();
  const meta = roomMetadata(copy, "blog", post.summary || copy.ROOMS.blog.description, { title: post.title, path: `/blog/${post.slug}` });
  if (!post.cover) return meta;
  const images = { url: post.cover, alt: post.title };
  return { ...meta, openGraph: { ...meta.openGraph, type: "article", images }, twitter: { ...meta.twitter, images } };
}

export default async function PostPage({ params }: { params: Params }) {
  const post = await postBySlug((await params).slug);
  if (!post) notFound();
  const { copy } = await getContent();
  return (
    <>
      <JsonLd data={postGraph(copy, post)} />
      <Room
        district="blog"
        scene={{
          sign: { eyebrow: postDate(post.date), title: post.title },
          art: (
            <>
              <BlogBackdrop />
              <div className="stage__screen">
                <PostCard post={post} index="" copy={copy} sizes="(max-width: 720px) 0px, 22vw" className="post-card--screen" href="#post" cta={copy.BLOG.readBelow} video />
              </div>
            </>
          ),
          phone: null,
          article: <PostBody post={post} />,
          plaques: [copy.BLOG.back],
          links: roomLinks(["club", "listen", "watch", "creatives", "merch"]),
        }}
      />
    </>
  );
}
