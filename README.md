# Money Planner

A cash-flow planner with date matrix transactions, local fallback storage, and
optional Supabase-backed auth/data.

## Local Development

```bash
npm install
npm run dev
```

## Hostinger Deployment

Use these settings:

```txt
Build command: npm run build
Output directory: out
Node version: 22.x
```

The app uses `next.config.ts` with `output: "export"`, so `npm run build`
creates a static site in `out/`.

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Create the first auth user in Supabase Authentication:
   - email: your admin email
   - password: your password
5. In SQL Editor, make that user an admin profile:

```sql
insert into public.profiles (id, username, email, role)
select id, 'sagi', email, 'admin'
from auth.users
where email = 'YOUR_ADMIN_EMAIL';
```

6. Import Sagi's existing local transactions:

```sql
-- Run the contents of supabase/import-local-transactions.sql
```

7. Add these env vars in Hostinger:

```txt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

8. Redeploy.

When Supabase env vars are present, transactions are saved in Supabase. When
they are missing, the app falls back to browser localStorage.

## Useful Commands

```bash
npm run build
npm test
npm run build:sites
```
