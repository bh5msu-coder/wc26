# Deploying to Vercel

End-to-end: a fresh deploy with a Postgres database in about 5 minutes.

## 1. Push to GitHub
```bash
cd wc26-app
git init && git add . && git commit -m "WC26 draft pool"
git branch -M main
git remote add origin git@github.com:<you>/wc26-draft-pool.git
git push -u origin main
```

## 2. Import the project on Vercel
1. <https://vercel.com/new> → **Import** your repo.
2. Framework preset is auto-detected as **Next.js**. Leave build settings default
   (`npm run build` already runs `prisma generate`).
3. Don't deploy yet — add a database and env vars first (next steps).

## 3. Add a Postgres database
In the Vercel project → **Storage** → **Create Database** → **Postgres**
(Neon-backed). Vercel injects `DATABASE_URL` (pooled) and a direct URL automatically.

This app expects two vars:
- `DATABASE_URL` — pooled connection (runtime queries)
- `DIRECT_URL` — direct connection (Prisma migrations / `db push`)

If your provider only gives one string, set **both** to it. With Vercel Postgres, map:
- `DATABASE_URL` → `POSTGRES_PRISMA_URL`
- `DIRECT_URL` → `POSTGRES_URL_NON_POOLING`

(any Postgres works too — Neon, Supabase, Railway.)

## 4. Set environment variables
Project → **Settings → Environment Variables**:

| Key | Value |
|---|---|
| `DATABASE_URL` | pooled Postgres URL |
| `DIRECT_URL` | direct Postgres URL |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | your `https://<project>.vercel.app` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | *(optional)* GitHub OAuth |

## 5. Deploy, then create the schema + seed
Trigger the deploy. Once it's up, push the schema and seed the demo world from your
machine (pointing at the production DB), or from the Vercel CLI:

```bash
# locally, with the production DATABASE_URL/DIRECT_URL in your shell or .env
npx prisma db push
npm run db:seed
```

> Tip: for ongoing schema changes use `prisma migrate deploy` with committed migrations
> instead of `db push`.

## 6. Sign in
Visit the site and sign in with a seeded account (e.g. `tom@wc26.app` / `wc26demo` — the
commissioner), or register your own pool from `/pools`.

---

### Troubleshooting
- **Prisma error on the Edge / middleware** — already handled: `middleware.ts` uses the
  DB-free `auth.config.ts`. Don't import `auth.ts` (or anything Prisma) into middleware.
- **`AUTH_SECRET` missing** — Auth.js v5 requires it in production; set it before deploying.
- **Seed can't connect** — make sure `DIRECT_URL` is the non-pooled connection string.
