# Todoist Clone + Expense Tracker

A personal productivity app: Todoist-style task/project management plus a Vietnamese expense & investment tracker. Built with Next.js 16 (App Router) and Supabase.

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

Environment: copy `.env.example` to `.env.local`. If Supabase env vars are not set, the app falls back to an in-memory mock database with sample data (`src/lib/mock-db.ts`).

## Codebase Map

```
src/
├── app/
│   ├── (app)/                 # Authenticated shell (sidebar + top bar)
│   │   ├── page.tsx           # Home / task list
│   │   ├── today/             # Today view
│   │   ├── upcoming/          # Upcoming view
│   │   ├── project/[id]/      # Project page (list/board/calendar views)
│   │   ├── labels/            # Labels management
│   │   ├── filters/           # Saved filters
│   │   └── expenses/          # Expense tracker + investments
│   ├── (auth)/                # Login / signup
│   └── layout.tsx             # Root layout + theme provider
├── actions/                   # Server Actions ("use server") per domain
│   ├── tasks.ts, projects.ts, sections.ts, labels.ts, comments.ts
│   ├── categories.ts, transactions.ts, wallets.ts, people.ts
│   ├── investments.ts, collaboration.ts
├── components/
│   ├── layout/                # App shell, sidebar, top bar
│   ├── tasks/                 # Task list/item/form/detail, board & calendar views
│   ├── projects/              # Project header (inline edit), members
│   ├── sections/              # Section header, add-section form
│   ├── expenses/              # Expense tracker UI
│   ├── shared/                # Export button, display options menu
│   ├── providers/             # ThemeProvider, DisplayProvider (view/sort/filter state)
│   └── ui/                    # shadcn/ui primitives
├── lib/
│   ├── supabase/              # Server/browser clients (mock fallback)
│   ├── mock-db.ts             # In-memory sample data for dev without Supabase
│   └── utils/                 # task-filters, recurrence, export (CSV), cn
├── types/database.ts          # All DB entity types
└── middleware.ts              # Auth/session handling

supabase/migrations/           # SQL schema migrations (001..005)
docs/specs/                    # Feature specs (see docs/specs/README.md)
```

## Key Conventions

- **Data flow**: Server Components fetch via Server Actions in `src/actions/`; mutations call `revalidatePath`.
- **Client state**: view/sort/filter options live in `DisplayProvider` (`src/components/providers/display-provider.tsx`).
- **Types**: all entities in `src/types/database.ts`; keep them in sync with migrations.
- **Styling**: Tailwind v4 + shadcn/ui theme tokens (`oklch` vars in `src/app/globals.css`).

## Documentation

- Feature specs: [`docs/specs/`](docs/specs/)
- Architecture deep-dive (repowiki, IDE-generated): `.qoder/repowiki/en/content/`
- Parallel feature development: [`.qoder/worktrees/`](../.qoder/worktrees/README.md)

## Database

Run migrations in `supabase/migrations/` in order (001 schema → 002 seed → 003 multi-user → 004 descriptions → 005 finance fix).

## Finance setup

- Apply `supabase/migrations/005_finance_fix.sql` **before** using expenses: all transaction writes require the new `source` column and the wallet balance trigger it adds.
- Receipt scanning is optional: set `MODELSTUDIO_API_KEY` in `.env.local` to enable it (Alibaba Cloud Model Studio; `MODELSTUDIO_BASE_URL` and `MODELSTUDIO_MODEL` are optional overrides).
- Node ≥ 22 is required (AI SDK dependencies).
- Without Supabase env vars the app runs in mock mode, where wallet balances and receipt image upload are inactive.
