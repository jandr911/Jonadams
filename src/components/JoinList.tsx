"use client";

import { useState } from "react";
import { JOIN } from "@/content/site";

export default function JoinList({ email }: { email: string }) {
  const [value, setValue] = useState("");
  const closed = !email;
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (closed || !value) return;
    const subject = encodeURIComponent(JOIN.title);
    const body = encodeURIComponent(JOIN.body(value));
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };
  return (
    <form className="join" onSubmit={onSubmit} aria-label={JOIN.title}>
      <label className="eyebrow" htmlFor="join-email">
        {JOIN.title}
      </label>
      <div className="join__row">
        <input
          id="join-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={closed ? JOIN.placeholderClosed : JOIN.placeholder}
          disabled={closed}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn-solid" disabled={closed}>
          {JOIN.submit}
        </button>
      </div>
    </form>
  );
}
