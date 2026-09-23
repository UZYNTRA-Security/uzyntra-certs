# UZYNTRA Certs

Public repository: https://github.com/UZYNTRA-Security/uzyntra-certs
Production domain: **https://certs.uzyntra.com**
Current phase: **1.2 — Supabase Production Integration**

UZYNTRA Security's digital credential platform is deployed on Vercel. This phase adds email/password registration, verified-email sign-in, confirmation callbacks, session refresh, and logout. Credential verification remains unavailable. Production activation requires the project-specific environment and Auth settings below; local tests do not prove hosted settings or email delivery.

## Scope and routes

| Route | Purpose | Production indexing |
| --- | --- | --- |
| `/` | Branded introduction and planned credential categories | Allowed |
| `/about` | Platform purpose and design principles | Allowed |
| `/verify` | Verification entry point with an honest availability message | Noindex |
| `/login` | Email/password login; signed-in users redirect to their account | Noindex |
| `/register` | Validated registration followed by email confirmation | Noindex |
| `/auth/callback` | PKCE or token-hash confirmation; fixed account redirect | Noindex |
| `/dashboard` | Verified-user account entry point and logout only | Noindex |
| `/api/health` | Uncached liveness response; not backend readiness | Not in sitemap |
| `/robots.txt` | Environment-aware crawler policy | Public metadata |
| `/sitemap.xml` | Canonical home/about URLs only in Vercel Production | Public metadata |

No credential tables, certificate generation, badge features, admin dashboard, or application schema changes are included. `/dashboard` is only an authenticated account shell. Supabase manages its built-in Auth users; no application profile table or trigger is needed.

## Stack and architecture

- Next.js 16.3.6, App Router, React, strict TypeScript
- Tailwind CSS v4, locally owned shadcn-compatible UI components, Lucide icons
- Supabase Auth with cookie-based browser/server clients and verified-user guards
- Vercel hosting and Speed Insights; Cloudflare DNS
- Node.js 24 LTS, npm, pinned dependencies and a committed lockfile

```text
src/
  app/                 Pages, metadata routes, error/loading states, health API
  components/layout/   Header, active navigation, footer, shared page introduction
  components/auth/     Accessible forms and logout control
  components/ui/       Reusable Button, Input, Card, Skeleton
  config/              Application identity
  lib/
    auth/              Server actions, validation, Auth service and identity guards
    env/               Deployment and backend validation
    http/              Safe API error responses
    security/          Content Security Policy
    supabase/          Existing clients and session refresh
    metadata.ts        Canonical URL, page metadata and indexing policy
  types/               Database type placeholder
  proxy.ts             Per-request CSP; scoped auth session refresh
public/
  badges/              User-supplied artwork for future verification profiles
  favicon.ico          Shield favicon derived from the existing SVG
  apple-icon.png       180px touch icon derived from the existing SVG
supabase/              Existing local configuration and baseline migration
scripts/               Environment and live Auth settings validation
tests/                 Auth SDK/cookie integration, security and metadata tests
.github/               CI and Dependabot configuration
```

Keep route files focused on composition. Add domain logic under `src/features/<domain>/` only when a feature is authorized. Server-only data services should import `server-only`. Future protected operations need identity/permission checks and RLS; proxy routing alone is not authorization.

## Local setup

```sh
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: use `Copy-Item .env.example .env.local`. Open http://localhost:3000. Without Supabase configuration the public shell works, auth forms are disabled, and `/dashboard` redirects to `/login`.

The template uses the canonical HTTPS origin so local production builds pass. You can use `http://localhost:3000` for `npm run dev`, but restore an HTTPS origin before a production build. This setting is for canonical URLs; it does not change the local dev server address.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
# Or run all four checks:
npm run check
```

## Environment variables

Next.js loads `.env*` files before evaluating `next.config.ts`. Build configuration validates the deployment environment automatically, including on Vercel's default `npm run build`. Local values are ignored by Git. Never place passwords, service-role keys, provider secrets, or access tokens in a `NEXT_PUBLIC_*` variable.

| Variable | Requirement | Value/purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Required on Vercel | Production: `https://certs.uzyntra.com`; trusted canonical origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Required for Auth and Vercel Production | Dedicated project's API URL from Supabase Connect |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required for Auth and Vercel Production | Browser-safe `sb_publishable_...` key; never a service-role/secret key |
| `VERCEL`, `VERCEL_ENV` | Managed by Vercel | Deployment validation and indexing policy; do not manually override |

Origins must not contain credentials, paths, query strings, or fragments. Production URLs must use HTTPS. Vercel Production builds require both backend values. Local/CI shell builds may omit both, but partial or invalid configuration always fails validation. A local/CI build with no site setting uses the canonical domain as a non-secret fallback; Vercel deployments must configure it explicitly.

For authenticated previews, use a separate staging Supabase project and a stable staging HTTPS origin matching that preview. Register its exact callback URL. Do not reuse the production origin for preview auth: callbacks intentionally redirect to the configured origin. Do not derive URLs from request headers. Preview and Development deployments remain noindex with an empty sitemap. Only `VERCEL_ENV=production` enables indexing of informational pages.

```sh
npm run check:env                  # local/development validation
npm run check:env -- --production  # HTTPS and production validation
```

Public configuration is embedded at build time. Redeploy after changing it. Keep preview and production backend projects separate when backend features are enabled.

## Supabase production setup

1. Select or create the dedicated **UZYNTRA Certs** Supabase project. Record its project reference. Do not reuse another application's project without reviewing its existing Auth configuration.
2. In Supabase **Connect / API Keys**, obtain the project URL and modern publishable key. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL=https://certs.uzyntra.com` in Vercel **Production**. No service-role key or database password belongs in the application.
3. In **Authentication → Sign In / Providers**, enable **Email/password**, allow new user signups, and enable **Confirm email**. Set the minimum password length to **12**. Keep MFA/TOTP/phone enrollment and verification disabled for this phase. Do not enable anonymous or phone signup.
4. Set Auth **Site URL** to `https://certs.uzyntra.com` and allow exactly `https://certs.uzyntra.com/auth/callback` under Redirect URLs. Use a separate staging project for localhost and preview callbacks. Avoid production wildcard redirect entries.
5. Set the **Confirm signup** email template to the contents of `supabase/templates/confirmation.html`. Its link is `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (HTML escapes `&` as `&amp;`). Registration supplies the allowlisted `/auth/callback` redirect. The hash flow supports confirming in a different browser; the default PKCE confirmation flow also works in the browser used to register.
6. Configure a production SMTP provider, verified sender/domain, and the appropriate SPF/DKIM records in Supabase. Supabase's default mail service is restricted and is not a production delivery solution. Keep SMTP credentials in Supabase, never in public environment variables. Review Auth rate limits before opening registration; this app does not use an unreliable in-memory serverless rate limiter.
7. With the public settings in a local ignored `.env.local`, run `npm run check:env -- --production` and `npm run check:supabase -- --production`. The second command makes a read-only request to Auth settings and verifies email/password, signup, and mandatory confirmation without printing keys.
8. Deploy and test with an approved test mailbox: register, confirm the email, reach `/dashboard`, sign out, verify that `/dashboard` redirects to `/login`, and sign in again. Test expired/reused links. Verify the actual email sender and both same-browser PKCE and cross-browser hash confirmation as appropriate.

`supabase/config.toml` applies to the local stack only; editing it or deploying Next.js does **not** configure hosted Supabase Auth. Do not run `supabase db push` for this phase. The settings check does not validate SMTP delivery, redirect allowlists, templates, or MFA settings; inspect those in the dashboard.

## Local authentication workflow

Use a separate hosted development project configured like production, or run Docker and `npm run db:start`. Local settings enable signups, require confirmation, and disable MFA. Do not reset an existing database just to enable Auth. Copy the local URL and publishable key from `npx supabase status` into `.env.local`, and use `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. The local callback allowlist and email template are already configured. View confirmation messages through the local mail inbox at the address reported by the CLI.

Run `npm run dev`, register, open the email link, check the protected account page, then sign out. Secure cookies are enabled in production; use the dev server for HTTP localhost Auth testing. Production builds require HTTPS-configured origins. CI uses a controlled Auth transport and needs no live account or privileged key.

## Authentication and security behavior

- Forms validate email, password bounds, and matching registration passwords in the browser and again on the server. Passwords are never returned in action state or logged. Registration requires 12–128 characters; login accepts existing password lengths up to 128.
- Server Actions perform credential submission and logout, retaining Next.js same-origin/CSRF protections. No GET logout endpoint exists. Success invalidates the client router cache and redirects outside error handlers.
- Server clients are request-scoped. Server Components use read-only cookies; Actions and callback handlers explicitly use writable cookies and fail if writes cannot persist. The proxy forwards refreshed cookies to the next server render and the response, along with cache restrictions.
- Browser and server SDKs use matching `SameSite=Lax`, root-path, production-Secure cookies. Session cookies are intentionally readable by the browser SDK; the nonce-based CSP remains enabled. Tokens are never exposed in action results, logs, or rendered account details.
- `/dashboard` uses `getUser()` against Auth and requires a verified email; a missing/invalid session redirects to `/login`. Identity alone grants no administrative privilege. An Auth outage shows an error instead of granting access.
- The callback accepts exactly one PKCE code or an email/signup token hash. Expired, duplicated, unsupported, or ambiguous inputs fail closed. User-supplied `next` values are ignored; redirects always use the configured origin and fixed paths. Callback responses are no-store and no-referrer.
- Unverified users cannot enter the account shell. Registration receiving an immediate session is treated as a confirmation-setting error and signs out locally. Duplicate signup responses use generic messaging.
- Logout signs out the current session and clears cookies. It does not sign out other devices. As with Supabase JWTs generally, previously issued access tokens can remain valid until expiry; future sensitive data operations need RLS and appropriate session policies.
- Login, registration, and account routes are noindex. The sitemap still contains only home/about. No credential or admin access is implied by a successful login.

Tests cover missing sessions, successful login and cookie reuse, browser/server cookie compatibility, logout, invalid passwords, unconfirmed emails, signup validation, PKCE/hash callbacks, malicious redirect inputs, and proxy refresh cookie propagation. The tests run the real Supabase SDK against a test-only in-memory Auth transport; they do not claim to verify a live production project.

For actual HTTP behavior after a build, start `npm start -- --hostname 127.0.0.1 --port 3100`, then run `npm run test:auth-routes` in another terminal. It checks the anonymous 307 redirect, form routes, callback error handling, and security headers without creating users. `AUTH_SMOKE_BASE_URL` can target a specific authorized deployment for the same anonymous checks.

## Production configuration review

- **Next.js:** strict mode enabled, framework identification header removed, standard Vercel Next.js output retained. No static export or custom server is required.
- **Rendering:** the root layout is dynamic because CSP nonces must be generated per request. HTML is `private, no-store`; it must not be shared through a CDN.
- **Proxy:** all application pages receive a fresh CSP nonce. Session refresh covers `/auth/*`, `/login`, `/register`, `/dashboard`, and its descendants. Public informational pages stay independent of Auth uptime. Protected data operations must enforce authorization separately.
- **Bypasses:** static framework assets, public badges, icons, crawler metadata, liveness, and standard Speed Insights endpoints avoid auth/session processing. Exclusions for metadata and health are exact, not broad path prefixes.
- **Headers:** anti-framing, `nosniff`, strict-origin referrer policy, restricted browser permissions, and production HSTS. HSTS intentionally does not include sibling subdomains.
- **CSP:** nonce-based script trust with `strict-dynamic`; eval is permitted only in development. Connections are limited to the same origin and a configured Supabase origin. Inline styles remain allowed for UI compatibility. No wildcard production script hosts are added.
- **Metadata:** shared metadata base, unique titles/descriptions/canonical URLs, Open Graph and Twitter summaries. No unverified credential claims or fabricated social preview images.
- **Crawlers:** home/about appear in the production sitemap. Login/verify remain crawlable so bots can read their noindex directives. Auth and API paths are disallowed in robots. Crawling rules are not access controls.
- **Errors:** generic user-facing errors and request IDs; no raw provider errors or credentials in responses. Existing loading and not-found boundaries remain.
- **Favicons:** `/icon.svg`, `/favicon.ico`, and `/apple-icon.png` share the UZYNTRA shield.

The Vercel preview toolbar may require additional CSP hosts if you choose to enable it. Do not weaken the production policy for toolbar convenience. Use Vercel Deployment Protection for private previews; noindex is not authentication.

## Vercel deployment steps

1. Connect the public GitHub repository to the existing Vercel project. Use `main` as the production branch and enable preview deployments for pull requests.
2. Select the **Next.js** preset, root directory **.**, Node.js **24.x**, install command **npm ci**, build command **npm run build**, and the default output directory. Environment validation runs inside the build configuration; no extra platform setting is required to activate it.
3. In Project Settings → Environment Variables, set the canonical site URL and both Supabase production variables. Configure Preview separately. Complete the hosted Auth setup above before release; missing production backend values intentionally fail the build.
4. Deploy the reviewed commit. Confirm that the deployment succeeds and that Vercel assigns the intended production domain. No deployment command should apply database migrations in this phase.
5. In Domains, configure `certs.uzyntra.com`. In Cloudflare, use the exact CNAME and any ownership TXT record shown by Vercel, with **DNS only** initially. Preserve unrelated DNS records and confirm TLS issuance.
6. Visit the public pages, run the registration/confirmation/login/logout flow, and inspect headers, canonical URLs, icons, robots and sitemap. Check production and a protected staging preview.
7. Confirm Speed Insights is enabled in Vercel, visit the deployed site, and check incoming metrics. Existing Git integration may deploy automatically after a push; local builds alone do not update production.
8. If a release fails validation, use Vercel's rollback to a previously verified deployment, then fix the change through Git.

## Production deployment checklist

- [ ] Correct project, root directory, branch, Node.js version, and locked install settings.
- [ ] Required site origin set to the canonical HTTPS domain for Production.
- [ ] Supabase production URL and publishable key validated; no privileged browser keys.
- [ ] Email/password and confirmation enabled; signups allowed; MFA off; SMTP and callback allowlist verified.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
- [ ] Preview reviewed on mobile and desktop; keyboard navigation and focus visible.
- [ ] Home/about/verify/login/register load; anonymous dashboard redirects to login; unknown pages return 404.
- [ ] Confirmed login reaches account shell; logout removes access; unverified users remain blocked.
- [ ] Verification remains an unavailable placeholder with no credential operations.
- [ ] Production canonical metadata uses `https://certs.uzyntra.com`, never localhost.
- [ ] Production robots/sitemap expose only intended informational pages; preview is noindex.
- [ ] SVG, ICO, Apple icon, and current badge URLs load successfully.
- [ ] Fresh CSP nonce matches rendered scripts; no production script CSP violations.
- [ ] HTML stays private/no-store; no Cloudflare cache-everything rules on application pages.
- [ ] Custom-domain DNS and HTTPS verified; `/api/health` returns liveness without secrets.
- [ ] GitHub CI and Vercel deployment checks pass for the intended commit.
- [ ] Speed Insights enabled and receiving real visits; deployment logs reviewed.
- [ ] Preview protection, repository controls, monitoring, and rollback ownership reviewed.
- [ ] No application database/schema changes, certificate logic, badge features, or admin dashboard included.

Complete live Auth checks after production access is configured. See [Supabase notes](supabase/README.md); this phase does not require applying the existing baseline migration.

## Speed Insights and badges

Speed Insights is mounted once via `@vercel/speed-insights/next`. The existing CSP allows its dynamically injected script and same-origin metrics endpoint. Local development does not populate the production dashboard; check content blockers if deployed visits do not appear.

The user adds artwork over time in `public/badges/`. Inspect its current contents before badge/profile work and requested pushes, as recorded in [AGENTS.md](AGENTS.md). Preserve filenames and original artwork. Reference files as `/badges/<filename>`. No badge-assignment or verification-profile logic exists yet.

## References

- [Next.js metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy)
- [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase production email delivery](https://supabase.com/docs/guides/auth/auth-smtp)
- [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel preview indexing](https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights/quickstart)

Copyright UZYNTRA Security. No open-source license is granted by this repository.
