import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const { copy } = await getContent();
  return (
    <div className="shell">
      <SiteHeader />
      <main className="shell__stage">
        <h1 className="sr-only">{copy.SITE.name}</h1>
      </main>
    </div>
  );
}
