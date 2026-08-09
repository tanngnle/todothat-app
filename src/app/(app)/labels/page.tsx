import { getLabels, getTasksByLabel } from "@/actions/labels";
import { getProjects } from "@/actions/projects";
import { SectionedTaskView } from "@/components/tasks/sectioned-task-view";
import { Tag } from "lucide-react";

export default async function LabelsPage() {
  const labels = await getLabels();
  const projects = await getProjects();
  const projectNames = Object.fromEntries(
    projects.map((p) => [p.id, p.name])
  );

  const tasksByLabel = await Promise.all(
    labels.map((label) => getTasksByLabel(label.name, true))
  );

  const sections = labels.map((label, index) => ({
    id: label.id,
    title: label.name,
    color: label.color,
    meta: (
      <span className="text-xs text-muted-foreground">
        ({tasksByLabel[index].length})
      </span>
    ),
    tasks: tasksByLabel[index],
    emptyText: "No tasks with this label",
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Labels</h1>
          <p className="text-sm text-muted-foreground">
            Organize tasks with labels
          </p>
        </div>
      </div>

      {labels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Tag className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">No labels yet</h3>
          <p className="text-sm text-muted-foreground">
            Create labels to organize your tasks.
          </p>
        </div>
      ) : (
        <SectionedTaskView sections={sections} projectNames={projectNames} />
      )}
    </div>
  );
}
