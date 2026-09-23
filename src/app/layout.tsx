import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { site } from "@/config/site";
import { getSiteUrl, canIndexSite } from "@/lib/metadata";
import "./globals.css";

// Per-request CSP nonces require dynamic rendering (no static HTML cache).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: site.name,
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description,
  robots: { index: canIndexSite(), follow: canIndexSite() },
  icons: { icon: [{ url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" }, { url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark">
    <body className="flex min-h-dvh flex-col font-sans">
      <a href="#main-content" className="sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Skip to content</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
      <SiteFooter />
      <SpeedInsights />
    </body>
  </html>;
}
