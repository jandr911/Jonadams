import Link from "next/link";

export default function Room({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between gap-4 border-b-2 border-line bg-ink px-4 py-2.5">
        <Link href="/" className="sign text-sm tracking-[2px] text-pink">
          AdamsUniverseCity
        </Link>
        <Link
          href="/"
          className="whitespace-nowrap rounded-md border border-amber px-3 py-1.5 text-xs tracking-[2px] text-amber transition-colors hover:bg-amber hover:text-ink"
        >
          BACK TO THE CITY
        </Link>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <h1 className="sign mb-2 text-2xl tracking-[4px] text-cyan md:text-4xl">
          {title}
        </h1>
        <p className="mb-8 max-w-[65ch] text-muted">{lead}</p>
        {children}
      </main>
    </div>
  );
}
