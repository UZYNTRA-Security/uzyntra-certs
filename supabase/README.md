# Supabase database and Auth

Apply these migrations only to the dedicated UZYNTRA Certs project. No fabricated credentials or badge assignments are inserted.

## Migration sequence

1. `20260923000000_security_baseline.sql`: explicit future-object privileges.
2. `20260924000000_registration_email_lookup.sql`: original boolean Auth lookup, retained for compatibility.
3. `20260924010000_auth_registration_state.sql`: service-only new/unverified/verified lookup.
4. `20260924020000_credential_foundation.sql`: credential schema, RLS, profile provisioning, public projection, logging and rate limits.

For a linked project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Review the target and pending SQL before applying. Alternatively, run the pending migration files in order through the project's SQL Editor. Do not rerun already-applied table/enum migrations. If using SQL Editor, reconcile migration history before a later CLI push. The application deployment does not run SQL.

With Docker, `npm run db:start` starts the local stack. `npm run db:reset` reapplies migrations but **destroys local data**; never use reset on production. Hosted Auth settings/templates are configured separately; `config.toml` affects only local Supabase.

## Schema and permissions

| Table | Purpose | Anonymous | Signed-in user |
| --- | --- | --- | --- |
| `profiles` | Extended profile keyed to Auth UUID | None | Read/update own editable profile columns |
| `credentials` | Issuer-controlled credential record | None | Read own records only |
| `badges` | Approved badge catalog | Read | Read |
| `credential_badges` | Composite-key relationship | None | Read relationships for own credentials |
| `verification_logs` | Minimal public verification audit | None | None |
| `verification_rate_limits` | Atomic shared rate limit | None | None |

Every table has RLS enabled. Only trusted operators/service-role operations can issue, publish, revoke or link credentials and badges. A user cannot update their profile ID or grant themselves credential ownership. `create_auth_profile()` provisions an empty profile for existing and new Auth accounts; it does not copy untrusted metadata into public records. It runs with a fixed empty search path and cannot be called by anonymous/authenticated roles. Timestamp triggers update `updated_at` automatically.

Profiles contain `full_name`, unique lowercase `username`, `avatar_url`, `bio`, LinkedIn/GitHub/website URLs and timestamps. URL fields require HTTPS and bounded lengths. Profiles are private, including names; no public profile listing exists.

Credentials contain a private UUID, unique public `credential_id`, owner FK, enum type/status, title/description, dates, certificate file reference, internal `verification_hash`, and timestamps. Types are COURSE_CERTIFICATE, INTERNSHIP, EMPLOYMENT, CONTRIBUTION, BUG_BOUNTY, APPRECIATION, ACHIEVEMENT. Stored statuses are ACTIVE, EXPIRED, REVOKED, SUSPENDED. `verification_hash` is an internal random opaque value in this foundation, not a file-integrity or digital-signature claim. File generation/signing remains future work.

Credential defaults generate unpredictable public IDs with 128 random bits. The illustration `UZY-CERT-2026-A82KD` is accepted for existing IDs, but new operators should use generated defaults. Keep `certificate_file_url` private (prefer a private Storage object path); the public query never returns it. No Storage buckets or public document policies are created.

Badge categories are COURSE, SECURITY, CONTRIBUTION, INTERNSHIP, RECOGNITION. Icons must reference a filename in `/badges/` using the allowed image extensions. Current supplied artwork is available without assigning badges automatically. Credentials reference profiles with delete RESTRICT so account removal cannot silently destroy issuer records; a future deletion workflow must explicitly address record retention.

## Publishing and verification

`public_visible` defaults to false. Publication requires a nonempty `public_holder_name`, an issuer-approved snapshot that users cannot edit through profile changes. Before publishing, obtain approval for the holder information, validate the title/dates/type/status and attach only earned badges. This release contains no issuing UI and inserts no demo records into a hosted project.

`verify_public_credential(requested_id, requester_hash)` is service-role only, security-definer with a fixed empty search path. It uses a parameterized exact match and returns:

- A generic not-found result for both missing and unpublished records.
- A rate-limited result after 30 requests per requester in one minute.
- A safe projection: public ID, title/type, approved holder, fixed UZYNTRA issuer, dates, effective status and badge display fields.

No Auth ID, email, profile URLs, certificate storage reference, internal verification hash, timestamps or log records are returned. The app validates and strips unexpected fields again with Zod. Private database tables are never queried by an anonymous browser.

Status is computed at lookup: ACTIVE with a past expiry is EXPIRED; ACTIVE with a future issue date is NOT_YET_VALID. REVOKED/SUSPENDED take precedence. Expiry is inclusive through that date in PostgreSQL's project timezone (keep hosted PostgreSQL on UTC). Owners see stored status in raw database reads; future private UIs must also compute effective validity.

The rate counter uses an atomic upsert and works across server instances. A domain-separated HMAC of Vercel's trusted requester IP keys the bucket; off Vercel a shared bucket is used instead of trusting arbitrary headers. Rate limiting is an enumeration mitigation, not a complete distributed-abuse defense. Configure edge limits before launch and use Cloudflare DNS-only unless proxy trust is reviewed.

## Audit retention

Permitted lookups log found/not-found outcomes and an internal credential reference when found. Raw IP, user-agent and country columns are deliberately left null. Rate-limited requests do not insert unlimited log rows. Failed transactions do not claim success.

Schedule the cleanup function daily using Supabase Cron (enable Cron in the dashboard first). Review timezone and existing job names before running:

```sql
select cron.schedule(
  'uzyntra-prune-verification',
  '15 3 * * *',
  'select public.prune_verification_activity();'
);
```

The function removes logs older than 30 days and rate buckets older than one day. The migration defines the function but does not enable extensions or schedule a job. Verify the scheduled job succeeds; retention is not automatic until it is scheduled.

## Auth setup and database types

Both registration RPCs are inaccessible to anon/authenticated roles and require `SUPABASE_SECRET_KEY` in the server environment. Never pass this key to a browser or user cookie client. Registration fails closed if lookup is unavailable. Configure the recovery and confirmation templates, callback allowlists, SMTP and rate limits in the [root README](../README.md).

`src/types/database.ts` reflects this migration's columns and RPCs. After applying migrations, regenerate and review types:

```sh
npx supabase gen types typescript --linked > src/types/database.ts
```

Run `npm run check` afterward. PGlite tests apply the actual SQL and exercise anonymous/owner/non-owner/service-role access, publication, badge projection, expiry/revocation, shared limits, log privacy and cleanup. They do not apply migrations to production.
