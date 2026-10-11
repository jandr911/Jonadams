"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="admin-card">
      <h1 className="admin-title">Something went wrong</h1>
      <p className="admin-status is-error">{error.message}</p>
      <button type="button" className="admin-btn admin-btn--primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
