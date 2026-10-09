"use client";

import { useState } from "react";

export default function JoinList({ email }: { email: string }) {
  const [value, setValue] = useState("");
  const closed = !email;
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (closed || !value) return;
    const subject = encodeURIComponent("Join the list");
    const body = encodeURIComponent(`Please add ${value} to the Adams UniverseCity list.`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };
  return (
    <form className="join" onSubmit={onSubmit} aria-label="Join the list">
      <label className="eyebrow" htmlFor="join-email">
        Join the list
      </label>
      <div className="join__row">
        <input
          id="join-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={closed ? "List opens soon" : "you@email.com"}
          disabled={closed}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn-solid" disabled={closed}>
          Join
        </button>
      </div>
    </form>
  );
}
