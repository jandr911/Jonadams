import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import { PaperGlyph, postDate } from "@/components/room/PostCard";
import { adminPosts } from "@/lib/admin/posts";
import { savePost } from "../../actions";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogAdmin() {
  const posts = await adminPosts();
  return (
    <>
      <AdminHead title="Blog" lede="Every post, newest first. Drafts stay hidden from visitors until you set them to Published." />
      <div className="admin-stack">
        {posts.length === 0 && <p className="admin-note">No posts yet, so the Blog room says the first post is coming soon. Start one below.</p>}
        {posts.map((p) => (
          <article key={p.id} className="admin-card admin-row">
            <span className="admin-row__portrait admin-row__portrait--merch">
              {p.cover ? <Image src={p.cover} alt="" fill sizes="48px" unoptimized /> : <PaperGlyph />}
            </span>
            <div className="admin-row__body">
              <strong>{p.title}</strong>
              <span>{[postDate(p.date), p.published ? "Published" : "Draft, hidden from visitors"].join(" · ")}</span>
            </div>
            <Link href={`/admin/blog/${p.id}`} className="admin-btn admin-btn--primary">
              Open
            </Link>
          </article>
        ))}
        <article className="admin-card admin-card--add">
          <h2 className="admin-card__title">Start a post</h2>
          <ActionForm action={savePost} submit="Start and open" className="admin-form admin-form--wide">
            <Field label="Title" name="title" required placeholder="Back in the studio" hint="It starts as a draft. Write it and add photos and videos on the next screen." />
          </ActionForm>
        </article>
      </div>
    </>
  );
}
