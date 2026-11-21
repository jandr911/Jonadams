"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { postComment } from "@/app/blog/actions";
import { useCopy } from "@/content/CopyProvider";
import { COMMENT_LIMITS } from "@/content/site";
import { track } from "@/lib/analytics/track";

export default function CommentForm({ postId }: { postId: string }) {
  const { COMMENTS } = useCopy();
  const [state, action, pending] = useActionState(postComment, null);
  const form = useRef<HTMLFormElement>(null);
  const openedAt = useRef(0);

  const markOpened = () => {
    if (!openedAt.current) openedAt.current = Date.now();
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("opened", String(openedAt.current));
    startTransition(() => action(data));
  };

  useEffect(() => {
    if (!state?.ok) return;
    form.current?.reset();
    openedAt.current = 0;
    track("comment_post");
  }, [state]);

  return (
    <form ref={form} action={action} className="comment-form" onInput={markOpened} onSubmit={submit}>
      <input type="hidden" name="post" value={postId} />
      <div className="comment-form__trap" aria-hidden>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="comment-form__field">
        <span className="comment-form__label">{COMMENTS.name}</span>
        <input type="text" name="name" required maxLength={COMMENT_LIMITS.name} autoComplete="name" className="comment-form__input" />
      </label>
      <label className="comment-form__field">
        <span className="comment-form__label">{COMMENTS.body}</span>
        <textarea name="body" required maxLength={COMMENT_LIMITS.body} rows={4} className="comment-form__input comment-form__input--body" />
      </label>
      <div className="comment-form__row">
        <button type="submit" className="btn-outline" disabled={pending}>
          {pending ? COMMENTS.sending : COMMENTS.submit}
        </button>
        {state && (
          <span className={state.ok ? "comment-form__status" : "comment-form__status comment-form__status--error"} role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
