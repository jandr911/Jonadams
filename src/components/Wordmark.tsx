import Link from "next/link";

export default function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="wordmark" aria-label="Adams UniverseCity, home">
      <span className="wordmark__serif">Adams</span>
      {!compact && <span className="wordmark__caps">UniverseCity</span>}
    </Link>
  );
}
