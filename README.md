# UZYNTRA Certs

Digital credential verification for **UZYNTRA Security**, deployed at **https://certs.uzyntra.com**.
Repository: https://github.com/UZYNTRA-Security/uzyntra-certs

This release implements production authentication and recovery, candidate identity, and the complete issuer-controlled credential lifecycle. Hosted activation requires the migrations and Auth settings below. Local tests do not prove production email delivery or hosted migration application.

## Included

- Email/password registration, verification, login, session refresh, logout and recovery.
- Registration distinguishes new, unverified and verified accounts. Verified accounts see sign-in/recovery actions; only unverified accounts see confirmation resend.
- Confirmation resend includes a 90-second countdown retained across same-tab reloads. Supabase rate limits remain authoritative; the browser timer is not an abuse-prevention boundary.
- Protected account shell and security page with verification status and recovery entry point. MFA, session controls and deletion remain clearly labelled placeholders.
- Candidate dashboard, private profile editing, opt-in public professional profiles, owned credentials and earned badges.
- Cropped profile-photo uploads with server-side image decoding, metadata removal, WebP optimization and private Supabase Storage delivery.
- Issuer console with draft creation, candidate assignment, review, issuance, revocation, badge uploads and verification activity.
- Downloadable verification QR codes and branded credential cards.
- PostgreSQL profiles, credentials, badges, credential/badge relationships, verification logs and shared rate-limit storage, with RLS and least-privilege grants.
- Public exact-ID verification with issuer-approved details, status, badges, metadata, Open Graph artwork and structured data.

No general administration dashboard, PDF certificate generation, blockchain integration or MFA is included. No fake credentials or badge assignments are seeded.

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
| `/reset-password` | Recovery code/token form and password update |
| `/auth/reset-password` | Compatibility route for older email links |
| `/auth/callback` | Signup confirmation via PKCE or email token hash |
| `/dashboard` | Protected candidate overview |
| `/dashboard/profile` | Profile, visibility and avatar management |
| `/dashboard/credentials` | Owned credentials and category filters |
| `/dashboard/badges` | Badges earned through owned credentials |
| `/dashboard/security` | Protected security settings structure |
| `/profile/[username]` | Public candidate profile; private profiles return 404 |
| `/issuer` | Protected credential lifecycle queue for approved issuer staff |
| `/issuer/create` | Create and assign a credential draft |
| `/issuer/badges` | Validate and upload badge artwork |
| `/issuer/activity` | Minimal verification activity for issued credentials |
| `/api/qr/[credential_id]` | QR PNG for an existing public credential |
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
| `SUPABASE_SECRET_KEY` | Server-only `sb_secret_...` key for registration state/public verification RPCs and signed recovery grants |
| `VERCEL`, `VERCEL_ENV` | Managed by Vercel; do not override |

Obtain keys from Supabase **Settings > API Keys**. Never use a `NEXT_PUBLIC_` prefix for the secret. `.env.local` is ignored by Git. The admin client is separate from session clients and never receives user cookies. Missing secrets or RPCs fail closed. Builds validate public deployment configuration; passing a build does not establish database readiness.

Use `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for local Auth development with matching development redirect allowlists. Production builds require HTTPS origins; the template uses the canonical production origin. Keep staging/preview projects separate. Public values are embedded at build time, so changes require redeployment.

## Supabase activation

1. Review and apply migrations in order to the intended project. See [database documentation](supabase/README.md). Previously applied migrations must not be blindly rerun. The identity and lifecycle migrations create private avatar/badge buckets and RLS policies. Vercel never applies migrations automatically.
2. Set the four application environment variables above locally and in Vercel Production. Secret keys belong only in server environments.
3. Enable Email/password, signups and **Confirm email**. Set the Supabase minimum password length to 8 for password recovery. Registration retains its existing 12-character application minimum. Keep MFA and anonymous signups disabled.
4. Set Auth Site URL to `https://certs.uzyntra.com`. Allow exactly:
   - `https://certs.uzyntra.com/auth/callback`
   - `https://certs.uzyntra.com/reset-password`
5. Copy `supabase/templates/confirmation.html` into the **Confirm signup** email template and `supabase/templates/recovery.html` into **Reset password**. Recovery uses `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`; the checked-in HTML escapes `&`. The reset page supports this cross-browser token-hash flow and standard PKCE `?code=...` links (including `sb_flow_id` when supplied). PKCE links need the requesting browser's verifier cookie. Implicit access-token URL fragments are not used by the SSR setup. Keep the older `/auth/reset-password` allowlist entry for links already sent.
6. Configure a production SMTP sender, SPF/DKIM and provider delivery settings. Set Auth's minimum email-send interval to **90 seconds** and review the project/IP email limits. Set email OTP expiration to **3600 seconds or less**. Recovery-token expiry/reuse is enforced by Supabase.
7. Configure daily verification-log cleanup using Supabase Cron as documented below. Add edge rate limits to registration, recovery and verification entry points before public launch.
8. Run `npm run check:env -- --production` and `npm run check:supabase -- --production`. The readiness check reads Auth settings and checks that registration/verification RPCs exist. It creates no accounts, emails, credentials or audit records. It does not prove complete migration history, SMTP delivery, templates, MFA or redirect allowlists.

### Grant issuer access

Issuer access is never inferred from email metadata. After a staff member has a verified Auth account, an authorized database operator grants the least-privileged role using the Auth UUID:

```sql
insert into public.credential_issuers (user_id, issuer_name, role)
values ('AUTH-USER-UUID', 'UZYNTRA Security', 'ISSUER');
```

Use `REVIEWER` for staff who may issue and revoke, or `ADMIN` for lifecycle administration. Disable access with `active = false`. Do not expose a role-granting UI to candidates.
9. Use approved test accounts to verify new registration, existing-unverified resend, existing-verified sign-in actions, email confirmation, reset links in a different browser, invalid/reused links, logout and protected-route redirects.

`supabase/config.toml` configures only the local stack; editing it does not update hosted Auth. Local Auth templates and callback allowlists are included.

## Recovery and session security

Both `/auth/reset-password` and `/reset-password` read recovery proof and run the same callback on hydration. A Server Action exchanges a PKCE code with `exchangeCodeForSession` (including `sb_flow_id` when present), or verifies a token hash with `verifyOtp` and type recovery. It requires a session and verifies the PKCE recovery flow marker. Missing, expired or invalid codes show recovery guidance before any password form appears. Strict Mode effect replay reuses one exchange promise so it does not consume the code twice.

The successful exchange stores normal Supabase session cookies plus a signed HTTP-only recovery grant lasting ten minutes, tied to the verified user and exact access token. The update action verifies `getUser()` and the grant before `updateUser()`. A normal login session or a client-supplied flag cannot authorize recovery. A changed/refreshed session requires a new link. Passwords must match and contain 8-128 characters; validation and provider/network errors are reported without returning tokens or passwords. Tokens are removed from the visible URL after hydration. Refreshing the clean URL resumes only a valid signed recovery session. Otherwise, request a new link; the original code is single-use.

Successful recovery requests global sign-out, clears the local session and shows "Password updated successfully. You can now sign in." before automatically redirecting to `/login` after 2.5 seconds. Already issued access JWTs may remain usable until their expiry; global sign-out revokes refresh sessions. A session-revocation failure is reported without claiming the password change failed. Passwords and tokens are never returned in action state or logs. Recovery emails use generic eligibility messaging; only registration discloses the requested three account states, with no account IDs or metadata.

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

PostgreSQL tests apply the actual migrations in isolated PGlite and exercise grants, RLS, cross-user denial, profile visibility, avatar ownership/deletion, private/public projections, statuses, rate limits, logs and retention. Image tests decode and optimize real raster bytes and reject malformed, mismatched or oversized inputs. Auth tests run the real SDK against a controlled transport, including recovery token rejection/reuse and session cleanup. Browser tests check public verification, protected-route redirects, recovery UI and resend cooldown persistence without sending real email or creating production accounts. Hosted SMTP, Storage and publication still require a staging acceptance test.

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

Next: operator administration and optional PDF certificate rendering. These features remain outside this release.

## References

- [Supabase password authentication and recovery](https://supabase.com/docs/guides/auth/passwords)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Vercel environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel request headers and proxy trust](https://vercel.com/docs/headers/request-headers)
- [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy)

Copyright UZYNTRA Security. No open-source license is granted by this repository.

## Testing password recovery locally

1. Add `http://localhost:3000/reset-password` and `https://certs.uzyntra.com/reset-password` in Supabase Auth > URL Configuration > Redirect URLs. For a development project, also set Site URL to `http://localhost:3000`. Set the hosted minimum password length to **8**; editing local config does not change the hosted policy.
2. Configure the recovery template described above, or use Supabase default PKCE confirmation link in the same browser that requested it.
3. Run `npm run dev`, visit `http://localhost:3000/forgot-password`, and request a link for an approved test account. Development recovery requests always use `http://localhost:3000/reset-password`; production uses `NEXT_PUBLIC_SITE_URL` (normally `https://certs.uzyntra.com`). Redirects never use an untrusted request Host header.
4. Open the email link, enter matching passwords of at least eight characters, and submit. The callback exchanges the code first; password fields appear only after the recovery session has been validated. Confirm the exact success message, automatic login redirect, and login with the new password.
5. Check seven-character passwords, mismatched confirmation, missing/expired/reused links, a PKCE link in a different browser, and an offline submission. An ordinary login session alone must not authorize this recovery form.
6. Run `npm run check`, then `npm run test:browser` after installing Chromium. Unit tests exercise both recovery exchanges, minimum length, session absence, network errors and link validation; browser tests check both routes and URL-token cleanup.
