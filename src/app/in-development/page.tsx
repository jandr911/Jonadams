import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IN_DEVELOPMENT } from "@/content/site";

export const metadata: Metadata = {
  title: { absolute: "In development" },
  robots: { index: false, follow: false },
};

export default function InDevelopment() {
  if (!IN_DEVELOPMENT) notFound();
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6">
      <h1 className="font-serif text-4xl text-gold sm:text-5xl">In development</h1>
    </main>
  );
}
