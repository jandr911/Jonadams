"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { browserSupabase } from "@/lib/supabase/browser";
import { mediaPath } from "@/lib/supabase/media";

interface MediaFieldProps {
  label: string;
  name: string;
  current: string;
  accept: "image" | "audio";
  folder: string;
}

export default function MediaField({ label, name, current, accept, folder }: MediaFieldProps) {
  const [url, setUrl] = useState(current);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "failed">("idle");
  const [message, setMessage] = useState("");
  const id = useId();

  async function upload(file: File) {
    setStatus("uploading");
    setMessage(`Uploading ${file.name}…`);
    const supabase = browserSupabase();
    const path = mediaPath(folder, file);
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (error) {
      setStatus("failed");
      setMessage(`Upload failed: ${error.message}`);
      return;
    }
    setUrl(supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl);
    setStatus("done");
    setMessage("Uploaded. Press Save to keep it.");
  }

  return (
    <div className="field field--full">
      <span className="field__label">{label}</span>
      {url && accept === "image" && (
        <span className="media-preview media-preview--image">
          <Image src={url} alt="" fill sizes="160px" unoptimized />
        </span>
      )}
      {url && accept === "audio" && <audio className="media-preview" controls preload="none" src={url} />}
      <label htmlFor={id} className="admin-btn admin-btn--quiet media-pick">
        {status === "uploading" ? "Uploading…" : url ? "Choose a different file" : "Choose a file"}
      </label>
      <input
        id={id}
        className="sr-only"
        type="file"
        accept={accept === "image" ? "image/*" : "audio/*"}
        disabled={status === "uploading"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {message && (
        <span className={`admin-status ${status === "failed" ? "is-error" : "is-ok"}`} role="status">
          {message}
        </span>
      )}
      <span className="field__hint">Or paste a web link to a file hosted somewhere else.</span>
      <input className="field__input" type="text" name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
    </div>
  );
}
