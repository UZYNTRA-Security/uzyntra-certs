# Database and storage foundation

This directory contains a local Supabase configuration and a security baseline migration. There are no application tables or storage buckets yet.

Use a **new, dedicated Supabase project**. The migration changes defaults for future objects created by `postgres`; it does not retrofit RLS onto pre-existing tables or secure objects created by other roles.

With Docker running, use `npm run db:start`, then `npm run db:reset`. Reset is destructive to the **local** database. Run `npx supabase status` to obtain the local URL and publishable key; keep them in `.env.local`. This scaffold intentionally accepts modern `sb_publishable_` keys only.

Authentication uses Supabase Auth. Registration additionally requires `migrations/20260924000000_registration_email_lookup.sql`, which reads existing `auth.users` through a boolean-only function. It creates no application tables. Both confirmed and unconfirmed users count as registered. Anonymous and authenticated roles cannot execute this function; only the server service role can. Configure the production project using the [root README](../README.md); no application tables or buckets are needed. The local Auth configuration enables email signup and mandatory confirmation, supplies the confirmation template, and leaves MFA off.

To apply the reviewed migrations to the intended hosted project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Review the target and migration before applying. Configure hosted Auth separately in the dashboard; `config.toml` controls the local stack and is not applied by `db push`.

New feature migrations must:

1. Create tables with primary keys, foreign keys, appropriate indexes and constraints.
2. Enable RLS in the same transaction before granting API access.
3. Grant only the required operations and write explicit policies for each role.
4. Test anonymous, authorized, unauthorized, and cross-user access.
5. Grant function execution selectively. Prefer invoker rights; security-definer functions need a fixed `search_path` and explicit authorization.
6. Update database types with `npm run db:types` (local) or `npx supabase gen types typescript --linked > src/types/database.ts` (hosted).

Storage is accessible through the same user-scoped Supabase clients (`client.storage`). Add private buckets, file size/MIME restrictions, and `storage.objects` policies only when a feature needs them. Private documents must never be placed in public buckets. The server-only admin client is restricted in application usage to the registration email lookup; browser and session clients continue to use the publishable key. Missing keys or lookup failures prevent signup.

Alternatively, open the registration lookup migration file, copy its entire SQL into the intended project?s Supabase SQL Editor, and run it. Do not paste API keys into SQL. If applying manually, reconcile migration history before a later CLI push. Set `SUPABASE_SECRET_KEY` from Settings ? API Keys in `.env.local` and Vercel Production, then restart local development or redeploy Vercel. Never commit this value. Local tests validate SQL and permissions but do not apply it to your hosted project.
