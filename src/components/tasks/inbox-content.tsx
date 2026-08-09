"use client";

import type { Task } from "@/types/database";
import { TaskView } from "./task-view";

interface InboxContentProps {
  tasks: Task[];
  projectId: string;
  projectNames?: Record<string, string>;
}

export function InboxContent({ tasks, projectId, projectNames }: InboxContentProps) {
  return (
    <TaskView
      tasks={tasks}
      projectId={projectId}
      projectNames={projectNames}
    />
  );
}
