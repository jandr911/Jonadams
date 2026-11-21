import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import Analytics from "@/components/Analytics";
import CityHost from "@/components/city/CityHost";
import JsonLd from "@/components/JsonLd";
import SiteMusicGate from "@/components/SiteMusicGate";
import { CopyProvider } from "@/content/CopyProvider";
import { fill } from "@/content/copy";
import { IN_DEVELOPMENT, SHARE_IMAGE, SITE_URL } from "@/content/site";
import { getContent } from "@/lib/content";
import { siteGraph } from "@/lib/structuredData";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export async function generateMetadata(): Promise<Metadata> {
  if (IN_DEVELOPMENT) return { metadataBase: SITE_URL };
  const { copy } = await getContent();
  const { SITE, DESCRIPTION, SEARCH } = copy;
  const homeHeadline = fill(SEARCH.home, { artist: SITE.artist }).trim();
  const homeTitle = homeHeadline ? `${homeHeadline} · ${SITE.name}` : SITE.name;
  const images = { url: "/share-image", ...SHARE_IMAGE, alt: fill(SHARE_IMAGE.alt, { name: SITE.name, artist: SITE.artist }) };
  return {
    metadataBase: SITE_URL,
    title: { default: homeTitle, template: `%s · ${SITE.name}` },
    description: DESCRIPTION,
    openGraph: { type: "website", siteName: SITE.name, title: homeTitle, description: DESCRIPTION, images },
    twitter: { card: "summary_large_image", title: homeTitle, description: DESCRIPTION, images },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (IN_DEVELOPMENT) {
    return (
      <html lang="en">
        <body className={`${cormorant.variable} ${spaceGrotesk.variable} antialiased`}>{children}</body>
      </html>
    );
  }
  const { copy, links } = await getContent();
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${spaceGrotesk.variable} antialiased`}>
        <JsonLd data={siteGraph(copy, links)} />
        <CopyProvider copy={copy}>
          {children}
          {copy.MUSIC.src && <SiteMusicGate />}
          <CityHost />
        </CopyProvider>
        <Analytics />
      </body>
    </html>
  );
}
