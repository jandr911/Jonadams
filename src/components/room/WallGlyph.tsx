const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Vinyl() {
  return (
    <>
      <circle cx="24" cy="24" r="19" {...STROKE} />
      <circle cx="24" cy="24" r="12" {...STROKE} strokeDasharray="2 3" />
      <circle cx="24" cy="24" r="6" {...STROKE} />
      <circle cx="24" cy="24" r="1.2" fill="currentColor" />
    </>
  );
}

function Film() {
  return (
    <>
      <rect x="5" y="9" width="38" height="30" rx="2" {...STROKE} />
      <path d="M12 9v30M36 9v30M5 24h7M36 24h7M5 16h7M36 16h7M5 32h7M36 32h7" {...STROKE} />
      <path d="M21 18.5v11l9-5.5z" {...STROKE} />
    </>
  );
}

function Frame() {
  return (
    <>
      <rect x="6" y="8" width="36" height="32" rx="1.5" {...STROKE} />
      <rect x="12" y="14" width="24" height="20" {...STROKE} />
      <path d="M12 31l7-8 5 5 4-3 8 6" {...STROKE} />
      <circle cx="30" cy="19" r="1.8" {...STROKE} />
    </>
  );
}

const GLYPHS: Record<string, () => React.ReactNode> = {
  listen: Vinyl,
  watch: Film,
  creatives: Frame,
};

export default function WallGlyph({ district, className }: { district: string; className?: string }) {
  const Glyph = GLYPHS[district] ?? Frame;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <Glyph />
    </svg>
  );
}
