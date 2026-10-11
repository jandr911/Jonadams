import { PROFILE, type Creative } from "@/content/site";
import GetListed from "./GetListed";
import Portrait from "./Portrait";

const COURSES = [330, 420, 510, 600, 690, 780];

const PASTED = [
  { x: 1180, y: 690, w: 80, h: 104, r: 3 },
  { x: 1290, y: 712, w: 62, h: 80, r: -4 },
];

function ProfileLinks({ creative }: { creative: Creative }) {
  const links = creative.links.filter((l) => l.href);
  if (!links.length) return null;
  return (
    <nav className="profile__links" aria-label={PROFILE.links}>
      {links.map((l) => (
        <a key={l.href} href={l.href} className="profile__link" target="_blank" rel="noreferrer">
          {l.label}
        </a>
      ))}
    </nav>
  );
}

export function ProfileDossier({ creative }: { creative: Creative }) {
  return (
    <>
      {creative.bio && <p className="profile__bio">{creative.bio}</p>}
      {creative.youtube && (
        <a href={creative.youtube} className="profile__watch" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            <path d="M9.5 8.5v7l6-3.5z" fill="currentColor" />
            <rect x="3" y="5" width="18" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {PROFILE.watch}
        </a>
      )}
      <ProfileLinks creative={creative} />
    </>
  );
}

export function ProfilePhone({ creative }: { creative: Creative }) {
  return (
    <div className="profile-phone">
      <Portrait creative={creative} alt={PROFILE.portrait(creative.name)} sizes="(max-width: 720px) 100vw, 480px" className="profile-phone__portrait" />
      <span className="profile-phone__craft">
        {creative.craft} · {creative.city}
      </span>
      <ProfileDossier creative={creative} />
      <GetListed className="stage__pitch" />
    </div>
  );
}

export default function ProfileScene({ creative }: { creative: Creative }) {
  return (
    <>
      <svg className="stage__art" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
        <defs>
          <linearGradient id="pf-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="pf-floor" gradientUnits="userSpaceOnUse" x1="0" y1="820" x2="0" y2="1000">
            <stop offset="0" stopColor="var(--room-concrete)" />
            <stop offset="1" stopColor="var(--room-floor)" />
          </linearGradient>
          <linearGradient id="pf-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-lamp)" stopOpacity="0.34" />
            <stop offset="1" stopColor="var(--room-lamp)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pf-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--room-metal-2)" />
            <stop offset="1" stopColor="var(--room-metal)" />
          </linearGradient>
          <linearGradient id="pf-gilt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--gold-2)" />
            <stop offset="0.5" stopColor="var(--gold)" />
            <stop offset="1" stopColor="var(--room-wood)" />
          </linearGradient>
          <radialGradient id="pf-pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--room-lamp)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--room-lamp)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pf-wash" cx="0.5" cy="1" r="0.9">
            <stop offset="0" stopColor="var(--violet)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pf-vignette" cx="0.5" cy="0.45" r="0.72">
            <stop offset="0.5" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0.8" />
          </radialGradient>
          <pattern id="pf-brick" width="56" height="28" patternUnits="userSpaceOnUse">
            <rect width="56" height="28" fill="var(--room-brick)" />
            <rect x="1" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="29" y="1" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="-13" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="15" y="15" width="26" height="12" fill="var(--room-brick-2)" />
            <rect x="43" y="15" width="26" height="12" fill="var(--room-brick-2)" />
          </pattern>
          <filter id="pf-blur-s" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="pf-blur-l" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="30" />
          </filter>
        </defs>

        <rect width="1600" height="1000" fill="url(#pf-brick)" />
        <rect width="1600" height="1000" fill="url(#pf-shade)" />
        <g stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="2">
          {COURSES.map((y) => (
            <line key={y} x1="0" y1={y} x2="1600" y2={y} />
          ))}
        </g>
        <rect x="0" y="236" width="1600" height="14" fill="var(--room-concrete)" />
        <line x1="0" y1="250" x2="1600" y2="250" stroke="var(--ink)" strokeOpacity="0.6" strokeWidth="3" />

        <rect x="0" y="820" width="1600" height="180" fill="url(#pf-floor)" />
        <line x1="0" y1="820" x2="1600" y2="820" stroke="var(--paper)" strokeOpacity="0.1" strokeWidth="2" />
        <ellipse cx="420" cy="860" rx="420" ry="70" fill="url(#pf-pool)" />
        <rect x="880" y="822" width="640" height="178" fill="url(#pf-wash)" opacity="0.5" />

        <g fill="var(--room-metal-2)">
          <rect x="0" y="60" width="1600" height="8" />
          <rect x="396" y="68" width="6" height="24" />
          <rect x="1064" y="68" width="6" height="24" />
        </g>
        <path d="M372 92 h54 l10 30 h-74 z" fill="var(--room-metal-2)" />
        <path d="M1040 92 h54 l10 30 h-74 z" fill="var(--room-metal-2)" />
        <ellipse cx="399" cy="123" rx="30" ry="5" fill="var(--room-lamp)" opacity="0.9" />
        <ellipse cx="399" cy="126" rx="48" ry="14" fill="var(--room-lamp)" opacity="0.5" filter="url(#pf-blur-s)" />
        <ellipse cx="1067" cy="123" rx="30" ry="5" fill="var(--violet)" opacity="0.8" />
        <ellipse cx="1067" cy="126" rx="48" ry="14" fill="var(--violet)" opacity="0.4" filter="url(#pf-blur-s)" />
        <polygon points="362,124 436,124 700,820 100,820" fill="url(#pf-cone)" />
        <polygon points="1030,124 1104,124 1520,820 620,820" fill="url(#pf-wash)" opacity="0.7" />

        <rect x="150" y="190" width="520" height="620" fill="var(--gold)" opacity="0.16" filter="url(#pf-blur-l)" />
        <rect x="190" y="230" width="440" height="540" rx="6" fill="url(#pf-gilt)" />
        <rect x="204" y="244" width="412" height="512" rx="3" fill="var(--room-wood)" />
        <rect x="214" y="254" width="392" height="492" fill="none" stroke="var(--gold-2)" strokeOpacity="0.6" strokeWidth="2" />
        <rect x="222" y="262" width="376" height="476" fill="var(--room-screen)" />
        <path d="M190 230 h440" stroke="var(--gold-2)" strokeOpacity="0.8" strokeWidth="3" />
        <path d="M190 770 h440" stroke="var(--ink)" strokeOpacity="0.6" strokeWidth="3" />

        <rect x="290" y="786" width="240" height="40" rx="3" fill="url(#pf-metal)" stroke="var(--gold)" strokeOpacity="0.5" />

        <g fill="url(#pf-metal)" stroke="var(--room-metal-2)">
          <rect x="860" y="286" width="620" height="420" rx="3" />
        </g>
        <rect x="868" y="294" width="604" height="404" fill="var(--room-wall-2)" />
        <rect x="868" y="294" width="604" height="404" fill="url(#pf-wash)" opacity="0.7" />
        <path d="M860 286 h620" stroke="var(--gold)" strokeOpacity="0.5" strokeWidth="2" />
        <rect x="852" y="276" width="636" height="10" fill="var(--room-metal-2)" />
        <ellipse cx="1170" cy="282" rx="240" ry="4" fill="var(--room-lamp)" opacity="0.5" filter="url(#pf-blur-s)" />

        {PASTED.map((p) => (
          <g key={p.x} transform={`rotate(${p.r} ${p.x + p.w / 2} ${p.y + p.h / 2})`}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="var(--room-canvas)" opacity="0.75" />
            <g stroke="var(--paper)" strokeOpacity="0.14" strokeWidth="3">
              <line x1={p.x + 10} y1={p.y + 18} x2={p.x + p.w - 10} y2={p.y + 18} />
              <line x1={p.x + 10} y1={p.y + 30} x2={p.x + p.w - 24} y2={p.y + 30} />
            </g>
          </g>
        ))}

        <rect width="1600" height="1000" fill="url(#pf-vignette)" />
      </svg>

      <Portrait creative={creative} alt={PROFILE.portrait(creative.name)} sizes="(max-width: 720px) 0px, 24vw" className="profile__portrait" />
      <div className="profile__plaque" aria-hidden>
        <span className="profile__plaque-name">{creative.name}</span>
        <span className="profile__plaque-craft">
          {creative.craft} · {creative.city}
        </span>
      </div>
      <div className="profile__dossier">
        <ProfileDossier creative={creative} />
      </div>
      <GetListed className="profile__poster" compact />
    </>
  );
}
