import { getInboxProject } from "@/actions/projects";
import { getTasks } from "@/actions/tasks";
import { TaskList } from "@/components/tasks/task-list";
import { Plus } from "lucide-react";

export default async function InboxPage() {
  const inbox = await getInboxProject();
  const tasks = inbox ? await getTasks(inbox.id) : [];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8">
      {tasks.length === 0 && !inbox ? (
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-6 relative">
            <div className="h-40 w-40 rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <svg
                className="h-24 w-24 text-yellow-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 8V21H3V8" />
                <path d="M1 3H23V8H1V3Z" />
                <path d="M10 12H14" />
              </svg>
            </div>
            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-yellow-200 dark:bg-yellow-800/50" />
            <div className="absolute -bottom-1 -left-3 h-4 w-4 rounded-full bg-green-200 dark:bg-green-800/50" />
            <div className="absolute top-4 -right-4 h-3 w-3 rounded-full bg-orange-200 dark:bg-orange-800/50" />
          </div>

          <h3 className="mb-2 text-lg font-semibold">Capture now, plan later</h3>
          <p className="mb-6 text-sm text-muted-foreground max-w-xs">
            Inbox is your go-to spot for quick task entry. Clear your mind now,
            organize when you&apos;re ready.
          </p>
          <button className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add task
          </button>
        </div>
      ) : inbox ? (
        <div className="w-full max-w-2xl">
          <TaskList tasks={tasks} projectId={inbox.id} />
        </div>
      ) : null}
    </div>
  );
}
