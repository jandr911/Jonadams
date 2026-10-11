import type { Metadata } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import SiteMusic from "@/components/SiteMusic";
import { DESCRIPTION, MUSIC, SITE } from "@/content/site";
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

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: SITE.name, title: SITE.name, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: SITE.name, description: DESCRIPTION },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
        {MUSIC.src && <SiteMusic />}
      </body>
    </html>
  );
}
