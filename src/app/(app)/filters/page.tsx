import { getFilters } from "@/actions/filters";
import { getTasks } from "@/actions/tasks";
import { getProjects } from "@/actions/projects";
import { TaskList } from "@/components/tasks/task-list";
import { parseFilterQuery, applyFilter } from "@/lib/utils/filter-parser";
import { Filter } from "lucide-react";

export default async function FiltersPage() {
  const filters = await getFilters();
  const allTasks = await getTasks();
  const projects = await getProjects();
  const today = new Date().toISOString().split("T")[0];

  // Enrich tasks with project names for #project filter
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const enrichedTasks = allTasks.map((t) => ({
    ...t,
    project_name: projectMap.get(t.project_id) || "",
  }));

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
        <div className="space-y-6">
          {filters.map((filter) => {
            const parsed = parseFilterQuery(filter.query);
            const filteredTasks = applyFilter(enrichedTasks, parsed, today);

            return (
              <div key={filter.id}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: filter.color }}
                  />
                  <h2 className="text-sm font-semibold text-foreground">
                    {filter.name}
                  </h2>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {filter.query}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    ({filteredTasks.length})
                  </span>
                </div>
                {filteredTasks.length > 0 ? (
                  <TaskList
                    tasks={filteredTasks}
                    projectId={filteredTasks[0].project_id}
                  />
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No tasks match this filter
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
