import { getLabels } from "@/actions/labels";
import { getTasksByLabel } from "@/actions/labels";
import { TaskList } from "@/components/tasks/task-list";
import { Tag, Plus } from "lucide-react";
import { createLabel, deleteLabel } from "@/actions/labels";

export default async function LabelsPage() {
  const labels = await getLabels();

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
        <div className="space-y-6">
          {labels.map((label) => (
            <LabelSection key={label.id} label={label} />
          ))}
        </div>
      )}
    </div>
  );
}

async function LabelSection({ label }: { label: any }) {
  const tasks = await getTasksByLabel(label.name);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: label.color }}
        />
        <h2 className="text-sm font-semibold text-foreground">{label.name}</h2>
        <span className="text-xs text-muted-foreground">({tasks.length})</span>
      </div>
      {tasks.length > 0 ? (
        <TaskList tasks={tasks} projectId={tasks[0].project_id} />
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tasks with this label
        </p>
      )}
    </div>
  );
}
