# Deployment Walkthrough — Hướng dẫn triển khai

Step-by-step guide to run this app locally and deploy it to **Vercel** with a **Supabase** backend.
_(Hướng dẫn từng bước để chạy ứng dụng cục bộ và triển khai lên Vercel với Supabase.)_

**Stack:** Next.js 16.3.0 (App Router, React 19) · Supabase (Postgres + Auth + Storage) · Alibaba Cloud Model Studio (optional, receipt scanning).

---

## Table of Contents

1. [Supabase setup](#1-supabase-setup--thiết-lập-supabase)
2. [Local development](#2-local-development--chạy-cục-bộ)
3. [Model Studio — optional receipt scanning](#3-model-studio--quét-hóa-đơn-tùy-chọn)
4. [Vercel deployment](#4-vercel-deployment--triển-khai-lên-vercel)
5. [Post-deploy verification checklist](#5-post-deploy-verification-checklist--kiểm-tra-sau-khi-deploy)
6. [Troubleshooting](#6-troubleshooting--xử-lý-sự-cố)

---

## 1. Supabase setup — Thiết lập Supabase

### 1.1 Create the project — Tạo project

1. Go to [supabase.com](https://supabase.com) → sign in → **New project**.
2. Pick a name (e.g. `todothat-app`), set a strong database password, choose a region close to you (e.g. Singapore `ap-southeast-1`).
3. Wait for provisioning to finish.

### 1.2 Collect connection values — Lấy thông tin kết nối

In the Supabase dashboard: **Project Settings → API** (or **Data API**).

| Env var | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** — copy the full `https://<ref>.supabase.co` value |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Publishable key** (new dashboard, `sb_publishable_...`) — preferred |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon public** key (legacy dashboard) — fallback when the publishable key is not set |

> ⚠️ **Note on key naming:** the app reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
> **first** and falls back to the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name
> (see `src/lib/supabase/server.ts`). Supabase's newer dashboards label the
> public key **"publishable"** (`sb_publishable_...`) — paste that value into
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If your dashboard only shows the older
> **anon public** key, paste it into `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead —
> the app still works with it. If both are defined, the publishable key wins.
> Never use the `service_role`/secret key in the web app.

### 1.3 Apply database migrations — Chạy migrations

Migrations live in `supabase/migrations/` and **must be applied in order**:

| # | File | What it does |
|---|---|---|
| 001 | `001_initial_schema.sql` | Core tables (tasks, projects, wallets, transactions…) + RLS |
| 002 | `002_seed_data.sql` | Seed/reference data |
| 003 | `003_multi_user_collaboration.sql` | Multi-user collaboration support |
| 004 | `004_project_section_descriptions.sql` | Description fields |
| 005 | `005_finance_fix.sql` | Wallet balance trigger, `transactions.source`/`attachment_url`, `wallets.opening_balance`, `reconcile_wallet_balances()`, **creates the private `receipts` storage bucket + per-user policies** |

**Option A — SQL editor (simplest, không cần cài gì):**

1. Dashboard → **SQL Editor → New query**.
2. Open each file `001` → `002` → `003` → `004` → `005` locally, paste the contents, click **Run**.
3. Repeat in order; check each run reports success before moving on.

**Option B — Supabase CLI (recommended for repeat deploys):**

```bash
npm i -g supabase        # install the CLI globally (or use `npx supabase ...`)
supabase login           # opens browser auth (or: npx supabase login)
cd <repo-root>           # the folder containing supabase/migrations
supabase link --project-ref <ref>   # <ref> = the id inside your Project URL
supabase db push         # applies all migrations in order
```

> Migration `005` is largely idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`,
> `ON CONFLICT DO NOTHING`), so re-running it is safe.

### 1.4 Create your first user — Tạo tài khoản đầu tiên

The easiest way: run the app (see section 2) and use the **Sign Up** tab on the
`/login` page (`src/app/(auth)/login/page.tsx` — email + password, min 6 chars).
Alternatively, create a user in the Supabase dashboard under
**Authentication → Users → Add user**.

### 1.5 Security notes — Lưu ý bảo mật

- **Row Level Security (RLS) is enabled on every table** — data is per-user by
  default; a signed-in user can only read/write their own rows. No extra setup needed.
- The `receipts` storage bucket is created **automatically by migration 005**
  (private bucket, 10 MB per file, JPEG/PNG/WebP only, per-user path policies).
  Do not create it manually.

---

## 2. Local development — Chạy cục bộ

1. Copy the example env file:

   ```bash
   cp .env.example .env.local    # Windows PowerShell: Copy-Item .env.example .env.local
   ```

2. Fill in the values from step 1.2 (`NEXT_PUBLIC_SUPABASE_URL`, plus the
   publishable key — or the legacy anon key as fallback).
3. Install dependencies and start the dev server (**Node 22+ required**):

   ```bash
   npm install
   npm run dev        # → http://localhost:3000
   ```

> **Mock mode:** if the Supabase vars are empty/placeholder, the app still runs —
> in an in-memory mock database with sample data (`src/lib/mock-db.ts`),
> display-only. Wallet balance updates and receipt uploads are inactive in mock mode.

Available scripts (`package.json`): `npm run dev`, `npm run build`, `npm start`, `npm run lint`.

---

## 3. Model Studio — Quét hóa đơn (tùy chọn)

Receipt scanning (**Expenses → Scan receipt**) is powered by Alibaba Cloud Model
Studio and is **optional**. Without it, the scan dialog shows a
*"configure AI extraction"* card instead of scanning.

| Env var | Required | Default / notes |
|---|---|---|
| `MODELSTUDIO_API_KEY` | Yes (to enable scanning) | Your Model Studio API key |
| `MODELSTUDIO_BASE_URL` | No | OpenAI-compatible workspace endpoint; defaults to the workspace URL baked into the app |
| `MODELSTUDIO_MODEL` | No | Vision model, default `qwen-vl-plus`. Use bare model ids — the workspace denies `-latest` aliases |

Add them to `.env.local` (they are listed in `.env.example`) and **restart the dev
server**. On Vercel, add them in Project Settings → Environment Variables and redeploy.

---

## 4. Vercel deployment — Triển khai lên Vercel

### 4.1 Push to GitHub — Đẩy code lên GitHub

The remote for this repo is `https://github.com/tanngnle/todothat-app.git`:

```bash
git add .
git commit -m "feat: finance entry improvements"
git push origin main
```

> **Repo layout:** the GitHub repository `tanngnle/todothat-app` contains the
> Next.js app **directly at the repository root** (`package.json`, `src/`,
> `supabase/`, `next.config.ts` are all at the top level) — it is *not* a
> monorepo with the app inside a `todoist-app/` subfolder. That local
> `todoist-app/` folder exists only in your working copy.
> → **Leave Vercel's "Root Directory" field empty.**
> (If you ever restructure the repo so the app lives in a subfolder such as
> `todoist-app/`, set **Root Directory = `todoist-app`** in Vercel instead.)

### 4.2 Import the project — Import project

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Import the `tanngnle/todothat-app` repository.
3. Framework preset is **auto-detected as Next.js** — keep defaults:
   - **Build Command:** `npm run build`
   - **Output Directory:** default (`.next`, managed by Vercel)
   - **Root Directory:** empty (see note above)
   - **Install Command:** `npm install`

### 4.3 Environment variables — Biến môi trường

In the import screen (or later: **Project Settings → Environment Variables**),
set these for **Production / Preview / Development**:

| Variable | Value | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key from the dashboard (preferred) | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy anon key — fallback if the publishable key is not set | only if no publishable key |
| `MODELSTUDIO_API_KEY` | Model Studio key | optional (receipt scan) |
| `MODELSTUDIO_BASE_URL` | Endpoint override | optional |
| `MODELSTUDIO_MODEL` | Model override, e.g. `qwen-vl-plus` | optional |

> `NEXT_PUBLIC_*` vars are inlined at build time — after changing them you must
> **redeploy** (a simple restart is not enough).

### 4.4 Runtime — Node version

The app requires **Node 22+** (AI SDK dependencies). Vercel's current default
runtime satisfies this; if your account is pinned to an older runtime, set
**Project Settings → General → Node.js Version** to 22.x or newer.

### 4.5 Deploy — Triển khai

Click **Deploy**. When the build finishes, open the assigned `*.vercel.app`
domain. You should land on the login page.

**Alternative: Vercel CLI**

```bash
npx vercel          # first time: link/create the project, set env vars when prompted
npx vercel --prod   # promote to production
```

---

## 5. Post-deploy verification checklist — Kiểm tra sau khi deploy

Run through these on the deployed URL (và cả local nếu muốn):

| # | Check | Expected result |
|---|---|---|
| 1 | Sign up / log in (`/login`, both tabs) | Session created, redirected into the app |
| 2 | Create a project, then a task inside it | Both appear immediately |
| 3 | **Expenses:** create an expense in a wallet | Wallet **balance decreases** by the amount (migration 005 trigger working) |
| 4 | Bulk add transactions | Rows created with `source = 'bulk'` |
| 5 | Scan receipt | Without `MODELSTUDIO_API_KEY`: shows the configure card. With key: extracts a preview transaction; image stored in the private `receipts` bucket |
| 6 | CSV export | File downloads with the expected rows |
| 7 | Dark mode | Theme toggle switches and persists |

If check 3 fails (balance doesn't move, or inserts error), migration **005** was
not applied — see troubleshooting below.

---

## 6. Troubleshooting — Xử lý sự cố

| Symptom | Cause | Fix |
|---|---|---|
| App shows sample data, nothing saves | **Mock mode** — Supabase env vars empty or placeholder | Set real `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, restart/redeploy |
| `Invalid supabaseUrl` error | URL env var empty/placeholder (e.g. contains `your-supabase`) | Copy the full Project URL from the Supabase dashboard |
| Transaction inserts fail mentioning column `source` | Migration **005** not applied | Run `005_finance_fix.sql` (or `supabase db push`) |
| RLS policy errors on queries | Not signed in / expired session | Sign in again; the app's middleware refreshes sessions, but stale cookies need a fresh login |
| Receipt upload rejected as too large | Should not happen — body limit already raised | `next.config.ts` sets `serverActions.bodySizeLimit = "12mb"` (uploads up to ~10 MB); verify the deployed build includes that config |
| Receipt scan shows "not configured" card | `MODELSTUDIO_API_KEY` missing | Set the key (section 3) and redeploy |
| Env change had no effect on Vercel | `NEXT_PUBLIC_*` baked at build time | Redeploy after editing env vars |

---

**Xong! 🎉** — The app is live on Vercel with Supabase auth, RLS-protected data,
automatic wallet balances, and (optionally) AI receipt scanning.
