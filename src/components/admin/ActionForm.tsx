"use client";

import { startTransition, useActionState } from "react";

export type FormState = { ok: boolean; message: string } | null;
export type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

interface ActionFormProps {
  action: FormAction;
  submit: string;
  children?: React.ReactNode;
  className?: string;
  confirm?: string;
  danger?: boolean;
  compact?: boolean;
  keepValues?: boolean;
}

export default function ActionForm({ action, submit, children, className, confirm, danger = false, compact = false, keepValues = false }: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        if (keepValues) {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }
      }}
    >
      {children}
      <div className={compact ? "admin-form__inline" : "admin-form__row"}>
        <button type="submit" className={danger ? "admin-btn admin-btn--danger" : compact ? "admin-btn admin-btn--quiet" : "admin-btn admin-btn--primary"} disabled={pending} aria-label={compact ? submit : undefined}>
          {pending ? "…" : submit}
        </button>
        {state && (!compact || !state.ok) && (
          <span className={`admin-status ${state.ok ? "is-ok" : "is-error"}`} role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
