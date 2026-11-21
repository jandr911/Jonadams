import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  return { title: copy.NOT_FOUND.title };
}

export default async function NotFound() {
  const { copy } = await getContent();
  const { NOT_FOUND } = copy;
  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <SiteHeader />
      <main className="grid flex-1 place-items-center px-6 text-center">
        <div className="flex flex-col items-center">
          <p className="eyebrow">{NOT_FOUND.eyebrow}</p>
          <h1 className="mt-4 font-serif text-5xl text-gold sm:text-6xl">{NOT_FOUND.heading}</h1>
          <p className="mt-4 max-w-sm text-muted">{NOT_FOUND.body}</p>
          <Link href="/" className="btn-outline mt-8">
            {NOT_FOUND.back}
          </Link>
        </div>
      </main>
    </div>
  );
}
