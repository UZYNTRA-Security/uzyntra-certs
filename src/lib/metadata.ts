import type { Metadata } from "next";
import { site } from "@/config/site";
import { parseDeploymentEnv } from "@/lib/env/schema";

export function getSiteUrl() {
  return parseDeploymentEnv(process.env, process.env.NODE_ENV === "production").siteUrl;
}

export function canIndexSite() {
  return process.env.VERCEL_ENV === "production";
}

export function pageMetadata(title: string, description: string, path: string, indexable = true): Metadata {
  const index = canIndexSite() && indexable;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: index },
    openGraph: { title: `${title} | ${site.name}`, description, url: path, siteName: site.name, type: "website", locale: "en_US" },
    twitter: { card: "summary", title: `${title} | ${site.name}`, description },
  };
}
