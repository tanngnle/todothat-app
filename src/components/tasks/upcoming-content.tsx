"use client";

import type { Task } from "@/types/database";
import { TaskView } from "./task-view";

interface UpcomingContentProps {
  tasks: Task[];
  projectNames?: Record<string, string>;
}

export function UpcomingContent({ tasks, projectNames }: UpcomingContentProps) {
  return (
    <TaskView
      tasks={tasks}
      projectNames={projectNames}
      emptyState={
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="mb-4 text-6xl"></div>
          <h3 className="mb-1 text-lg font-medium">Nothing upcoming</h3>
          <p className="text-sm text-muted-foreground">
            Tasks with due dates will appear here.
          </p>
        </div>
      }
    />
  );
}
