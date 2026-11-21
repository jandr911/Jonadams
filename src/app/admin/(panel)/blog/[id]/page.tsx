import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ActionForm from "@/components/admin/ActionForm";
import AdminHead from "@/components/admin/AdminHead";
import Field from "@/components/admin/Field";
import MediaField from "@/components/admin/MediaField";
import PostBlocks from "@/components/admin/PostBlocks";
import { adminPost } from "@/lib/admin/posts";
import { removePost, savePost } from "../../../actions";

export const instant = false;

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await adminPost((await params).id);
  return { title: post?.title ?? "Blog" };
}

export default async function PostAdmin({ params }: { params: Params }) {
  const post = await adminPost((await params).id);
  if (!post) notFound();
  return (
    <>
      <AdminHead
        title={post.title}
        back={{ href: "/admin/blog", label: "Blog" }}
        lede={
          post.published ? (
            <>
              Live on the site.{" "}
              <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                Read it there
              </a>
              .
            </>
          ) : (
            "A draft. Visitors cannot see it until you set it to Published and press Save."
          )
        }
      />
      <div className="admin-stack">
        <article className="admin-card">
          <ActionForm action={savePost} submit="Save" className="admin-form admin-form--wide" keepValues>
            <input type="hidden" name="id" value={post.id} />
            <Field label="Title" name="title" defaultValue={post.title} required />
            <label className="field">
              <span className="field__label">Who can see it</span>
              <select className="field__input" name="status" defaultValue={post.published ? "published" : "draft"}>
                <option value="draft">Draft, hidden</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Date</span>
              <input className="field__input" type="date" name="date" defaultValue={post.date} required />
              <span className="field__hint">Shown on the post. Newest dates come first.</span>
            </label>
            <Field className="field--full" label="Short summary" name="summary" defaultValue={post.summary} multiline hint="One or two sentences on the post's card, in Google and when it is shared. Needed to publish; drafts can leave it empty." />
            <MediaField label="Cover photo" name="cover" current={post.cover} accept="image" folder="blog" />
            <PostBlocks key={JSON.stringify(post.blocks)} initial={post.blocks} />
          </ActionForm>
        </article>
        <article className="admin-card admin-card--quiet">
          <p className="admin-note">Deleting {post.title} removes the post and its uploaded photos from the site. It cannot be undone.</p>
          <ActionForm action={removePost} submit="Delete the post" danger confirm={`Delete ${post.title}?`}>
            <input type="hidden" name="id" value={post.id} />
          </ActionForm>
        </article>
      </div>
    </>
  );
}
