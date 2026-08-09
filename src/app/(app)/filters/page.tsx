import { getFilters } from "@/actions/filters";
import { getTasks } from "@/actions/tasks";
import { getProjects } from "@/actions/projects";
import { SectionedTaskView } from "@/components/tasks/sectioned-task-view";
import { parseFilterQuery, applyFilter } from "@/lib/utils/filter-parser";
import { Filter } from "lucide-react";
import type { Filter as FilterRow, Project, Task } from "@/types/database";

export default async function FiltersPage() {
  // A fetch failure should render the empty state, not a 500.
  let filters: FilterRow[] = [];
  let allTasks: Task[] = [];
  let projects: Project[] = [];
  try {
    [filters, allTasks, projects] = await Promise.all([
      getFilters(),
      getTasks(undefined, undefined, true),
      getProjects(),
    ]);
  } catch {
    // Missing DB / fetch error: render the empty state below.
  }
  const today = new Date().toISOString().split("T")[0];

  // Enrich tasks with project names for #project filter
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const projectNames = Object.fromEntries(projectMap);
  const enrichedTasks = allTasks.map((t) => ({
    ...t,
    project_name: projectMap.get(t.project_id) || "",
  }));

  const sections = filters.map((filter) => {
    const parsed = parseFilterQuery(filter.query);
    const filteredTasks = applyFilter(enrichedTasks, parsed, today);

    return {
      id: filter.id,
      title: filter.name,
      color: filter.color,
      meta: (
        <>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {filter.query}
          </code>
          <span className="text-xs text-muted-foreground">
            ({filteredTasks.length})
          </span>
        </>
      ),
      tasks: filteredTasks,
      emptyText: "No tasks match this filter",
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Filters</h1>
        <p className="text-sm text-muted-foreground">
          Create custom views for your tasks
        </p>
      </div>

      {filters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Filter className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">No custom filters</h3>
          <p className="text-sm text-muted-foreground">
            Create filters to quickly find tasks.
          </p>
        </div>
      ) : (
        <SectionedTaskView sections={sections} projectNames={projectNames} />
      )}
    </div>
  );
}
