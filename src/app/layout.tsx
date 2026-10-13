import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import CityHost from "@/components/city/CityHost";
import SiteMusicGate from "@/components/SiteMusicGate";
import { CopyProvider } from "@/content/CopyProvider";
import { fill } from "@/content/copy";
import { SHARE_IMAGE } from "@/content/site";
import { getContent } from "@/lib/content";
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

const SITE_URL = "https://jonnadams.com";

export async function generateMetadata(): Promise<Metadata> {
  const { copy } = await getContent();
  const { SITE, DESCRIPTION } = copy;
  const images = { url: "/share-image", ...SHARE_IMAGE, alt: fill(SHARE_IMAGE.alt, { name: SITE.name, artist: SITE.artist }) };
  return {
    metadataBase: SITE_URL,
    title: { default: SITE.name, template: `%s · ${SITE.name}` },
    description: DESCRIPTION,
    openGraph: { type: "website", siteName: SITE.name, title: SITE.name, description: DESCRIPTION, images },
    twitter: { card: "summary_large_image", title: SITE.name, description: DESCRIPTION, images },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { copy } = await getContent();
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${spaceGrotesk.variable} antialiased`}>
        <CopyProvider copy={copy}>
          {children}
          {copy.MUSIC.src && <SiteMusicGate />}
          <CityHost />
        </CopyProvider>
      </body>
    </html>
  );
}
