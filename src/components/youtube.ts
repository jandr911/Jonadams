export function youtubeHref(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeIdFrom(input: string): string | null {
  const value = input.trim();
  const match = value.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  if (match) return match[1];
  return /^[\w-]{11}$/.test(value) ? value : null;
}

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
