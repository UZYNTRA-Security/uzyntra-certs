# UZYNTRA Certs

Digital credential verification for **UZYNTRA Security**, deployed at **https://certs.uzyntra.com**.
Repository: https://github.com/UZYNTRA-Security/uzyntra-certs

This release implements Phase 1.3 (authentication UX and recovery), Phase 2 (credential database foundation), and Phase 3 (public verification). Hosted activation requires the migrations and Auth settings below. Local tests do not prove production email delivery or hosted migration application.

## Included

- Email/password registration, verification, login, session refresh, logout and recovery.
- Registration distinguishes new, unverified and verified accounts. Verified accounts see sign-in/recovery actions; only unverified accounts see confirmation resend.
- Confirmation resend includes a 90-second countdown retained across same-tab reloads. Supabase rate limits remain authoritative; the browser timer is not an abuse-prevention boundary.
- Protected account shell and security page with verification status and recovery entry point. MFA, session controls and deletion remain clearly labelled placeholders.
- PostgreSQL profiles, credentials, badges, credential/badge relationships, verification logs and shared rate-limit storage, with RLS and least-privilege grants.
- Public exact-ID verification with issuer-approved details, status, badges, metadata, Open Graph artwork and structured data.

No issuing UI, admin dashboard, PDF generation, QR generation, MFA or candidate credential dashboard is included. No fake credentials or badge assignments are seeded.

## Stack and structure

Next.js 16 App Router, React, TypeScript, Tailwind CSS, locally owned shadcn-compatible components, Supabase Auth/PostgreSQL/Storage clients, Vercel, Cloudflare DNS. Use Node.js 24 and the committed npm lockfile.

```text
src/app/                    Routes, metadata, loading and error boundaries
src/components/auth/        Registration, login, resend and recovery forms
src/components/verification/ Public ID search
src/components/layout/      UZYNTRA shell and scoped performance instrumentation
src/components/ui/          Reusable primitives
src/lib/auth/               Validated Auth services and Server Actions
src/lib/verification/       Validated public projection and requester hashing
src/lib/supabase/           Cookie clients, session refresh, server-only admin client
src/lib/security/           Nonce-based CSP
src/lib/env/                Public/deployment validation
src/types/database.ts       Migration-aligned database types
src/proxy.ts                CSP, no-store responses, Auth session refresh and guards
supabase/migrations/        Ordered SQL migrations
supabase/templates/         Confirmation and password recovery email templates
public/badges/              Supplied badge artwork, preserved unchanged
scripts/                    Environment checks and HTTP smoke checks
tests/                     SDK, PostgreSQL, security and browser tests
```

## Routes

| Route | Behavior |
| --- | --- |
| `/`, `/about` | Branded informational pages |
| `/verify` | Public credential ID search; no login |
| `/v/[credential_id]` | Approved public details; explicit missing/unavailable/rate-limit states |
| `/login`, `/register` | Authentication and state-aware registration |
| `/forgot-password` | Generic password reset request |
| `/auth/reset-password` | Recovery-token callback/form and password update |
| `/auth/callback` | Signup confirmation via PKCE or email token hash |
| `/dashboard` | Protected account shell |
| `/dashboard/security` | Protected security settings structure |
| `/api/health` | Liveness only; not database readiness |

Only home/about are indexed. Account and verification URLs are noindex and omitted from the sitemap; public verification is shareable without exposing a searchable directory. Verification pages have canonical/OG metadata and escaped nonce-protected JSON-LD containing only approved fields.

## Local setup and environment

```sh
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: `Copy-Item .env.example .env.local`. Do not overwrite an existing configured file. Use a dedicated development Supabase project or the local Docker stack (`npm run db:start`). Never reset a hosted database; `npm run db:reset` destroys local data.

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Trusted callback/canonical origin: production `https://certs.uzyntra.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe `sb_publishable_...` key |
| `SUPABASE_SECRET_KEY` | Server-only `sb_secret_...` key for registration state and public verification RPCs |
| `VERCEL`, `VERCEL_ENV` | Managed by Vercel; do not override |

Obtain keys from Supabase **Settings > API Keys**. Never use a `NEXT_PUBLIC_` prefix for the secret. `.env.local` is ignored by Git. The admin client is separate from session clients and never receives user cookies. Missing secrets or RPCs fail closed. Builds validate public deployment configuration; passing a build does not establish database readiness.

Use `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local Auth development with matching development redirect allowlists. Production builds require HTTPS origins; the template uses the canonical production origin. Keep staging/preview projects separate. Public values are embedded at build time, so changes require redeployment.

## Supabase activation

1. Review and apply migrations in order to the intended project. See [database documentation](supabase/README.md). Previously applied migrations must not be blindly rerun. New migrations add registration states and the credential schema. Vercel never applies them automatically.
2. Set the four application environment variables above locally and in Vercel Production. Secret keys belong only in server environments.
3. Enable Email/password, signups and **Confirm email**. Require at least 12-character passwords. Keep MFA and anonymous signups disabled.
4. Set Auth Site URL to `https://certs.uzyntra.com`. Allow exactly:
   - `https://certs.uzyntra.com/auth/callback`
   - `https://certs.uzyntra.com/auth/reset-password`
5. Copy `supabase/templates/confirmation.html` into the **Confirm signup** email template and `supabase/templates/recovery.html` into **Reset password**. Recovery uses `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`; the checked-in HTML escapes `&`. The reset page intentionally accepts this token-hash flow, not the default fragment/PKCE recovery URL. Apply this template before enabling recovery.
6. Configure a production SMTP sender, SPF/DKIM and provider delivery settings. Set Auth's minimum email-send interval to **90 seconds** and review the project/IP email limits. Set email OTP expiration to **3600 seconds or less**. Recovery-token expiry/reuse is enforced by Supabase.
7. Configure daily verification-log cleanup using Supabase Cron as documented below. Add edge rate limits to registration, recovery and verification entry points before public launch.
8. Run `npm run check:env -- --production` and `npm run check:supabase -- --production`. The readiness check reads Auth settings and checks that registration/verification RPCs exist. It creates no accounts, emails, credentials or audit records. It does not prove complete migration history, SMTP delivery, templates, MFA or redirect allowlists.
9. Use approved test accounts to verify new registration, existing-unverified resend, existing-verified sign-in actions, email confirmation, reset links in a different browser, invalid/reused links, logout and protected-route redirects.

`supabase/config.toml` configures only the local stack; editing it does not update hosted Auth. Local Auth templates and callback allowlists are included.

## Recovery and session security

The reset page validates URL shape, displays a new-password form and removes the token from browser history after hydration. Tokens are consumed only on deliberate form POSTs, so opening or scanning an email link does not consume it. The action validates password length, variety and confirmation before calling `verifyOtp` with **type recovery**, then `updateUser`. An ordinary authenticated session cannot substitute for a recovery token. Invalid/expired/reused links show recovery guidance. An update failure after consuming a token requires a new link.

Successful recovery requests global sign-out, clears the local session and shows a login action. Already issued access JWTs may remain usable until their expiry; global sign-out revokes refresh sessions. A session-revocation failure is reported without claiming the password change failed. Passwords and tokens are never returned in action state or logs. Recovery emails use generic eligibility messaging; only registration discloses the requested three account states, with no account IDs or metadata.

Cookie clients share SameSite=Lax, root path and production Secure settings. Server Components read cookies; actions and handlers explicitly use writable clients. Server Actions retain same-origin/CSRF protections. Proxy checks verified users before protected page streaming, and each protected page also checks identity. CSP, HSTS, no-sniff, anti-framing, no-referrer on Auth routes, noindex and private/no-store responses are retained. Speed Insights runs only on `/`, `/about` and `/verify`, excluding Auth/token URLs and private pages.

## Public verification security

- Database records are private by default. An operator must approve `public_visible` and an issuer-controlled `public_holder_name`. User profile edits cannot change the public holder snapshot.
- Default public IDs use a UUID's random 128-bit suffix; do not replace this with sequential or easily guessed IDs. The shorter documentation example is an illustration, not the issuance generator.
- The service-only RPC accepts a complete exact ID and returns only ID, title, type, holder snapshot, fixed issuer, dates, effective status and associated badge display fields. No wildcard, list or search-by-person API exists.
- An active record past its expiry date is shown as expired, and a future-issued record is not yet valid. Revoked/suspended records never receive the Verified label. Unpublished and unknown records look identical.
- Shared PostgreSQL rate limits allow 30 checks/minute/requester across server instances; missing identities share a conservative bucket. Hashes use a domain-separated HMAC with the server secret. Raw IP, country and user agent are not retained by this release.
- On Vercel, the platform-overwritten `x-forwarded-for` identifies the requester. Off Vercel it is ignored. Keep Cloudflare in **DNS-only** mode unless a reviewed trusted-proxy configuration exists. A proxy can cause users to share limits. IP limits reduce bulk enumeration; they do not prevent distributed abuse. Configure Vercel/Cloudflare edge controls as well.
- Each permitted lookup records a minimal outcome and internal credential reference. Logs are private. `prune_verification_activity()` deletes logs older than 30 days and rate-limit entries older than one day; schedule it daily. No cleanup occurs automatically without the schedule.
- Database errors display temporary unavailability, never a fabricated missing/verified result. Verification uses fresh no-store rendering so status changes take effect on the next visit.

## Validation

```sh
npm run check       # lint, TypeScript, SDK/PostgreSQL tests, production build
npx playwright install chromium
npm run test:browser
# With npm start -- --hostname 127.0.0.1 --port 3100 running:
npm run test:auth-routes
```

PostgreSQL tests apply the actual migrations in isolated PGlite and exercise grants, RLS, cross-user denial, private/public projection, statuses, rate limits, logs and retention. Auth tests run the real SDK against a controlled transport, including recovery token rejection/reuse and session cleanup. Browser tests check public verification, protected-route redirects, recovery UI and resend cooldown persistence without sending real email or creating production accounts. Hosted SMTP and publication still require a staging acceptance test.

## Vercel and Cloudflare deployment

1. Connect the GitHub repository, use `main`, Next.js preset, root `.`, Node 24.x, `npm ci`, and `npm run build`.
2. In **Settings > Environment Variables**, add the four listed variables for Production. Mark `SUPABASE_SECRET_KEY` Sensitive. Configure Preview separately with a staging project.
3. Apply reviewed Supabase migrations and Auth settings before switching traffic to the new release.
4. Push or deploy the reviewed commit. If variables were added after deployment began, redeploy from **Deployments**. Git integration may deploy immediately after a push.
5. Add `certs.uzyntra.com` in Vercel Domains. Use Vercel's exact DNS/ownership records in Cloudflare, initially DNS-only; verify TLS and preserve unrelated records.
6. Verify public pages, Auth/recovery, headers, robots, metadata and an approved published credential. A successful build does not create credentials. Roll back the app if checks fail; database rollback requires separate review.

## Production checklist

- [ ] Correct project, branch, domain, Node version and production environment.
- [ ] Secret remains server-only; no local secrets in Git.
- [ ] All reviewed migrations applied and database types reconciled.
- [ ] SMTP, templates, email verification, callback URLs, expiry and rate limits configured.
- [ ] Daily `prune_verification_activity()` job scheduled; edge abuse controls reviewed.
- [ ] Lint, TypeScript, tests, build and browser checks pass.
- [ ] Existing/unverified/new registration and cross-browser recovery tested on staging.
- [ ] Only approved real credentials published; private fields absent from public responses.
- [ ] Active, expired, suspended, revoked and missing results reviewed.
- [ ] CSP/security headers, mobile/keyboard use and rollback procedure verified.

## Badge assets and next phases

Always inspect `public/badges/` before working on badges or pushing supplied artwork. Existing assets are ai-engineering, cloud-security, cybersecurity, devsecops-engineer and offensive-ai PNGs. Keep their filenames and artwork. No record is assigned merely because an image exists; authorized future issuing work links approved badge records.

Next: Phase 4 candidate credential dashboard, then Phase 5 admin issuing, followed by PDF/QR work. These features are outside this release.

## References

- [Supabase password authentication and recovery](https://supabase.com/docs/guides/auth/passwords)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel request headers and proxy trust](https://vercel.com/docs/headers/request-headers)
- [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy)

Copyright UZYNTRA Security. No open-source license is granted by this repository.
