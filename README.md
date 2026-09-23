# UZYNTRA Certs

Application foundation for UZYNTRA Security’s public digital credential verification platform at **certs.uzyntra.com**.

**Scope:** architecture only. No credential issuance, verification, searching, certificate rendering, uploads, dashboards, roles, or login interface is implemented. Future domains include course certificates, internships, employment, contributions, bug bounty recognition, and appreciation awards.

## Stack

- Next.js 16.3.6 (latest stable resolved from npm when scaffolded), App Router, React, TypeScript
- Tailwind CSS v4 and locally owned shadcn/ui-style components with Radix primitives
- Supabase PostgreSQL, Auth, Storage, and `@supabase/ssr`
- Vercel deployment and Cloudflare DNS
- Node.js 24 LTS, npm, committed dependency lockfile

## Local development

```sh
cd uzyntra-certs
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: use `Copy-Item .env.example .env.local` instead of `cp`.

Open http://localhost:3000. The foundation page works without a Supabase project. Auth helpers fail closed when configuration is absent; a partial configuration fails validation. No fake credentials are shipped.

For backend development, use a dedicated hosted Supabase project or Docker plus `npm run db:start`. See [Supabase setup](supabase/README.md). Copy its URL and **publishable** key into `.env.local`, then run `npm run check:env`. The public key is not privileged; data access must always be enforced with grants and RLS. Legacy JWT anon keys are deliberately unsupported to avoid accidentally accepting a service-role JWT.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin; localhost for development, `https://certs.uzyntra.com` for production |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe `sb_publishable_...` project key |

Never put database passwords, service-role keys, SMTP credentials, or Supabase access tokens in `NEXT_PUBLIC_*`. No privileged key is required by this foundation. Public variables are embedded at build time: rebuild after changing them. `.env*` is ignored except the safe template.

## Structure

```text
src/
  app/                   App Router pages, boundaries, auth callback, health API
  components/
    layout/              Shared header and footer
    ui/                  Button, Card, Skeleton (shadcn conventions)
  config/                Application identity
  lib/
    auth/                Server-only verified identity guards
    env/                 Validated public configuration
    http/                Safe API error responses
    security/            Content Security Policy
    supabase/            Browser/server clients and cookie refresh
  types/                 Database types; regenerate after schema changes
  proxy.ts               Request nonce, CSP, Supabase session refresh
supabase/
  migrations/            Ordered SQL migrations
  config.toml            Local database, auth, and storage settings
scripts/                 Environment validation
tests/                   Environment and security contract tests
.github/                 CI and dependency update configuration
```

Add future business logic under `src/features/<domain>/` when needed, keeping route files thin. Server-only services should import `server-only`. Reuse `components/ui` for presentation; keep database access out of generic UI. `components.json` supports adding components with `npx shadcn@latest add <component>`.

## Authentication architecture

Browser code imports `src/lib/supabase/client.ts`; server code imports `src/lib/supabase/server.ts`. The server client is created per request. Both expose Auth, PostgreSQL, and Storage under the current user’s privileges.

`src/proxy.ts` refreshes cookies using verified claims and forwards updated cookies to the server and browser. It is not an authorization boundary. Call `requireUser()` at each protected data operation, Route Handler, and Server Action; it validates the identity through Supabase Auth. Authentication alone does not grant an administrator role. Add explicit permissions and RLS with each protected feature. Never use user-editable metadata as role authority.

`/auth/callback` is a PKCE code-exchange endpoint for a future sign-in flow. It redirects only to a fixed path on the configured site origin, never a request-supplied destination. Failures go to `/auth/error`. There is deliberately no sign-in or sign-up UI yet. Email OTP confirmation handlers and sign-out actions should be added with the chosen authentication flow.

Hosted Supabase setup:

- Set Auth Site URL to `https://certs.uzyntra.com` and allow exactly `https://certs.uzyntra.com/auth/callback`.
- Use separate projects for development/staging and production. Register exact development/preview callback URLs only where needed; avoid broad wildcards on production.
- Disable public signups until an enrollment policy is implemented. Configure providers and SMTP when the sign-in feature is built. Review rate limits, MFA, and session policies before enabling staff access.

## Security and operational defaults

- Per-request CSP script nonces, anti-framing headers, `nosniff`, referrer and permissions policies; production HTTPS and HSTS.
- Root rendering is dynamic so HTML nonces are fresh. Session-bearing responses are private and not cached. This intentionally trades static HTML caching for a strict script policy. Inline styles remain allowed for UI compatibility; script `unsafe-eval` is development-only.
- Default SQL grants are tightened. New tables must enable RLS and introduce explicit grants/policies. No public storage buckets exist.
- Expected client errors have a controlled message; unexpected API errors use a generic response with a request ID. Logs omit raw exceptions and personal data. Wire a vetted monitoring provider before launch.
- Route error, root error, not-found, and accessible loading boundaries are included.
- `/api/health` is an uncached **liveness** endpoint; it does not claim database/Auth readiness.
- Indexing is disabled during foundation development. Revisit metadata when the public verification feature launches.

## Validation

```sh
npm run check          # lint, generated route types + TypeScript, tests, build
npm run check:env      # separately validates a configured environment
npm start             # serve the completed production build
```

CI checks the foundation without live Supabase credentials. Tests cover public-key validation, missing/unsafe environment configuration, CSP script restrictions, and error redaction. Live session refresh, provider callbacks, RLS, and Storage policies require integration tests against a dedicated Supabase project when those features are enabled. Database migrations must be reviewed and exercised locally before applying to production.

## Vercel and Cloudflare

1. Import the GitHub repository into Vercel. Use the Next.js preset, Node.js 24, root directory `.`, and install command `npm ci`.
2. Configure all three public environment variables per environment. Use production HTTPS URLs. Set the Vercel build command to `npm run check:env && npm run build` so a deployment cannot silently omit backend configuration.
3. Link the dedicated Supabase project, review the migration dry run, and apply it explicitly. Vercel builds do not mutate the database.
4. Add `certs.uzyntra.com` in Vercel’s Domains settings.
5. In Cloudflare, create a CNAME named `certs` using the **exact target Vercel displays**. Start with **DNS only** (grey cloud), which preserves Vercel’s routing, certificate issuance, and security visibility. Add any requested ownership TXT record. Do not guess a shared CNAME target or replace unrelated DNS records.
6. Wait for Vercel domain/TLS verification. Confirm HTTPS, the home page, response security headers, `/api/health`, and the Supabase redirect allowlist. Do not apply Cloudflare cache-everything rules to authentication or user-specific responses.
7. Enable branch protection/required CI checks, production access controls, monitoring, and an appropriate Supabase backup/recovery policy before operational use.

Deployment, DNS changes, and a hosted Supabase project are not provisioned by this scaffold. The UI is a development holding page, not a launched verification service.

## Performance monitoring

Vercel Speed Insights is mounted once in the root layout using `@vercel/speed-insights/next`. Enable Speed Insights in the Vercel project dashboard, deploy the latest commit, then visit the deployed site to start collecting real-user performance metrics. Local development does not populate the production dashboard. If no events appear, check browser content blockers and confirm that the deployment includes this integration.

The current CSP permits the dynamically injected script through `strict-dynamic` and same-origin metric requests through `connect-src 'self'`; no additional script hosts or weaker production script rules are needed. The standard Vercel Speed Insights endpoints bypass the session proxy.

## Badge assets

Shared badge artwork lives in `public/badges/`. The supplied `offensive-ai.png` is available at `/badges/offensive-ai.png` for future verification profiles. More badges will be added to this folder over time; inspect its current contents when working on badges or verification profiles. These public assets bypass session refresh and can be referenced by image components when profile features are implemented. No verification profile or badge-assignment logic is implemented yet.

## References

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase SSR client configuration](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [shadcn/ui manual setup](https://ui.shadcn.com/docs/installation/manual)
- [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel guidance for Cloudflare](https://vercel.com/kb/guide/cloudflare-with-vercel)
- [Vercel Speed Insights setup](https://vercel.com/docs/speed-insights/quickstart)

Copyright UZYNTRA Security. No open-source license is granted by this repository.
