import Image from "next/image";
import { useId } from "react";
import type { Creative } from "@/content/site";

const REMOTE = /^https?:/;

const BUST = "M50 60c-4 0-7 3-7 8v5C25 76 11 88 7 108v12h86v-12c-4-20-18-32-36-35v-5c0-5-3-8-7-8z";

function Silhouette() {
  const id = useId();
  const rim = `${id}-rim`;
  const halo = `${id}-halo`;
  return (
    <svg className="portrait__silhouette" viewBox="0 0 100 120" preserveAspectRatio="xMidYMax slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.45" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id={halo} cx="0.5" cy="0.35" r="0.6">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="120" fill={`url(#${halo})`} />
      <ellipse cx="50" cy="40" rx="18" ry="22" fill="var(--room-metal)" />
      <path d={BUST} fill="var(--room-metal)" />
      <ellipse cx="50" cy="40" rx="18" ry="22" fill={`url(#${rim})`} />
      <path d={BUST} fill={`url(#${rim})`} />
    </svg>
  );
}

interface PortraitProps {
  creative: Creative;
  alt: string;
  sizes: string;
  className: string;
}

export default function Portrait({ creative, alt, sizes, className }: PortraitProps) {
  return (
    <div className={`portrait ${className}`}>
      {creative.photo ? (
        <Image src={creative.photo} alt={alt} fill sizes={sizes} unoptimized={REMOTE.test(creative.photo)} className="portrait__photo" />
      ) : (
        <Silhouette />
      )}
    </div>
  );
}
