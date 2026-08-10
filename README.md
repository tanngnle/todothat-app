# Todoist Clone + Expense Tracker

A personal productivity app: Todoist-style task/project management plus a Vietnamese expense & investment tracker. Built with Next.js 16 (App Router) and Supabase.

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

Environment: copy `.env.example` to `.env.local`. If Supabase env vars are not set, the app falls back to an in-memory mock database with sample data (`src/lib/mock-db.ts`) — display-only; wallet balances and receipt uploads are inactive in mock mode.

## Deployment

Live at **<https://todoist-app-nu.vercel.app>** — Vercel project `todoist-app`, deployed via the Vercel CLI; source is [`tanngnle/todothat-app`](https://github.com/tanngnle/todothat-app) (app at repo root, branch `main`), backed by Supabase project `todothat-app`.

Full walkthrough (Supabase setup, migrations, env vars, verification checklist): [`docs/deployment.md`](docs/deployment.md).

## Codebase Map

```
src/
├── app/
│   ├── (app)/                 # Authenticated shell (sidebar + top bar)
│   │   ├── page.tsx           # Inbox (Quick Add auto-creates it)
│   │   ├── today/             # Today view
│   │   ├── upcoming/          # Upcoming view
│   │   ├── project/[id]/      # Project page (list/board views)
│   │   ├── labels/            # Labels management
│   │   ├── filters/           # Saved filters
│   │   └── expenses/          # Expense tracker + investments
│   ├── (auth)/                # Login / signup
│   ├── api/transactions/      # REST API: GET (list + summary + breakdown), POST, DELETE
│   └── layout.tsx             # Root layout + theme provider
├── actions/                   # Server Actions ("use server"), zod-validated, per domain
│   ├── tasks.ts, projects.ts, sections.ts, labels.ts, comments.ts, filters.ts
│   ├── categories.ts, transactions.ts, wallets.ts, people.ts, images.ts
│   ├── investments.ts, collaboration.ts
├── components/
│   ├── layout/                # App shell, sidebar, top bar
│   ├── tasks/                 # Task list/item/form/detail, board & calendar views
│   ├── projects/              # Project header (inline edit), members
│   ├── sections/              # Section header, add-section form
│   ├── expenses/              # Transaction dialog, manage dialog, bulk entry grid,
│   │                          #   receipt/image import, investments, category breakdown
│   ├── shared/                # Export button, display options menu
│   ├── providers/             # ThemeProvider, DisplayProvider (view/sort/filter state)
│   └── ui/                    # shadcn/ui primitives
├── lib/
│   ├── supabase/              # Server/browser clients (mock fallback)
│   ├── finance/               # Money contract (integer VND), dates, zod schemas, draft state
│   ├── mock-db.ts             # In-memory sample data for dev without Supabase
│   └── utils/                 # task-filters, recurrence, export (CSV), cn
├── types/database.ts          # All DB entity types
└── middleware.ts              # Auth/session + login redirect (/api/* exempt)

supabase/migrations/           # SQL schema migrations (001..007)
docs/                          # deployment.md, specs/, qa/ (see below)
```

## Key Conventions

- **Data flow**: Server Components fetch via Server Actions in `src/actions/`; mutations are zod-validated and call `revalidatePath`.
- **Client state**: view/sort/filter options live in `DisplayProvider` (`src/components/providers/display-provider.tsx`).
- **Money contract**: amounts are integer VND as plain numbers; wallet balances are maintained exclusively by the DB trigger (migration 005) — never compute balances in app code.
- **Types**: all entities in `src/types/database.ts`; keep them in sync with migrations.
- **Styling**: Tailwind v4 + shadcn/ui theme tokens (`oklch` vars in `src/app/globals.css`).

## Documentation

- Deployment & operations: [`docs/deployment.md`](docs/deployment.md) · current-state snapshot: [`docs/status.md`](docs/status.md)
- Feature specs: [`docs/specs/`](docs/specs/)
- QA test matrix (finance, 130 cases with env markers): [`docs/qa/finance-test-cases.md`](docs/qa/finance-test-cases.md)
- Architecture deep-dive (repowiki, IDE-generated): `.qoder/repowiki/en/content/`
- Parallel feature development: [`.qoder/worktrees/`](../.qoder/worktrees/README.md)

## Database

Migrations in `supabase/migrations/` are applied in order:

| # | File | Purpose |
|---|---|---|
| 001 | `001_initial_schema.sql` | Core tables (tasks, projects, wallets, transactions…) + RLS |
| 002 | `002_seed_data.sql` | Global seed/reference data |
| 003 | `003_multi_user_collaboration.sql` | Project members + roles, shared-access RLS policies |
| 004 | `004_project_section_descriptions.sql` | Description fields for projects/sections |
| 005 | `005_finance_fix.sql` | Wallet balance trigger, `source`/`attachment_url` columns, private `receipts` bucket |
| 006 | `006_project_insert_policy.sql` | Fixes RLS policy recursion from 003 (SECURITY DEFINER helpers) |
| 007 | `007_break_policy_cycles.sql` | Completes breaking the remaining RLS policy cycles |

> Migration **002 is intentionally skipped on real databases**: its seed rows need a
> per-user `user_id`. Wallets, categories, and people are created per user through
> the **Manage** UI instead.
>
> Never edit an applied migration — add new ones as `008_*.sql` and onward.

## Finance setup

- Apply migrations **001 → 007** (skip 002, see Database) before using expenses: all transaction writes require the `source` column and the wallet balance trigger added by 005, and 006/007 fix the RLS policy cycles needed for collaboration.
- Supabase keys: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred); `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a legacy fallback.
- Receipt scanning is optional: set `MODELSTUDIO_API_KEY` in `.env.local` to enable it (Alibaba Cloud Model Studio, `qwen-vl-plus` via the OpenAI-compatible endpoint). `MODELSTUDIO_BASE_URL` and `MODELSTUDIO_MODEL` are optional overrides; the workspace denies `-latest` aliases — use bare model ids. Without a key the scan dialog shows a guarded "configure AI extraction" card.
- Node ≥ 22 is required (AI SDK dependencies). `next.config.ts` raises the server-action body limit to `12mb` for receipt uploads.
- Without Supabase env vars the app runs in mock mode: display-only; wallet balance updates and receipt image upload are inactive.
