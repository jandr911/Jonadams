import type { Post } from "@/content/site";
import { getContent } from "@/lib/content";
import { indexLabel } from "../city/layout";
import PagedConsole, { type WallPage } from "./PagedConsole";
import PostCard, { BlogSoon, postHref } from "./PostCard";

const CLIPPINGS = [
  { x: 1052, y: 176, w: 120, h: 92, r: -3 },
  { x: 1196, y: 168, w: 96, h: 104, r: 2 },
  { x: 1318, y: 180, w: 150, h: 84, r: -1 },
  { x: 1070, y: 698, w: 140, h: 30, r: 1 },
  { x: 1330, y: 694, w: 120, h: 34, r: -2 },
];

const STACK = [0, 1, 2, 3, 4, 5];

export function BlogBackdrop() {
  return (
    <svg className="stage__art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id="bl-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.45" />
          <stop offset="0.55" stopColor="var(--ink)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="bl-floor" gradientUnits="userSpaceOnUse" x1="0" y1="740" x2="0" y2="1000">
          <stop offset="0" stopColor="var(--room-concrete)" />
          <stop offset="1" stopColor="var(--room-floor)" />
        </linearGradient>
        <linearGradient id="bl-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--room-metal-2)" />
          <stop offset="1" stopColor="var(--room-metal)" />
        </linearGradient>
        <linearGradient id="bl-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--room-lamp)" stopOpacity="0.26" />
          <stop offset="1" stopColor="var(--room-lamp)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bl-case" cx="0.5" cy="1" r="0.9">
          <stop offset="0" stopColor="var(--amber)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--amber)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bl-vignette" cx="0.5" cy="0.45" r="0.72">
          <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--ink)" stopOpacity="0.8" />
        </radialGradient>
        <pattern id="bl-brick" width="56" height="28" patternUnits="userSpaceOnUse">
          <rect width="56" height="28" fill="var(--room-brick)" />
          <rect x="1" y="1" width="26" height="12" fill="var(--room-brick-2)" />
          <rect x="29" y="1" width="26" height="12" fill="var(--room-brick-2)" />
          <rect x="-13" y="15" width="26" height="12" fill="var(--room-brick-2)" />
          <rect x="15" y="15" width="26" height="12" fill="var(--room-brick-2)" />
          <rect x="43" y="15" width="26" height="12" fill="var(--room-brick-2)" />
        </pattern>
        <pattern id="bl-cork" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="var(--room-leather)" />
          <circle cx="3" cy="4" r="1" fill="var(--room-leather-2)" opacity="0.6" />
          <circle cx="9" cy="9" r="1.2" fill="var(--room-wood)" opacity="0.5" />
        </pattern>
        <filter id="bl-blur-s" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="bl-blur-l" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      <rect width="1600" height="1000" fill="url(#bl-brick)" />
      <rect width="1600" height="1000" fill="url(#bl-shade)" />
      <rect x="0" y="0" width="1600" height="26" fill="var(--room-metal)" />

      <g opacity="0.5">
        <rect x="1060" y="70" width="230" height="60" fill="var(--room-velvet)" />
        <text x="1175" y="112" textAnchor="middle" fill="var(--paper)" fillOpacity="0.55" fontFamily="var(--font-serif), serif" fontSize="34" fontWeight="600" letterSpacing="6">
          EST. 1925
        </text>
      </g>

      <rect x="120" y="140" width="880" height="560" fill="var(--amber)" opacity="0.06" filter="url(#bl-blur-l)" />
      <rect x="128" y="150" width="864" height="540" rx="4" fill="url(#bl-metal)" stroke="var(--room-metal-2)" strokeWidth="2" />
      <rect x="136" y="158" width="848" height="524" fill="none" stroke="var(--gold)" strokeOpacity="0.45" />
      <rect x="144" y="166" width="832" height="508" fill="var(--room-screen)" />
      <rect x="144" y="166" width="832" height="508" fill="url(#bl-case)" />
      <rect x="112" y="690" width="896" height="16" fill="var(--room-wood)" />
      <rect x="128" y="706" width="864" height="60" fill="var(--room-leather)" />
      <line x1="128" y1="706" x2="992" y2="706" stroke="var(--gold)" strokeOpacity="0.35" />
      {[340, 780].map((x) => (
        <g key={x}>
          <path d={`M${x} 150 v-30 h40`} fill="none" stroke="var(--room-metal-2)" strokeWidth="6" strokeLinecap="round" />
          <path d={`M${x + 30} 104 h50 l10 26 h-70 z`} fill="var(--room-metal-2)" />
          <ellipse cx={x + 55} cy="131" rx="26" ry="5" fill="var(--room-lamp)" opacity="0.9" />
          <ellipse cx={x + 55} cy="134" rx="40" ry="12" fill="var(--room-lamp)" opacity="0.5" filter="url(#bl-blur-s)" />
          <polygon points={`${x + 20},132 ${x + 90},132 ${x + 220},670 ${x - 110},670`} fill="url(#bl-cone)" />
        </g>
      ))}

      <rect x="1030" y="150" width="500" height="590" rx="4" fill="url(#bl-metal)" />
      <rect x="1040" y="160" width="480" height="570" fill="url(#bl-cork)" />
      <rect x="1040" y="160" width="480" height="570" fill="var(--ink)" opacity="0.35" />
      <rect x="1040" y="160" width="480" height="570" fill="none" stroke="var(--gold)" strokeOpacity="0.3" />
      {CLIPPINGS.map((c) => (
        <g key={`${c.x}-${c.y}`} transform={`rotate(${c.r} ${c.x + c.w / 2} ${c.y + c.h / 2})`}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} fill="var(--paper)" opacity="0.16" />
          <g stroke="var(--paper)" strokeOpacity="0.22" strokeWidth="3">
            <line x1={c.x + 10} y1={c.y + 12} x2={c.x + c.w - 10} y2={c.y + 12} />
            {c.h > 50 && <line x1={c.x + 10} y1={c.y + 26} x2={c.x + c.w - 30} y2={c.y + 26} />}
            {c.h > 50 && <line x1={c.x + 10} y1={c.y + 38} x2={c.x + c.w - 18} y2={c.y + 38} />}
          </g>
          <circle cx={c.x + c.w / 2} cy={c.y + 4} r="4" fill="var(--amber)" opacity="0.8" />
        </g>
      ))}

      <rect x="0" y="740" width="1600" height="260" fill="url(#bl-floor)" />
      <line x1="0" y1="740" x2="1600" y2="740" stroke="var(--paper)" strokeOpacity="0.08" strokeWidth="2" />
      {STACK.map((i) => (
        <rect key={i} x={1120 + (i % 2) * 6} y={880 - i * 12} width="210" height="12" fill="var(--room-canvas)" stroke="var(--paper)" strokeOpacity="0.12" strokeWidth="2" />
      ))}
      <rect x="1112" y="890" width="226" height="6" fill="var(--room-cable)" />

      <rect width="1600" height="1000" fill="url(#bl-vignette)" />
    </svg>
  );
}

export default async function BlogScene({ posts }: { posts: Post[] }) {
  const { copy } = await getContent();
  const { ROOMS } = copy;
  const PAGE = ROOMS.blog.frames;
  const pages: WallPage[] = Array.from({ length: Math.ceil(posts.length / PAGE) }, (_, p) => {
    const items = posts.slice(p * PAGE, (p + 1) * PAGE);
    return {
      keys: items.map((post, j) => ({ id: post.id, index: indexLabel(p * PAGE + j), label: post.title, href: postHref(post) })),
      screens: items.map((post, j) => (
        <PostCard key={post.id} post={post} index={indexLabel(p * PAGE + j)} copy={copy} sizes="(max-width: 720px) 0px, 22vw" className="post-card--screen" teaser />
      )),
    };
  });
  return (
    <>
      <BlogBackdrop />
      {pages.length > 0 ? (
        <PagedConsole pages={pages} label={ROOMS.blog.console} more={ROOMS.blog.more} moreLabel={ROOMS.blog.moreLabel} />
      ) : (
        <div className="stage__screen">
          <BlogSoon copy={copy} className="merch-soon--screen" />
        </div>
      )}
    </>
  );
}
