import Link from "next/link";
import { fill } from "@/content/copy";
import { EQ_BARS } from "@/content/site";
import { getContent } from "@/lib/content";

const TIMING: [number, number][] = [
  [1.7, 0],
  [1.3, 0.4],
  [2.1, 0.9],
  [1.5, 0.2],
  [1.9, 0.6],
];

const BARS = EQ_BARS.map((h, i): [number, number, number] => [h, ...TIMING[i]]);

export default async function Wordmark() {
  const { copy } = await getContent();
  return (
    <Link href="/" className="wordmark" aria-label={fill(copy.HEADER.home, { name: copy.SITE.name })}>
      <span className="wordmark__bars" aria-hidden>
        {BARS.map(([h, t, d]) => (
          <i key={`${h}-${t}`} style={{ ["--h" as string]: h, ["--t" as string]: `${t}s`, ["--d" as string]: `${-d}s` }} />
        ))}
      </span>
      <span className="wordmark__serif">{copy.SITE.surname}</span>
      <span className="wordmark__caps">{copy.SITE.cityName}</span>
    </Link>
  );
}
