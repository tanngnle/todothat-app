# Spec: Repo Navigation, Docs Home, Git Worktrees & First Feature Commit

**Status:** ready-for-agent
**Scope:** Repository hygiene and developer-workflow setup for `todoist-app` (no application behavior changes).

## Problem Statement

The todoist-app repository grew rapidly through several feature phases and is now hard to navigate: the README is still the Create Next App boilerplate, there is no documented home for feature specs, the rich generated repowiki (`.qoder/repowiki`) is not linked from anywhere discoverable, there is no setup for working on multiple features in parallel, and all feature work sits uncommitted on top of the scaffolding commit — making any history, review, or rollback impossible.

## Solution

1. **Navigation:** Replace the boilerplate README with a project map (route groups, actions, component folders, lib, migrations) and key conventions, so a developer can locate any feature area in one read.
2. **Docs home:** Create `docs/specs/` as the single home for feature specs (PRDs), with a README explaining the naming convention and a spec template. Reference the repowiki from the docs and README as the architectural documentation source.
3. **Parallel development:** Create `.qoder/worktrees/` inside the git repo as the designated folder for git worktrees, ignore it in `.gitignore`, and document the add/list/remove workflow in a README.
4. **First commit:** Remove stray artifacts, verify secrets are ignored, and commit all application work as one feature commit on `main`.

## User Stories

1. As a developer, I want a README that maps every folder to its responsibility, so that I can find where a feature lives without searching.
2. As a developer, I want the key conventions (data flow, client state, types, styling) documented, so that my changes follow existing patterns.
3. As a developer, I want the setup instructions (install, dev, build, env fallback) in the README, so that I can run the app without tribal knowledge.
4. As a developer, I want a `docs/specs/` folder, so that all feature specs live in one versioned place.
5. As a developer, I want a spec naming convention and template, so that new specs are consistent and reviewable.
6. As a developer, I want the repowiki referenced from the docs, so that I know where deep architecture documentation lives.
7. As a developer, I want a `.qoder/worktrees/` folder convention, so that I can run multiple feature branches side by side without clones.
8. As a developer, I want worktree contents git-ignored, so that nested worktrees never pollute status or get committed.
9. As a developer, I want documented worktree add/list/remove commands, so that I can use the workflow without looking up git syntax.
10. As a developer, I want all feature work committed, so that history, diffs, and rollbacks exist from now on.
11. As a developer, I want temp artifacts removed and secrets verified-ignored before committing, so that the history stays clean and safe.
12. As a developer, I want the build to still pass after all changes, so that repo hygiene work introduces no regressions.

## Implementation Decisions

- **No source files move.** The codebase already follows Next.js App Router conventions (`src/app` route groups, per-domain server actions, feature-based component folders); reorganization is achieved through documentation, not file moves, avoiding import churn and history loss.
- The root README is rewritten in place as the single navigation entry point, linking to `docs/specs/` and `.qoder/worktrees/`.
- Specs live in `docs/specs/` with `NNN-kebab-name.md` numbering; a README documents the convention and a template; the first real spec is this document.
- The repowiki stays in `.qoder/repowiki` (IDE-managed artifact, untracked) and is referenced by path from docs rather than copied.
- Worktrees go in `.qoder/worktrees/` inside the repo, created with `git worktree add` from the main checkout; the folder is added to `.gitignore` and seeded with a usage README.
- The first feature commit is a single commit on `main` covering all application work since the scaffolding commit (tasks, projects, sections, views, collaboration, expenses, investments, docs), with a conventional-commit style message.
- `.env*` is already gitignored; `.env.example` is explicitly un-ignored so it ships as the setup reference.

## Testing Decisions

- Good tests here verify external outcomes, not internals: the repo still builds, git state is as intended, and docs render valid paths.
- **Seam 1 (existing):** `npm run build` must compile with zero TypeScript errors — proves no navigation/docs change broke imports.
- **Seam 2 (existing):** `git status` / `git log` — proves the worktree folder is ignored, secrets are not staged, and the commit landed on `main`.
- No automated test suite exists in the repo; none is added by this spec (docs/repo-hygiene scope).

## Out of Scope

- Moving, renaming, or refactoring any source files.
- Setting up an external issue tracker or CI.
- Regenerating or editing repowiki content.
- Any application feature changes.

## Further Notes

- The dev shell is PowerShell; build verification uses `npm run build 2>&1 | Select-Object -First 60`.
- Committing is explicitly requested by the user for this spec; no push to any remote is performed.
