import { MEDIA_BUCKET, SUPABASE_URL } from "./env";

const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export function mediaPath(folder: string, file: { name: string; type: string }): string {
  const fromType = EXTENSIONS[file.type];
  const fromName = file.name.match(/\.([a-z0-9]{1,5})$/i)?.[1]?.toLowerCase();
  const ext = fromType ?? fromName ?? "bin";
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

export function storedPath(url: string): string | null {
  return url.startsWith(PUBLIC_PREFIX) ? url.slice(PUBLIC_PREFIX.length) : null;
}
