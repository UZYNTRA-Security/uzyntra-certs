"use client";
import { usePathname } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
export function PerformanceInsights() {
  const pathname = usePathname();
  // Recovery URLs contain single-use secrets; never instrument auth/account pages.
  return ["/", "/about", "/verify"].includes(pathname) ? <SpeedInsights /> : null;
}
