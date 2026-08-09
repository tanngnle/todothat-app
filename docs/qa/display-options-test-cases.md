# QA Test Cases — Interactive Display Options

**Feature:** Display menu (layout / completed toggle / grouping / sorting / filters) with persistence
**Worktree:** `todoist-app/.qoder/worktrees/feature-interactive-display-options` · **Branch:** `feature-interactive-display-options`
**Spec:** `docs/specs/002-interactive-display-options.md`

## Scope

Covers `DisplayMenu` (src/components/layout/display-menu.tsx), `DisplayProvider` (src/components/providers/display-provider.tsx), `TaskView` / `BoardView` / `CalendarView` / `SectionedTaskView`, the filter pipeline in `src/lib/utils/task-filters.ts`, and all six task surfaces: Inbox (`/`), Today, Upcoming, Project (`/project/[id]`), Labels, Filters. Out of scope: expenses, auth, Supabase round-trips.

## Environment Notes

- **Mock mode:** placeholder Supabase env → no login wall; all data comes from `src/lib/mock-db.ts` (in-memory, resets on server restart).
- **Dev server:** `npm run dev -- --port 3100` → http://localhost:3100 (run from the worktree directory).
- **Mock quirk:** the mock query builder's `.or()` is a no-op, so the **Today** view receives the full task set (overdue included). Expected results below reflect this.

### Mock data reference (dates relative to run date)

| Id | Content | Project/Section | P | Due | Completed | Labels |
|---|---|---|---|---|---|---|
| task-1 | Review Q3 financial report | Inbox | 2 | today | no | work, finance |
| task-2 | Buy groceries for the week | Inbox | 3 | today | no | personal |
| task-3 | Call dentist to reschedule | Inbox | 4 | tomorrow | no | health |
| task-4 | Finish API integration… | Work / In Progress | 1 | today | no | work, urgent |
| task-5 | Code review for PR #234 | Work / In Progress | 2 | today | no | work |
| task-6 | Write unit tests for auth module | Work / Backlog | 3 | +5 days | no | work |
| task-7 | Set up CI/CD pipeline | Work / Done | 2 | yesterday | **yes** | work, devops |
| task-8 | Submit expense report for July | Inbox | 1 | yesterday (overdue) | no | finance, urgent |
| task-9 | Plan weekend trip to Da Lat | Personal | 3 | +5 days | no | personal, travel |
| task-10 | Morning workout routine | Health & Fitness | 2 | today (recurring) | no | health |
| task-13 | Complete Next.js 16 course module 5 | Learning / This Week | 2 | +5 days | no | learning, dev |
| task-14 | Read 'Designing Data-Intensive…' Ch. 8 | Learning / This Month | 4 | none | no | learning |

- Projects: Inbox, Work, Personal, Health & Fitness, Learning. Labels: work, personal, health, finance, urgent, learning, dev, travel, devops.
- **task-7 is the only completed task.** Subtasks task-11/12 are never top-level.
- Inbox = tasks 1, 2, 3, 8 (4). Upcoming = due ≥ today = tasks 1, 2, 3, 4, 5, 6, 9, 10, 13 (9).
- Defaults: layout `list`, showCompleted `false`, grouping `none`, sorting `manual`, dateFilter `all`, priorityFilter `all`. localStorage key: `todoist:display-options`.

---

## A. Menu open/close semantics

**TC-01 — Panel opens on Display click**
Steps: go to `/` → click the **Display** button in the toolbar.
Expected: panel appears anchored below-right of the trigger with Layout, Completed tasks, Sort, Filter sections; trigger has `aria-expanded=true` and accent background.

**TC-02 — Panel stays open when changing Layout**
Steps: open menu → click each of List / Board / Calendar.
Expected: view switches each time; panel remains open after every click; the selected layout button shows `aria-pressed=true` with elevated background.

**TC-03 — Panel stays open on Completed toggle**
Steps: open menu → flip the "Completed tasks" switch ON then OFF.
Expected: switch state changes, task list updates live, panel stays open.

**TC-04 — Panel stays open when changing Grouping, incl. portaled select**
Steps: open menu → open the Grouping select → click "Priority" **inside the portaled Radix dropdown** (rendered in `data-radix-popper-content-wrapper`, outside the panel DOM).
Expected: selecting an option does NOT close the panel (outside-click handler ignores the popper wrapper); grouping applies immediately.

**TC-05 — Panel stays open when changing Sorting, Date, Priority selects**
Steps: open menu → change Sorting → "Due date", Date → "Overdue", Priority → "P2" via their dropdowns.
Expected: panel stays open across all three selections; list re-filters after each.

**TC-06 — Closes on outside click**
Steps: open menu → click empty page area (e.g. task list).
Expected: panel closes; `aria-expanded=false`.

**TC-07 — Closes on Escape**
Steps: open menu → press Escape.
Expected: panel closes.

**TC-08 — Closes on Display re-click; closes on route navigation**
Steps: (a) open menu → click Display again → closes. (b) open menu → click **Today** in sidebar.
Expected: panel closed in both cases (pathname effect resets open state).

**TC-09 — Open animation and short-viewport scrolling**
Steps: open menu and observe; then shrink viewport height (~400px) and reopen.
Expected: entrance uses `fade-in-0 zoom-in-95` (~150ms); panel has `max-h-[calc(100vh-4rem)]` with internal scroll — all sections reachable without overflowing viewport.

## B. Menu state indicators

**TC-10 — Modified dot appears when any option ≠ default**
Steps: from defaults, set layout → Board.
Expected: small round `bg-primary` dot appears on the Display trigger (aria-hidden).

**TC-11 — Modified dot cleared after restoring all defaults**
Steps: continue from TC-10 → Reset to defaults.
Expected: dot disappears from trigger.

**TC-12 — Reset button visible only when modified**
Steps: open menu at defaults; then change Priority → P1 and reopen.
Expected: "Reset to defaults" button absent at defaults, present after modification.

**TC-13 — Reset restores every default**
Steps: set layout=calendar, showCompleted=on, grouping=label, sorting=alphabetical, date=today, priority=p1 → click Reset.
Expected: all controls return to List / off / None / Manual / All / All; dot gone; list returns to default rendering.

**TC-14 — Filter section badge counts active filters**
Steps: set Date → This week (badge 1); also set Priority → P3 (badge 2); Reset (badge gone).
Expected: Filter section badge shows 1, then 2, then hidden (badge renders only when > 0).

**TC-15 — Non-default row labels highlighted**
Steps: change Grouping, Sorting, Date, Priority away from defaults.
Expected: those row labels switch from `text-muted-foreground` to `text-foreground`; revert when reset.

**TC-16 — ARIA attributes correct**
Steps: inspect trigger and controls.
Expected: trigger has `aria-haspopup="dialog"` + toggling `aria-expanded`; layout buttons expose `aria-pressed`; Sort/Filter section headers expose `aria-expanded` matching chevron rotation.

## C. Persistence

**TC-17 — Options survive page reload**
Steps: set layout=board, grouping=priority, date=overdue → hard-reload `/`.
Expected: same board+priority view restored; localStorage `todoist:display-options` contains the JSON with those values.

**TC-18 — Options persist across routes**
Steps: set sorting=alphabetical on `/` → navigate to `/upcoming`.
Expected: alphabetical order applied on Upcoming (shared provider + storage).

**TC-19 — Invalid stored values fall back to defaults**
Steps: in DevTools set `todoist:display-options` to `{"layout":"kanban","sorting":"bogus","showCompleted":"yes"}` → reload; then to `not-json{{{` → reload.
Expected: invalid fields replaced by defaults (layout=list, sorting=manual, showCompleted=false); corrupt JSON silently ignored — app renders defaults, no crash.

## D. Layout everywhere

**TC-20 — List layout on all six surfaces**
Steps: layout=List → visit `/`, `/today`, `/upcoming`, `/project/proj-work`, `/labels`, `/filters`.
Expected: each renders vertical task rows (Inbox: 4 tasks; Work: sectioned list).

**TC-21 — Board layout on Inbox / Today / Upcoming**
Steps: layout=Board on the three global views.
Expected: single "All Tasks" column (no sections passed) with count badge; cards render as bordered `bg-card` tiles; horizontal scroll when wide.

**TC-22 — Board layout on Project page**
Steps: layout=Board → `/project/proj-work` (grouping=None).
Expected: columns **Backlog**, **In Progress**, **Done** with per-column counts (6/5/7 filtered by completed toggle).

**TC-23 — Board layout on Labels and Filters pages**
Steps: layout=Board → `/labels` and `/filters` with Grouping=None; then change Grouping to Priority.
Expected: with Grouping=None these pages render ONE unified board whose columns are the labels/filters (one column per label/filter, each showing that section's visible tasks); with Grouping≠None the board groups ALL visible section tasks by the chosen key (e.g. P1–P4 columns). Board and Calendar on these pages respect Sorting, Date filter, Priority filter and the Completed toggle.

**TC-24 — Calendar layout on all six surfaces**
Steps: layout=Calendar → visit all six surfaces.
Expected: calendar grid renders with dated tasks placed on due dates; undated tasks (task-14) not lost/crashing; page remains functional.

**TC-25 — Layout choice applies page-wide on Labels/Filters**
Steps: on `/labels` switch to Board, observe the whole page; then switch to Calendar.
Expected: the entire page switches to one unified Board (columns = labels), then to one shared Calendar — the layout option is global, not per-section.

## E. Grouping on List AND Board

**TC-26 — Grouping=None flat list preserves sections + Add section**
Steps: grouping=None on `/project/proj-work`, List layout.
Expected: sections Backlog / In Progress / Done rendered with headers, tasks under correct section, and the Add section form present.

**TC-27 — Priority grouping on List**
Steps: grouping=Priority on `/`.
Expected: headers "P1 - Urgent (1)" [task-8], "P2 - High (1)" [task-1], "P3 - Medium (1)" [task-2], "P4 - Low (1)" [task-3]; empty P groups omitted.

**TC-28 — Priority grouping on Board**
Steps: grouping=Priority, layout=Board on `/upcoming`.
Expected: columns P1 - Urgent … P4 - Low with counts (P1: task-4; P2: 1, 5, 10, 13; P3: 2, 6, 9; P4: 3).

**TC-29 — Due-date grouping on List**
Steps: grouping=Due date on `/`.
Expected: groups Overdue (1: task-8), Today (2: task-1, 2), Tomorrow (1: task-3); empty This Week/Later/No Date groups hidden.

**TC-30 — Due-date grouping on Board**
Steps: grouping=Due date, layout=Board on `/today` (mock: full task set).
Expected: columns Overdue / Today / Tomorrow / Later / No Date with correct membership (task-14 in No Date; +5-day tasks in Later).

**TC-31 — Label grouping**
Steps: grouping=Label on `/`.
Expected: groups finance (task-1, 8), work (task-1), personal (task-2), health (task-3), urgent (task-8); tasks with multiple labels appear in each of their label groups.

**TC-32 — Project grouping shows human-readable names**
Steps: grouping=Project on `/today` or `/filters`.
Expected: group titles are **Work, Inbox, Personal, Health & Fitness, Learning** — never raw/truncated UUIDs (projectNames map resolves ids).

**TC-33 — Board grouping=None: sections vs All Tasks**
Steps: layout=Board, grouping=None.
Expected: `/project/proj-work` → 3 section columns; `/` and `/upcoming` → single "All Tasks" column.

**TC-34 — Grouping applies inside Labels/Filters page sections**
Steps: grouping=Priority on `/labels`.
Expected: each label section re-groups its tasks by P1–P4 headers (per-section TaskView honors grouping).

## F. Sorting

**TC-35 — Manual sort is sort_order based**
Steps: sorting=Manual on `/`.
Expected: order task-1, task-2, task-3, task-8 (ascending sort_order 65536…).

**TC-36 — Due date sort**
Steps: sorting=Due date on Inbox (has task-8 yesterday) and Upcoming.
Expected: Inbox → task-8 first (yesterday), then today tasks; Upcoming → today tasks first, +5-day next; undated tasks last.

**TC-37 — Priority sort**
Steps: sorting=Priority on `/upcoming`.
Expected: task-4 (P1) first, then P2 set, P3 set, P4 last (ascending priority number).

**TC-38 — Alphabetical sort**
Steps: sorting=Alphabetical on `/upcoming`.
Expected: rows ordered by content A→Z ("Buy groceries…" before "Call dentist…" before "Code review…" etc.).

**TC-39 — Date added sort**
Steps: sorting=Date added on `/upcoming`.
Expected: newest created_at first — task-1/2/13 (2026-08-01) ahead of task-6 (2026-07-25) and task-10 (2026-07-15).

## G. Filters

**TC-40 — Date filter values on Inbox/Today/Upcoming**
Steps: on each of `/`, `/today`, `/upcoming` cycle Date: Today / Overdue / This week / Next week / No date / All.
Expected on Upcoming: Today → 5 (1, 2, 4, 5, 10); Overdue → 0 (none ≥ today are past); This week → the today tasks; Next week → 3 (6, 9, 13 due +5d); No date → 0; All → 9. Inbox Overdue → 1 (task-8); Inbox No date → 0.

**TC-41 — Priority filter values**
Steps: on `/` and `/project/proj-work` cycle Priority: P1…P4.
Expected Inbox: P1 → 1 (task-8); P2 → 1 (task-1); P3 → 1 (task-2); P4 → 1 (task-3). Work: P1 → 1 (task-4); P2 → 1 (task-5) at default showCompleted.

**TC-42 — Filters apply to Board layout (project page regression)**
Steps: `/project/proj-work` → layout=Board → Priority=P1.
Expected: only task-4 remains (in In Progress column); board previously ignored filters — verify columns recount correctly and empty columns show "No tasks".

**TC-43 — Filters apply to Calendar layout**
Steps: layout=Calendar on `/upcoming` → Date=Today, then Priority=P2.
Expected: calendar shows only matching tasks (Today → 5 tasks' entries; P2 → task-1, 5, 10, 13 entries).

**TC-44 — Combined date + priority filters**
Steps: on `/today` set Date=Today + Priority=P2.
Expected: only tasks due today with P2 → task-1, task-5 (task-10 P2 today also matches → 3 total: 1, 5, 10); Filter badge shows 2.

**TC-45 — Filters + Label grouping interact sanely**
Steps: on `/` set Priority=P1 + grouping=Label.
Expected: only task-8 rendered, appearing under both "finance" and "urgent" groups.

**TC-46 — Reset clears filter results**
Steps: from TC-44 state click Reset to defaults.
Expected: full unfiltered list returns; badge and dot cleared.

## H. Completed toggle

**TC-47 — OFF (default) hides completed everywhere**
Steps: showCompleted=off on all six surfaces.
Expected: task-7 "Set up CI/CD pipeline" never visible; Work/Done section empty.

**TC-48 — ON shows task-7 on Project page**
Steps: `/project/proj-work` → toggle ON.
Expected: task-7 appears in Done section with completed styling; board Done column count becomes 1.

**TC-49 — ON on Today view (mock full set)**
Steps: `/today` → toggle ON.
Expected: task count increases by exactly 1 (task-7 joins, due yesterday).

**TC-50 — ON on Upcoming unchanged**
Steps: `/upcoming` → toggle ON.
Expected: still 9 tasks (task-7 due yesterday is not in upcoming set).

**TC-51 — ON with priority filter**
Steps: `/project/proj-work` → ON + Priority=P2.
Expected: shows task-5 and task-7 (both P2).

**TC-52 — Toggle persists and survives reload**
Steps: toggle ON → reload.
Expected: `showCompleted:true` restored from localStorage; completed task still visible.

## I. Regressions & UX

**TC-53 — Task detail still opens**
Steps: any layout/grouping → click a task (e.g. task-4).
Expected: detail panel/sheet opens with content, description, comments (2 on task-4).

**TC-54 — Checkbox completes/uncompletes**
Steps: check task-8 in Inbox (showCompleted=off) → refresh; enable showCompleted and uncheck it.
Expected: task disappears from list on complete (mock update persists for session); unchecking restores it. Completing recurring task-10 spawns next occurrence.

**TC-55 — Quick-add appears exactly once / per group**
Steps: grouping=None on `/` → one quick-add row; grouping=Priority on `/` → one add affordance per group.
Expected: no duplicated quick-add in flat list; per-group add targets correct group.

**TC-56 — Empty state when filters exclude everything**
Steps: on `/` set Priority=P1 + Date=No date (no P1 task lacks a date).
Expected: friendly empty state "No tasks found / Try adjusting your filters…" (or page-specific empty state), no crash.

**TC-57 — Empty board column placeholder**
Steps: `/project/proj-work`, Board, Priority=P1.
Expected: empty Backlog/Done columns render dashed "No tasks" placeholder.

**TC-58 — Search command and sidebar navigation unaffected**
Steps: open search/command (Ctrl/Cmd+K) and navigate via sidebar with non-default display options active.
Expected: both work normally; navigation applies options to the new route (and closes the Display panel per TC-08).

**TC-59 — Dark mode rendering**
Steps: switch theme to dark → open Display menu, board, badges.
Expected: popover (`bg-popover`), muted dot badge, board columns (`bg-muted/30`, `bg-card`), and modified-dot all readable; no white flash or invisible text.

---

**Total test cases: 59** (TC-01 … TC-59)
