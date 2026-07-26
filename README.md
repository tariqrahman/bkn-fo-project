# Brooklyn Nets Front Office

Internal tooling foundation for Brooklyn Nets front office data, starting with team payroll.

## Stack

- **Web:** Vite + React + TypeScript
- **API:** Fastify + TypeScript
- **Database:** Supabase (Postgres) via Drizzle ORM
- **Ingestion:** One-off CLI scraping Basketball Reference contracts page

## Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project (free tier is fine)

---

## Manual setup (you do this once)

### 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in
2. Click **New project**, pick a name (e.g. `nets-front-office`), set a database password, and create it
3. Wait for the project to finish provisioning (~1–2 minutes)

### 2. Copy your connection string

1. In the Supabase dashboard, click **Connect** (or **Project Settings → Database**)
2. Under **Connection pooling**, choose **Session mode** (port **5432**)
3. Copy the URI and replace `[YOUR-PASSWORD]` with your database password

Do **not** use `db.[project-ref].supabase.co` on most networks — it is IPv6-only and fails locally with `ENOTFOUND`.

### 3. Add it to this repo

Create `.env` in the repo root:

```
DATABASE_URL=postgresql://postgres.[project-ref]:YOUR_PASSWORD@aws-0-[region].pooler.supabase.com:5432/postgres
PORT=3001
ANTHROPIC_API_KEY=your-key-here
```

**Important:** Use session pooler port **5432** for local migrate/ingest. Use transaction pooler port **6543** + `?pgbouncer=true` for the deployed Railway API.

---

## Install and run

```bash
npm install
npm run db:migrate    # creates tables in Supabase
npm run db:ingest     # fetches BRef data and loads the DB
npm run dev           # starts API + web
```

Or run services separately:

```bash
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:5173
```

The web app proxies `/api` requests to the API server.

---

## Viewing data in Supabase

After migrate + ingest:

1. Open your Supabase project dashboard
2. Go to **Table Editor**
3. Browse `teams`, `players`, `contract_seasons`, and `ingest_runs`

You can also run SQL in **SQL Editor** (e.g. `SELECT * FROM contract_seasons ORDER BY salary_cents DESC`).

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase session pooler URI (port **5432**) for local dev, migrate, ingest |
| `PORT` | No | API port (default `3001`; Railway sets this automatically) |
| `CORS_ORIGIN` | Prod | Your deployed web URL (e.g. `https://your-app.vercel.app`) |
| `ANTHROPIC_API_KEY` | Insights | Required for AI insights generation |
| `INSIGHTS_MODEL` | No | Override default Claude model |

---

## Ingestion

Brooklyn Nets payroll from Basketball Reference:

```bash
npm run db:ingest
```

Spotrac cap summary (salary cap, tax line, aprons — infrequent refresh):

```bash
npm run db:migrate          # if needed for team_cap_metrics table
npm run db:ingest:cap       # fetch from Spotrac
npm run db:ingest:cap -- --seed   # offline: load from data/seed/spotrac-bkn-cap.json
```

Use cached HTML snapshot (skips network fetch if `data/raw/BRK.html` exists):

```bash
npm run db:ingest -- --cache
```

Re-running ingest is safe — it upserts existing rows.

---

## API

- `GET /api/health`
- `GET /api/teams/BRK/payroll`

---

## Project structure

```
apps/web/           React frontend
apps/api/           Fastify API
packages/db/        Drizzle schema, migrations, ingest CLI
packages/db/drizzle/  SQL migrations (applied to Supabase)
data/raw/           Cached HTML snapshots (gitignored)
.env                Your Supabase connection string (gitignored)
```

---

## Deployment

Recommended split: **Vercel** (web) + **Railway** (API) + **Supabase** (database).

### Prerequisites

- Local DB working (`npm run db:migrate` + ingest commands succeed)
- Git repo pushed to GitHub
- Accounts on [Railway](https://railway.app) and [Vercel](https://vercel.com)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy the API (Railway)

1. **New Project → Deploy from GitHub repo**
2. Railway reads `railway.toml` at the repo root:
   - Start command: `npm run start:api`
   - Health check: `GET /api/health`
3. Set **environment variables** in Railway:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** (port **6543**) + `?pgbouncer=true` |
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `CORS_ORIGIN` | Your Vercel URL (set after step 3, then redeploy) |

4. After deploy, note the public URL (e.g. `https://nets-front-office-production.up.railway.app`)
5. Smoke test:

```bash
curl https://<railway-host>/api/health
curl https://<railway-host>/api/teams/BRK/payroll
```

The API needs `data/reports/bkn/` in the repo for insights (already committed).

### 3. Deploy the web (Vercel)

1. **Import** the GitHub repo on Vercel
2. Set **Root Directory** to `apps/web`
3. Framework preset: **Vite** (build: `npm run build`, output: `dist`)
4. Edit `apps/web/vercel.json` — replace `REPLACE_WITH_YOUR_RAILWAY_API_HOST` with your Railway hostname (no `https://`, no trailing slash)
5. Deploy
6. Copy the Vercel URL → set `CORS_ORIGIN` on Railway → redeploy API

The web app calls `/api/...` relative paths; Vercel rewrites proxy those to Railway.

### 4. Production database

Run migrate + ingest against your Supabase project (session pooler, port **5432** in local `.env`):

```bash
npm run db:migrate
npm run db:ingest -- -- --cache
npm run db:ingest:cap -- -- --seed
npm run db:ingest:depth -- -- --cache
npm run db:ingest:draft -- -- --cache
```

Re-run ingest locally after trades or source updates. Same Supabase project serves local dev and production.

### 5. End-to-end check

- [ ] Payroll + cap tables load
- [ ] Depth chart renders
- [ ] Draft assets grid + inventory
- [ ] Insights generate (Regenerate button)

### Notes

- **No auth** today — use only on a private URL or behind VPN until you add access control
- **API start** uses `tsx` (monorepo `@nets/db` ships TypeScript source)
- **Secrets** live in Railway/Vercel dashboards only — never commit `.env`
