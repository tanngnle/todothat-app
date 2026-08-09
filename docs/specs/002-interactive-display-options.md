# Interactive Display Options — Unified, Stay-Open, Everywhere

## Requirements (verbatim intent)
1. All Layout, Sort, and Filter options work in any tab/page in the Todo parts (Inbox, Today, Upcoming, Project pages, Labels, Filters).
2. Grouping affects both the Board and the List layout.
3. The Display Option panel must NOT close when the user changes an option; it closes only when the user does something else (outside click, Escape, navigation, or re-clicking the Display button).
4. Overall UI/UX improvement.

## Verified current state (ground truth)
- `src/components/layout/display-menu.tsx` is a custom controlled panel (`isOpen` L100, outside-`mousedown` closer L112-122). **Root cause of auto-close**: the four option pickers are Radix `Select`s whose content portals to `document.body` (outside `menuRef`), so selecting an option trips the outside-click closer. No Escape handling, no route-change close, no animation, no ARIA, no reset affordance.
- `src/lib/utils/task-filters.ts` already has the full pure pipeline: `applyFilters` L19-75, `sortTasks` L80-107, `groupTasks` L112-215, `applyDisplayOptions` L220-243. Project grouping titles are truncated UUIDs (L206).
- Consumption gaps: Inbox (`app/(app)/page.tsx` L45), Labels (`labels/page.tsx`), Filters (`filters/page.tsx`) ignore ALL options (server-rendered `TaskList`); Today/Upcoming hardcode `grouping:"none"` (`today-content.tsx` L22, `upcoming-content.tsx` L19); `project-content.tsx` passes RAW unfiltered tasks to Board/Calendar (L31/L35); `board-view.tsx` reads options but ignores grouping (columns = sections only, L18-30); `today-content.tsx` renders one `TaskList` per task (L52-61 → N add-task forms).
- `src/actions/tasks.ts` (`getTasks` L19, `getTodayTasks` L62, `getUpcomingTasks` L82) and `src/actions/labels.ts` (`getTasksByLabel` L110) hardcode `.eq("is_completed", false)` → the Completed-tasks toggle can never show anything.
- `display-provider.tsx`: no persistence, non-memoized context value; `resetOptions` already exists.
- `Task` type has no `project_name`; pages that need names must pass a map (filters page already builds one).

## Design decisions
- **Keep the existing custom panel + Radix Selects** (matches the reference screenshot); fix stay-open with a popper-portal whitelist in the outside-click handler, plus Escape + route-change close. No primitive rewrite.
- **One shared client renderer `TaskView`** consumes `applyDisplayOptions` and renders List(grouped)/Board(grouped)/Calendar; all six Todo surfaces delegate to it → uniformity by construction.
- **Opt-in `includeCompleted` param** on server fetchers makes the Completed toggle real without changing search/sidebar payloads.
- **localStorage persistence** (two-phase, SSR-safe) so settings survive reloads.
- **Project-name map** threaded into `groupTasks` for human-readable project groups.

## Changes by subsystem

### 1. Stay-open menu + UX polish — `src/components/layout/display-menu.tsx`
- In `handleClickOutside` (L112-122): before closing, early-return when `(event.target as Element).closest("[data-radix-popper-content-wrapper]")` (Radix Select portals carry this attr) → option selection no longer closes the panel. Outside click, trigger re-click still close it.
- Add `keydown` Escape effect (while open) → close. Add `usePathname()` effect → close on navigation.
- Panel div (L139): add `animate-in fade-in-0 zoom-in-95 duration-150` (tw-animate-css already loaded) + `max-h-[calc(100vh-4rem)] overflow-y-auto`.
- Trigger (L126-136): `aria-haspopup="dialog"`, `aria-expanded={isOpen}`; show a `h-1.5 w-1.5 rounded-full bg-primary` dot when options differ from defaults (via new `isModifiedOptions` helper).
- Menu footer: "Reset to defaults" text button (calls existing `resetOptions`), rendered only when modified.
- `CollapsibleSection`: `aria-expanded`, chevron `transition-transform rotate`, optional `badge?: number` chip; pass active-filter count (dateFilter≠"all" + priorityFilter≠"all") to the Filter section.
- Layout buttons: `aria-pressed`, `title` tooltip. Select row labels: `text-foreground` when value ≠ default, else `text-muted-foreground`.

### 2. Provider persistence + memo — `src/components/providers/display-provider.tsx`
- Export `defaultDisplayOptions`; add exported `isModifiedOptions(options)` (shallow compare vs defaults).
- Persist under key `todoist:display-options`: mount effect reads (try/catch, shallow-merge over defaults, validate each field against its union set), guarded by a `loadedRef` so the write effect (`useEffect([options])`) doesn't clobber storage with defaults first. SSR-safe (no localStorage during render).
- Wrap context value in `useMemo` (deps `[options]`; setters are stable `useCallback`s). Public API unchanged.

### 3. Shared transforms — `src/lib/utils/task-filters.ts`
- `groupTasks(tasks, grouping, projectNames?: Record<string,string>)`: project bucket title = `projectNames?.[projectId] ?? "Unknown project"` (fixes L206 UUID titles).
- `applyDisplayOptions` accepts optional `projectNames` and threads it through.
- Add `flattenGroups(groups: TaskGroup[]): Task[]` (= `groups.flatMap(g => g.tasks)`).

### 4. Board grouping — `src/components/tasks/board-view.tsx`
- Accept optional `projectNames?: Record<string,string>` prop.
- Columns: `options.grouping !== "none" ? groupTasks(tasks, options.grouping, projectNames) : (existing sections logic L18-30)`. Column markup unchanged (already `{id,title,tasks}`-shaped). Board now receives pre-filtered/sorted tasks from TaskView (fixes raw-tasks bug).

### 5. New shared renderer — `src/components/tasks/task-view.tsx` (new, "use client")
Props: `{ tasks, projectId?, sections?, projectNames?, emptyState?, footer? }`.
- `groups = useMemo(() => applyDisplayOptions(tasks, { ...options, projectNames }), [tasks, options, projectNames])`; `flat = useMemo(() => flattenGroups(groups), [groups])`.
- `flat.length === 0` → `emptyState` prop or default dashed empty box.
- `layout === "board"` → `<BoardView tasks={flat} projectId={projectId ?? flat[0]?.project_id ?? ""} sections={options.grouping === "none" ? sections ?? [] : []} projectNames={projectNames} />`.
- `layout === "calendar"` → `<CalendarView tasks={flat} />`.
- List:
  - `grouping === "none" && sections?.length` → section layout moved verbatim from `project-content.tsx` L39-82 (SectionHeader + `TaskList` per section + no-section tasks), then `footer` (AddSectionForm).
  - `grouping !== "none"` → per-group header (markup from project-content L87-93: `text-sm font-semibold uppercase tracking-wider` + count) + `TaskList` per group, then `footer`.
  - else flat `<TaskList tasks={flat} projectId={...} />` + `footer`.

Also new `src/components/tasks/sectioned-task-view.tsx` (client): props `{ sections: { id: string; header: ReactNode; tasks: Task[] }[], projectNames? }` — renders each section header + a `TaskView` beneath it (used by Labels and Filters pages).

### 6. Page wiring + real completed toggle
- `src/actions/tasks.ts`: add trailing `includeCompleted = false` param to `getTasks`, `getTodayTasks`, `getUpcomingTasks`; apply `.eq("is_completed", false)` only when false. Same for `getTasksByLabel` in `src/actions/labels.ts`. Default keeps layout-search (`(app)/layout.tsx`) and sidebar payloads unchanged.
- `src/app/(app)/page.tsx` (Inbox): keep server empty-state; replace direct `TaskList` (L45) with new client `src/components/tasks/inbox-content.tsx` = `<TaskView tasks projectId={inbox.id} projectNames />`; page also fetches `getProjects()` to build `projectNames`.
- `today/page.tsx` + `today-content.tsx`: page passes `getTodayTasks(true)` + `projectNames`; content becomes thin wrapper `<TaskView tasks={tasks} projectNames emptyState={existing "All done for today!" box} />` (drops unused `overdue`/`todayTasks` props and the per-task TaskList loop).
- `upcoming/page.tsx` + `upcoming-content.tsx`: same with `getUpcomingTasks(true)` and its "Nothing upcoming" empty state.
- `project/[id]/page.tsx` + `project-content.tsx`: page passes `projectName`; content becomes `<TaskView tasks projectId sections projectNames={{[projectId]: projectName}} footer={<AddSectionForm projectId={projectId} />} />`.
- `labels/page.tsx`: server builds `[{id, header, tasks}]` (header = existing dot+name+count markup; `getTasksByLabel(name, true)`), renders `<SectionedTaskView sections projectNames />` (page fetches projects).
- `filters/page.tsx`: same pattern with `getTasks(undefined, undefined, true)`; keep `parseFilterQuery/applyFilter` server-side; pass existing `projectMap` as `projectNames`.

## Task breakdown (execution order)
1. **Core engine** (parallel-safe, disjoint files): provider persistence/memo + menu stay-open/polish (`display-provider.tsx`, `display-menu.tsx`).
2. **Views engine**: `task-filters.ts` extensions + `board-view.tsx` grouping + new `task-view.tsx` + `sectioned-task-view.tsx`.
3. **Wiring**: actions `includeCompleted` + all six page/content updates (`inbox-content.tsx` new, today/upcoming/project content, inbox/today/upcoming/project/labels/filters pages). Depends on 2.
4. **Verify**: `npm run build` + lint; then Browser E2E matrix.
5. **Code review**: 3-perspective review of the change set.

## Test / verification plan
- `npm run build` passes; no TS errors.
- Browser matrix on dev server across Inbox / Today / Upcoming / a Project / Labels / Filters:
  - Menu stays open while changing Layout, Grouping, Sorting, Date, Priority, Completed toggle; closes on outside click, Escape, Display re-click, and route change.
  - Grouping=Priority/Due date/Label/Project renders group headers in List AND columns in Board (project names readable).
  - Filters/sort/completed visibly affect List, Board, and Calendar on every page.
  - Completed toggle shows completed tasks (seed data) and hides them when off.
  - Reload retains chosen options (persistence).
- Regression: project sections + AddSectionForm intact when grouping=None; default views unchanged when options at defaults.

## Risks and mitigations
- Popper-whitelist could keep the menu open when clicking another popper (only hover tooltips exist) — acceptable; true outside clicks still close.
- localStorage hydration: two-phase read in mount effect + `loadedRef` guard → no SSR mismatch, no storage clobber.
- Labels/Filters/Inbox will now hide completed tasks by default (consistent with Today/Upcoming); recoverable via the toggle, and data is fetched with `includeCompleted`.
- Grouped list renders one `TaskForm` per group (existing project behavior); flat views render exactly one (fixes Today's N-forms bug).
- Board with grouping set intentionally overrides section columns; default `none` preserves current look exactly.

## Rejected alternatives
- **Replacing Radix Selects with inline radio rows** (Plan A) or **rebuilding on Radix Popover** (Plan B): larger rewrite, deviates from the reference design, and gains nothing — the existing custom panel + a 2-line portal whitelist fully solves stay-open.
- **Per-page grouping wiring without a shared TaskView** (Plan C minimal variant): leaves duplicated transform logic and makes "works on every page" depend on per-page discipline; TaskView guarantees uniformity and fixes three existing bugs (raw board tasks, N TaskForms, hardcoded grouping) in one place.
- **Context split + React.memo audit + optimistic completion toggle** (Plan B perf extras): over-engineered for a personal-scale app; memoized `useMemo` transforms in TaskView give the meaningful win without new failure modes.
- **New `src/lib/display.ts` duplicating `task-filters.ts`** (Plans A/B first drafts): the pipeline already exists; extend it instead.
