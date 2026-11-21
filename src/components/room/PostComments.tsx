import { fill } from "@/content/copy";
import { getComments, getContent } from "@/lib/content";
import CommentForm from "./CommentForm";

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Detroit" });

export default async function PostComments({ postId }: { postId: string }) {
  const [{ copy }, comments] = await Promise.all([getContent(), getComments(postId)]);
  const { COMMENTS } = copy;
  const heading = comments.length === 0 ? COMMENTS.title : comments.length === 1 ? COMMENTS.one : fill(COMMENTS.count, { count: comments.length });
  const headingId = `comments-${postId}`;
  return (
    <section className="comments" aria-labelledby={headingId}>
      <h3 id={headingId} className="comments__title">
        {heading}
      </h3>
      {comments.length > 0 ? (
        <ol className="comments__list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <div className="comment__head">
                <span className="comment__name">{c.name}</span>
                <time className="comment__date" dateTime={c.createdAt}>
                  {DATE.format(new Date(c.createdAt))}
                </time>
              </div>
              <p className="comment__body">{c.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="comments__empty">{COMMENTS.empty}</p>
      )}
      <CommentForm postId={postId} />
    </section>
  );
}
