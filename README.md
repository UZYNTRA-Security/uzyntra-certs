# UZYNTRA Certs

Digital credential verification for **UZYNTRA Security**, deployed at **https://certs.uzyntra.com**.

Repository: https://github.com/UZYNTRA-Security/uzyntra-certs

UZYNTRA Certs is a production-ready credential verification platform built with Next.js, Supabase, Vercel and Cloudflare. It supports candidate profiles, organization-based issuer operations, public verification, badges, certificate previews, PDF certificates, QR codes and staff administration.

## Current Feature Set

### Authentication and Account Security

- Email/password registration, login, logout and session refresh.
- Email verification through Supabase Auth.
- Password recovery with PKCE and token-hash support.
- Recovery page validates reset proof before showing password fields.
- 8-character minimum password validation for recovery.
- Registration checks whether an email is new, unverified or already registered.
- Confirmation resend with a 90-second browser countdown.
- Secure Supabase SSR cookie handling.
- Protected route middleware/proxy and server-side page guards.
- Security page foundation with password change, MFA placeholder, sessions placeholder and activity placeholder.
- Signed-in navbar shows Profile and Switch account instead of Sign in.

### Candidate Dashboard

- `/dashboard` candidate overview.
- Candidate name and email verification status.
- Profile completion strength.
- Total credentials and earned badges.
- Recent achievements.
- Empty states for accounts with no issued credentials.
- `/dashboard/profile` profile management.
- Candidate profile fields:
  - Full name
  - Username
  - Profile photo
  - Headline
  - Biography
  - Country
  - LinkedIn URL
  - GitHub URL
  - Portfolio URL
  - Public/private visibility
- Avatar upload, preview, crop, replace and remove.
- Server-side image validation, metadata stripping and WebP optimization.
- Initials avatar fallback.
- `/dashboard/credentials` owned credential list with category filters.
- `/dashboard/badges` earned badge display.

### Public Candidate Profiles

- `/profile/[username]` public profile page.
- Public profiles show:
  - Avatar
  - Name
  - Headline
  - Bio
  - Country
  - Social links
  - Verified public credentials
  - Earned badges
- Private profiles return 404.
- Dynamic SEO metadata for public profiles.
- No email address, Auth UUID or private credential data is exposed.

### Organization and Issuer System

- Organization-based issuer architecture.
- `organizations` table with:
  - Name
  - Slug
  - Logo URL
  - Description
  - Website
  - Organization type
  - Verified status
- Organization types:
  - SECURITY_COMPANY
  - UNIVERSITY
  - TRAINING_PROVIDER
  - CORPORATE
  - COMMUNITY
- Verified statuses:
  - PENDING
  - VERIFIED
  - SUSPENDED
- UZYNTRA Security seeded as the first verified organization.
- `organization_members` with roles:
  - ADMIN
  - REVIEWER
  - ISSUER
  - VIEWER
- Organization-scoped RLS and permission checks.
- Cross-organization credential isolation.
- Only verified organizations can issue public credentials.

### Issuer Console

- `/issuer` organization credential operations console.
- Organization switcher foundation.
- Credential statistics.
- Recent credential lifecycle activity.
- `/issuer/create` credential draft creation.
- Candidate assignment by verified account email.
- Badge association during credential creation.
- `/issuer/members` organization member list.
- `/issuer/badges` validated badge artwork upload.
- `/issuer/activity` verification activity.
- Issuer lifecycle:
  - Draft
  - Pending Review
  - Issued
  - Revoked
  - Expired
- Role behavior:
  - ISSUER creates drafts and submits for review.
  - REVIEWER approves/issues and revokes.
  - ADMIN has full organization lifecycle control.
  - VIEWER has read-only access.

### Admin Operations

- `/admin` internal UZYNTRA staff dashboard.
- Staff-only access for UZYNTRA Security ADMIN members.
- Super-admin account:
  - Email: `admin@uzyntra.com`
  - Username: `uzyntra`
  - Display name: `UZYNTRA`
- Admin dashboard displays:
  - Total organizations
  - Total members
  - Total credentials
  - Pending reviews
  - Issued credentials
  - Revoked credentials
  - Verification activity
- `/admin/organizations`:
  - View organizations
  - Create internal organizations
  - Verify organizations
  - Suspend organizations
  - View member and credential counts
- `/admin/members`:
  - Add issuer members
  - Change roles
  - Change member status
  - Remove members with confirmation
  - Generate Supabase password reset links for managed accounts
- `/admin/credentials`:
  - View all credentials
  - Filter by status
  - Search by credential ID, title or candidate
  - View audit history
  - Approve pending credentials
  - Revoke issued credentials
- `/admin/badges`:
  - Upload badge artwork
  - Edit badge metadata
  - Activate/deactivate badges
- `/admin/audit`:
  - Actor
  - Action
  - Credential
  - Organization
  - Timestamp
- Audit events are append-only and protected by database triggers.

### Credential Lifecycle

- Credential records include:
  - Secure public credential ID
  - Certificate slug
  - Owner/candidate
  - Organization
  - Issuer user
  - Reviewer/approver
  - Credential type
  - Category
  - Title
  - Description
  - Issue date
  - Optional expiry date
  - Status
  - Public holder snapshot
  - Certificate file reference
  - Audit timestamps
- Credential categories:
  - Courses
  - Internships
  - Employment
  - Contributions
  - Appreciations
  - Bug Bounty
  - Achievements
- Credential public IDs are non-sequential and difficult to guess.
- Public holder name is issuer-approved and does not change when a candidate edits their profile.
- Revoked and expired credentials remain authentic but are not shown as currently valid.

### Public Verification

- `/verify` public credential lookup.
- `/v/[credential_id]` public verification page.
- Public verification displays:
  - Credential title
  - Recipient name
  - Profile avatar when public
  - Issuing organization
  - Issue date
  - Expiry date
  - Credential ID
  - Certificate slug
  - Credential status
  - Badges
  - QR code
  - Verification timestamp
- Supports Verified, Revoked and Expired states.
- No wildcard search or public directory of credentials.
- Rate limiting stored in PostgreSQL.
- Verification logs retain only minimal private records.
- Cleanup function exists for old verification logs and rate-limit rows.

### Certificate System

- Certificate template architecture with `certificate_templates`.
- Supported template types:
  - Course Certificate
  - Internship Certificate
  - Employment Verification
  - Contribution Award
  - Appreciation Certificate
  - Bug Bounty Recognition
  - Achievement Certificate
- `/certificate/[credential_id]` public certificate preview.
- `/api/certificate/[credential_id]` generated PDF download.
- PDF certificate includes:
  - UZYNTRA Certs branding
  - Candidate name
  - Credential title
  - Credential type
  - Issuing organization
  - Issue date
  - Expiry date when applicable
  - Credential ID
  - Certificate slug
  - Badge summary
  - Real vector QR code
  - Verification URL
  - Authorized signature
- PDF generation uses embedded signature fonts:
  - Bastliga One as default signature font
  - Allura as clean fallback
  - Centralwell for premium recognition categories
- Certificate PDFs are cached in the private Supabase `certificates` bucket.
- Certificate download regenerates and overwrites the stored PDF to keep layout current.
- Revoked, draft and pending credentials are blocked from certificate download.

### Badge System

- `public/badges/` contains 21 UZYNTRA badge PNG assets.
- Badge catalog stored in Supabase.
- Badges can be active or inactive.
- Badges can be associated with issued credentials.
- Earned badges display on:
  - Candidate dashboard
  - Candidate badge page
  - Public profile
  - Public verification page
  - Certificate preview
- Current seeded `usamamatrix` profile:
  - Public profile enabled
  - 21 issued public credentials
  - 21 earned badges

### QR and Sharing

- QR PNG route: `/api/qr/[credential_id]`.
- Downloadable QR codes.
- Downloadable branded credential cards.
- Share button using Web Share API when available.
- Clipboard fallback for verification URLs.
- OpenGraph and JSON-LD metadata for public verification.

### Notification Preparation

- `credential_notifications` table prepared for `credential_issued` events.
- Issuance events queue notification records.
- Email sending is not implemented yet.
- Future credential-issued emails should include:
  - Candidate name
  - Credential title
  - Download link
  - Verification link

### Security

- Supabase RLS enabled for business tables.
- Server-only Supabase secret key usage.
- Public Supabase publishable key used only for browser-safe clients.
- No hardcoded secrets.
- CSP with nonce support.
- HSTS, no-sniff, anti-framing and no-referrer protections.
- Protected routes require verified sessions.
- Organization permissions enforced at app and database layers.
- Credential events are immutable.
- Verification RPC returns only approved public fields.
- Avatar, badge and certificate files use private Supabase Storage buckets.

## Not Included Yet

- MFA enforcement.
- External partner onboarding.
- Billing.
- Public API access.
- White-label credentials.
- Blockchain verification.
- Admin-created Supabase Auth accounts.
- Automatic credential-issued email delivery.
- PDF certificate visual designer/editor.

## Stack

- Next.js 16 App Router
- React
- TypeScript
- Tailwind CSS
- shadcn-compatible local UI primitives
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel
- Cloudflare DNS
- Node.js 24

## Project Structure

```text
src/app/                    App Router routes, metadata, loading and error boundaries
src/components/auth/        Registration, login, resend and recovery UI
src/components/candidate/   Candidate dashboard cards, avatar, profile and credential UI
src/components/admin/       Admin navigation, forms and operation controls
src/components/issuer/      Issuer console controls
src/components/verification/ Public search and share actions
src/components/layout/      UZYNTRA shell and Speed Insights integration
src/components/ui/          Reusable UI primitives
src/lib/auth/               Auth services, guards, validation and recovery
src/lib/admin/              Admin data loading and actions
src/lib/candidate/          Candidate profile, avatar and credential loading
src/lib/certificate/        Certificate data loading and PDF rendering
src/lib/issuer/             Issuer guards, actions, schema and dashboard data
src/lib/verification/       Public verification schemas, service and requester hashing
src/lib/supabase/           Browser, server and admin Supabase clients
src/types/database.ts       Migration-aligned database types
supabase/migrations/        Ordered SQL migrations
supabase/templates/         Supabase email templates
public/badges/              UZYNTRA badge artwork
public/fonts/               Certificate signature fonts
public/logo/                Certificate logo assets
tests/                      SDK, database, security, QR, certificate and browser tests
```

## Route Map

| Route | Purpose |
| --- | --- |
| `/` | Public home |
| `/about` | Platform overview |
| `/verify` | Public credential lookup |
| `/v/[credential_id]` | Public credential verification |
| `/certificate/[credential_id]` | Public certificate preview |
| `/api/certificate/[credential_id]` | Secure generated PDF download |
| `/api/qr/[credential_id]` | QR PNG download |
| `/login` | Sign in |
| `/register` | Register account |
| `/forgot-password` | Request recovery email |
| `/reset-password` | Reset password |
| `/auth/callback` | Supabase Auth callback |
| `/auth/reset-password` | Legacy reset compatibility route |
| `/dashboard` | Candidate dashboard |
| `/dashboard/profile` | Candidate profile editing |
| `/dashboard/credentials` | Candidate credentials |
| `/dashboard/badges` | Candidate badges |
| `/dashboard/security` | Account security foundation |
| `/profile/[username]` | Public candidate profile |
| `/issuer` | Issuer overview |
| `/issuer/create` | Create credential draft |
| `/issuer/badges` | Badge uploads |
| `/issuer/members` | Organization members |
| `/issuer/activity` | Verification activity |
| `/admin` | Admin overview |
| `/admin/organizations` | Organization management |
| `/admin/members` | Member and account recovery management |
| `/admin/credentials` | Credential operations |
| `/admin/badges` | Badge catalog management |
| `/admin/audit` | Audit log viewer |
| `/api/health` | Health endpoint |

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, e.g. `https://certs.uzyntra.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key |
| `VERCEL` / `VERCEL_ENV` | Managed by Vercel |

Never expose `SUPABASE_SECRET_KEY` with a `NEXT_PUBLIC_` prefix.

## Supabase Setup

1. Apply migrations in `supabase/migrations/` in order.
2. Enable Email/password authentication.
3. Enable email verification.
4. Set minimum hosted password length to 8.
5. Set Auth Site URL to `https://certs.uzyntra.com`.
6. Allow these redirect URLs:
   - `https://certs.uzyntra.com/auth/callback`
   - `https://certs.uzyntra.com/reset-password`
7. Configure Supabase email templates from `supabase/templates/`.
8. Configure SMTP, SPF/DKIM and email limits.
9. Schedule `prune_verification_activity()` daily.

## Development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
npm.cmd run dev
```

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

On this Windows environment, unit tests may require the Node user-info shim:

```powershell
node --import "data:text/javascript,process.geteuid=()=>0" --import tsx --test tests/*.test.ts
```

## Deployment

1. Push to `main`.
2. Vercel builds with Node.js 24.
3. Configure production environment variables in Vercel.
4. Apply Supabase migrations before testing new database-backed features.
5. Verify:
   - Auth flows
   - Dashboard access
   - Issuer access
   - Admin access
   - Public verification
   - Certificate preview
   - PDF download
   - QR code generation

## Production Checklist

- [ ] Environment variables configured.
- [ ] Supabase migrations applied.
- [ ] Supabase Auth settings and redirect URLs configured.
- [ ] SMTP configured and verified.
- [ ] RLS enabled and tested.
- [ ] Admin account active.
- [ ] Organization roles reviewed.
- [ ] Only approved real credentials published.
- [ ] Certificate PDFs download correctly.
- [ ] QR codes scan correctly.
- [ ] Public verification returns only approved fields.
- [ ] Lint, TypeScript, unit tests, build and browser tests pass.
- [ ] Vercel deployment verified on `certs.uzyntra.com`.

Copyright UZYNTRA Security. No open-source license is granted by this repository.
