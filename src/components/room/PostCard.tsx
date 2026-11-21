import Image from "next/image";
import { isRemote } from "@/lib/supabase/media";
import { fill, type SiteCopy } from "@/content/copy";
import type { Post } from "@/content/site";
import RoomLink from "./RoomLink";
import VideoTeaser from "./VideoTeaser";

export const POST_VIDEO = "post-video";

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function postDate(date: string) {
  return DATE.format(new Date(`${date}T00:00:00Z`));
}

export function postHref(post: Post) {
  return `/blog/${post.slug}`;
}

export function PaperGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path d="M9 8 H35 V38 a3 3 0 0 0 3 3 H12 a3 3 0 0 1 -3 -3 Z M35 16 H40 V38 a3 3 0 0 1 -3 3 M14 14 H30 M14 20 H30 M14 25 H24 M14 30 H30 M14 35 H26" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function firstVideo(post: Post) {
  for (const block of post.blocks) if (block.kind === "video" && block.youtube) return block;
  return null;
}

export function PostCover({ post, copy, sizes, teaser = false }: { post: Post; copy: SiteCopy; sizes: string; teaser?: boolean }) {
  const clip = teaser ? firstVideo(post) : null;
  if (clip) {
    return (
      <div className="post-card__cover post-card__cover--video">
        <VideoTeaser youtube={clip.youtube} target={POST_VIDEO} label={copy.BLOG.watchBelow} note={copy.BLOG.fullVideo} sizes={sizes} />
      </div>
    );
  }
  return (
    <div className="post-card__cover">
      {post.cover ? (
        <Image src={post.cover} alt={fill(copy.BLOG.cover, { title: post.title })} fill sizes={sizes} unoptimized={isRemote(post.cover)} />
      ) : (
        <PaperGlyph className="post-card__glyph" />
      )}
    </div>
  );
}

interface PostCardProps {
  post: Post;
  index: string;
  copy: SiteCopy;
  sizes: string;
  className: string;
  teaser?: boolean;
}

function cardLink(post: Post, copy: SiteCopy, teaser: boolean) {
  if (!teaser) return { href: postHref(post), cta: copy.BLOG.read };
  return firstVideo(post) ? { href: `#${POST_VIDEO}`, cta: copy.BLOG.watchBelow } : { href: "#post", cta: copy.BLOG.readBelow };
}

export default function PostCard({ post, index, copy, sizes, className, teaser = false }: PostCardProps) {
  const { href, cta } = cardLink(post, copy, teaser);
  return (
    <article className={`post-card ${className}`}>
      <PostCover post={post} copy={copy} sizes={sizes} teaser={teaser} />
      <div className="post-card__meta">
        <span className="post-card__index">{index}</span>
        <time className="post-card__date" dateTime={post.date}>
          {postDate(post.date)}
        </time>
        <h2 className="post-card__title">{post.title}</h2>
        {post.summary && <p className="post-card__summary">{post.summary}</p>}
        <RoomLink href={href} className="post-card__read">
          {cta}
        </RoomLink>
      </div>
    </article>
  );
}

export function BlogSoon({ copy, className }: { copy: SiteCopy; className: string }) {
  const { BLOG } = copy;
  return (
    <div className={`merch-soon ${className}`}>
      <div className="merch-soon__rack" aria-hidden>
        <PaperGlyph />
      </div>
      <h2 className="merch-soon__title">{BLOG.soon}</h2>
      <p className="merch-soon__note">{BLOG.soonNote}</p>
      <a href="#join" className="merch-order__link">
        {BLOG.join}
      </a>
    </div>
  );
}
