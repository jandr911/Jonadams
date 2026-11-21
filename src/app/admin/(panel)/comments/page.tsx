import type { Metadata } from "next";
import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import { postHref } from "@/components/room/PostCard";
import { adminComments } from "@/lib/admin/comments";
import { adminPosts } from "@/lib/admin/posts";
import { removeComment } from "../../actions";

export const metadata: Metadata = { title: "Comments" };

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Detroit" });

export default async function CommentsAdmin() {
  const [comments, posts] = await Promise.all([adminComments(), adminPosts()]);
  const postById = new Map(posts.map((p) => [p.id, p]));
  return (
    <>
      <AdminHead title="Comments" lede="What visitors have written under your blog posts, newest first. Comments show on the site straight away; delete any you don't want there." />
      <div className="admin-stack">
        {comments.length === 0 && <p className="admin-empty">No comments yet.</p>}
        {comments.map((c) => {
          const post = postById.get(c.postId);
          return (
            <article key={c.id} className="admin-card">
              <h2 className="admin-card__title">
                {c.name} · {WHEN.format(new Date(c.createdAt))}
              </h2>
              {post && (
                <p className="admin-note">
                  On <Link href={post.published ? postHref(post) : `/admin/blog/${post.id}`}>{post.title}</Link>{post.published ? "" : " (draft)"}
                </p>
              )}
              <p className="admin-comment">{c.body}</p>
              <div className="admin-card__tools">
                <ActionForm action={removeComment} submit="Delete" compact danger confirm={`Delete this comment from ${c.name}?`}>
                  <input type="hidden" name="id" value={c.id} />
                </ActionForm>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
