<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Snapshot

Todoist-style task/project management + Vietnamese expense & investment tracker. Next.js 16 (App Router, React 19), Supabase (Postgres + Auth + Storage), shadcn/ui, Tailwind v4.

- **Production:** <https://todoist-app-nu.vercel.app> — Vercel project `todoist-app`, deployed via the Vercel CLI.
- **Source:** GitHub `tanngnle/todothat-app`, app at repo root, branch `main`.
- **Database:** Supabase project `todothat-app` (ref `poekkjstluqofsvvjwol`, region `ap-south-1`). Migrations 001, 003–007 applied; 002 (global seed) intentionally skipped — seed rows need a per-user `user_id`, so wallets/categories/people are created per user via the Manage UI.

# Repo Layout

- `src/actions/` — Server Actions (`"use server"`), one file per domain; all mutations zod-validated.
- `src/app/(app)/` — authenticated views: inbox, today, upcoming, `project/[id]`, labels, filters, expenses.
- `src/app/api/transactions/` — REST API: GET (transactions + server-computed summary + per-category breakdown, optional `?from=`/`&to=`), POST (zod-validated), DELETE (`?id=`); returns 401 JSON when unauthenticated. `/api/*` is exempt from the login-redirect middleware.
- `src/components/` — `layout/`, `tasks/`, `projects/`, `sections/`, `expenses/` (transaction dialog, manage dialog, bulk entry grid, receipt/image import, investments, category breakdown), `shared/`, `providers/`, `ui/`.
- `src/lib/finance/` — money contract (integer VND), dates, zod schemas, draft state; `src/lib/supabase/` — server/browser clients with mock fallback.
- `supabase/migrations/` — SQL migrations 001..007.
- `docs/` — `deployment.md` (deploy walkthrough), `specs/` (NNN-kebab specs, indexed in its README), `qa/finance-test-cases.md` (130-case QA matrix with env markers).

# Key Conventions

- **Money contract:** amounts are integer VND as plain numbers. Wallet balances are maintained **exclusively by the DB trigger** (migration 005) — never compute or adjust balances in app code.
- **Migrations:** never edit an applied migration; new ones are numbered `008_*.sql` onward.
- **Validation:** every server action validates input with zod before touching the DB.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred; `NEXT_PUBLIC_SUPABASE_ANON_KEY` still accepted as legacy fallback). Optional `MODELSTUDIO_API_KEY` enables receipt scanning (`qwen-vl-plus` via the OpenAI-compatible endpoint; `MODELSTUDIO_BASE_URL`/`MODELSTUDIO_MODEL` are overrides — the workspace denies `-latest` aliases). Without Supabase config the app runs in display-only mock mode.
- **Node ≥ 22** (AI SDK deps); server-action body limit is `12mb` (`next.config.ts`) for receipt uploads.

# Build & Verify

```bash
npm run dev          # http://localhost:3000
npm run build        # production build
npx tsc --noEmit     # type check
npm run lint         # eslint
```

# Deployment

See [`docs/deployment.md`](docs/deployment.md) for Supabase setup, migration order, env vars, and the post-deploy checklist. Deploy via the Vercel CLI (`npx vercel --prod`); `NEXT_PUBLIC_*` vars are baked at build time, so env changes need a redeploy.

# Worktree Workflow

Parallel feature work happens in git worktrees under `.qoder/worktrees/<branch-name>/` (folder is git-ignored; see `.qoder/worktrees/README.md`). The main checkout stays on `main` and receives merged, verified work only.
