# Project Status — Current State Snapshot

_Last updated: 2026-08-10_

## What's deployed

**Live:** <https://todoist-app-nu.vercel.app> — Vercel project `todoist-app`,
deployed via the Vercel CLI from `tanngnle/todothat-app` (app at repo root,
branch `main`). Backend: Supabase project `todothat-app`
(ref `poekkjstluqofsvvjwol`, region `ap-south-1`), migrations
001, 003–007 applied (002 intentionally skipped — per-user data is created
through the Manage UI instead).

### Task management (all live)

- Todoist-style projects, sections, labels, saved filters; Today & Upcoming views
- Board view, task comments, collaboration (project members with roles)
- Quick Add (auto-creates an Inbox when none exists), display options menu
  (view/sort/filter, persisted)

### Finance (all live)

- Transaction dialog: create/edit, transfers with destination wallet, person
  select, inline add-new wallet/category/person
- Manage dialog for wallets/categories/people with archive-protected delete
- Bulk entry grid (200-row cap) + tolerant CSV paste (VN/EN headers)
- Receipt scanning via Alibaba Cloud Model Studio (`qwen-vl-plus` through the
  OpenAI-compatible endpoint); guarded "configure" card when unconfigured
- Investments CRUD, CSV export (integer VND), category-breakdown widget

### API

- `/api/transactions` — GET (transactions + server-computed summary +
  per-category breakdown, optional `?from=`/`&to=`), POST (zod-validated),
  DELETE (`?id=`). Returns 401 JSON when unauthenticated; `/api/*` is exempt
  from the login-redirect middleware.

### Environment/config

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (preferred; `NEXT_PUBLIC_SUPABASE_ANON_KEY` still accepted as legacy fallback)
- `MODELSTUDIO_API_KEY`, optional `MODELSTUDIO_BASE_URL` / `MODELSTUDIO_MODEL`
  (default `qwen-vl-plus`; the workspace denies `-latest` aliases)
- Node ≥ 22 (AI SDK deps); server-action body limit raised to 12mb in
  `next.config.ts` for receipt uploads
- Without Supabase config the app falls back to the in-memory mock
  (display-only; balances/uploads inactive)

## Verification summary

- **Production E2E passed** for both task management and finance flows
  (see `docs/deployment.md` §5 checklist).
- Finance QA matrix: `docs/qa/finance-test-cases.md` — 130 cases with
  environment markers.
- Money contract holds: integer VND as plain numbers; balances maintained
  exclusively by the DB trigger (migration 005).

## Known follow-ups

1. **Auto-seed defaults for new users** — default categories/wallets on signup
   (migration 002's global seed cannot be used; needs per-user `user_id`).
2. **Disable email confirmation (optional)** — Supabase auth setting to
   streamline test-account creation.
3. **Receipt attachment viewing** — surface stored receipts via signed URLs.
4. **Person column in bulk entry** — bulk grid doesn't support the person
   field yet.
5. **Pagination for large ledgers** — transaction list loads everything;
   needs paging at scale.
