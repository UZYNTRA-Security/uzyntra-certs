# Database and storage foundation

This directory contains a local Supabase configuration and a security baseline migration. There are no application tables or storage buckets yet.

Use a **new, dedicated Supabase project**. The migration changes defaults for future objects created by `postgres`; it does not retrofit RLS onto pre-existing tables or secure objects created by other roles.

With Docker running, use `npm run db:start`, then `npm run db:reset`. Reset is destructive to the **local** database. Run `npx supabase status` to obtain the local URL and publishable key; keep them in `.env.local`. This scaffold intentionally accepts modern `sb_publishable_` keys only.

For a hosted project:

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

Storage is accessible through the same user-scoped Supabase clients (`client.storage`). Add private buckets, file size/MIME restrictions, and `storage.objects` policies only when a feature needs them. Private documents must never be placed in public buckets. No service-role client exists in this foundation.
