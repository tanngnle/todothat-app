# Specs

Feature specifications (PRDs) for the todoist-app live here, one file per feature or feature batch.

## Naming Convention

```
NNN-kebab-case-name.md
```

- `NNN` — zero-padded sequence number (`001`, `002`, ...)
- Name — short, descriptive, kebab-case

## Spec Template

Each spec should contain:

1. **Problem Statement** — the problem from the user's perspective
2. **Solution** — the solution from the user's perspective
3. **User Stories** — numbered list: "As an `<actor>`, I want a `<feature>`, so that `<benefit>`"
4. **Implementation Decisions** — modules, interfaces, architecture, schema changes (no file paths or code snippets unless they encode a decision precisely)
5. **Testing Decisions** — what seams verify the work; only test external behavior
6. **Out of Scope** — what is explicitly excluded
7. **Further Notes** — anything else relevant

## Index

| Spec | Description |
|------|-------------|
| [001-repo-navigation-docs-worktrees](001-repo-navigation-docs-worktrees.md) | Repo navigation README, docs home, git worktrees, first feature commit |
| [002-interactive-display-options](002-interactive-display-options.md) | Display Options: stay-open menu, unified TaskView renderer, grouping for List+Board, options applied on all Todo pages, real completed-toggle, persistence |

## Related Documentation

- **Repowiki** (auto-generated architecture deep-dive): `.qoder/repowiki/en/content/` — covers Core Architecture, Task Management System, Expense Tracking Module, Server Actions API layer, UI Components, and Database Schema Design. It is an IDE-managed artifact and is not committed.
- **Codebase map & conventions**: [`../../README.md`](../../README.md)
- **Database migrations**: `../../supabase/migrations/`
