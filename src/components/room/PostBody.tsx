import Image from "next/image";
import { isRemote } from "@/lib/supabase/media";
import type { Post, PostBlock } from "@/content/site";
import { getContent } from "@/lib/content";
import YouTubeFrame from "../YouTubeFrame";
import RoomLink from "./RoomLink";
import { postDate } from "./PostCard";


function paragraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function Block({ block, post, index }: { block: PostBlock; post: Post; index: number }) {
  switch (block.kind) {
    case "heading":
      return block.text ? <h3 className="post__heading">{block.text}</h3> : null;
    case "text":
      return (
        <>
          {paragraphs(block.text).map((p, i) => (
            <p key={i} className="post__text">
              {p}
            </p>
          ))}
        </>
      );
    case "photo":
      return block.src ? (
        <figure className="post__figure">
          <Image src={block.src} alt={block.caption || `${post.title}, photo ${index + 1}`} width={1440} height={960} sizes="(max-width: 760px) 100vw, 720px" unoptimized={isRemote(block.src)} className="post__photo" />
          {block.caption && <figcaption className="post__caption">{block.caption}</figcaption>}
        </figure>
      ) : null;
    case "video":
      return block.youtube ? (
        <figure className="post__figure">
          <div className="media-card__frame">
            <YouTubeFrame slot={{ uid: `${post.id}-${index}`, id: block.youtube, title: block.caption || post.title, kind: "video" }} poster />
          </div>
        </figure>
      ) : null;
  }
}

export default async function PostBody({ post }: { post: Post }) {
  const { copy } = await getContent();
  return (
    <article id="post" className="post">
      <header className="post__head">
        <time className="eyebrow" dateTime={post.date}>
          {postDate(post.date)}
        </time>
        <h2 className="post__title">{post.title}</h2>
        {post.summary && <p className="post__summary">{post.summary}</p>}
      </header>
      {post.blocks.map((block, i) => (
        <Block key={i} block={block} post={post} index={i} />
      ))}
      <footer className="post__foot">
        <RoomLink href={copy.BLOG.back.href} className="post-card__read">
          {copy.BLOG.back.label} · {copy.BLOG.back.note}
        </RoomLink>
      </footer>
    </article>
  );
}
