import assert from "node:assert/strict";
import test from "node:test";
import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";
import { config } from "../src/proxy";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { pageMetadata } from "../src/lib/metadata";

test("proxy covers pages but excludes only intended assets and metadata endpoints", () => {
  for (const url of ["/", "/about", "/verify", "/login", "/register", "/dashboard", "/auth/callback", "/api/health-private", "/robots.txt-extra"]) {
    assert.equal(doesProxyMatch({ config, url }), true, url);
  }
  for (const url of ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/apple-icon.png", "/icon.svg", "/badges/offensive-ai.png", "/_next/static/chunks/app.js", "/_vercel/speed-insights/script.js", "/api/health"]) {
    assert.equal(doesProxyMatch({ config, url }), false, url);
  }
});

test("production indexes informational pages only; previews expose no sitemap URLs", () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "production";
    assert.equal(sitemap().length, 2);
    assert.ok(sitemap().every(({ url }) => !/login|verify/.test(url)));
    assert.ok(robots().sitemap);
    assert.deepEqual(pageMetadata("Login", "Placeholder", "/login", false).robots, { index: false, follow: false });
    assert.deepEqual(pageMetadata("About", "About us", "/about").robots, { index: true, follow: true });
    process.env.VERCEL_ENV = "preview";
    assert.deepEqual(sitemap(), []);
    assert.deepEqual(robots().rules, { userAgent: "*", disallow: "/" });
    assert.deepEqual(pageMetadata("About", "About us", "/about").robots, { index: false, follow: false });
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});
