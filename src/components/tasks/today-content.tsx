"use client";

import type { Task } from "@/types/database";
import { TaskView } from "./task-view";

interface TodayContentProps {
  tasks: Task[];
  projectNames?: Record<string, string>;
}

export function TodayContent({ tasks, projectNames }: TodayContentProps) {
  return (
    <TaskView
      tasks={tasks}
      projectNames={projectNames}
      emptyState={
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="mb-4 text-6xl"></div>
          <h3 className="mb-1 text-lg font-medium">All done for today!</h3>
          <p className="text-sm text-muted-foreground">
            Enjoy the rest of your day.
          </p>
        </div>
      }
    />
  );
}
