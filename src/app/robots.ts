import type { MetadataRoute } from "next";
import { canIndexSite, getSiteUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (!canIndexSite()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/dashboard", "/issuer", "/admin"] },
    // /login and /verify remain crawlable so their noindex directives are seen.
    sitemap: `${getSiteUrl()}/sitemap.xml`,
    host: getSiteUrl(),
  };
}
