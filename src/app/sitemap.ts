import type { MetadataRoute } from "next";
import { canIndexSite, getSiteUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!canIndexSite()) return [];
  return ["/", "/about"].map((path) => ({ url: new URL(path, getSiteUrl()).href }));
}
