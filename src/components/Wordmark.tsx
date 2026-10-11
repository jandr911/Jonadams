import Link from "next/link";
import { SITE } from "@/content/site";

const BARS: [number, number, number][] = [
  [0.55, 1.7, 0],
  [0.9, 1.3, 0.4],
  [0.7, 2.1, 0.9],
  [1, 1.5, 0.2],
  [0.6, 1.9, 0.6],
];

export default function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label={`${SITE.name}, home`}>
      <span className="wordmark__bars" aria-hidden>
        {BARS.map(([h, t, d]) => (
          <i key={`${h}-${t}`} style={{ ["--h" as string]: h, ["--t" as string]: `${t}s`, ["--d" as string]: `${-d}s` }} />
        ))}
      </span>
      <span className="wordmark__serif">{SITE.surname}</span>
      <span className="wordmark__caps">{SITE.cityName}</span>
    </Link>
  );
}
