"use client";

import { useState } from "react";
import { Task } from "@/types/database";
import { TaskItem } from "./task-item";
import { useDisplayOptions } from "@/components/providers/display-provider";

interface BoardViewProps {
  tasks: Task[];
  projectId: string;
  sections?: Array<{ id: string; name: string }>;
}

export function BoardView({ tasks, projectId, sections = [] }: BoardViewProps) {
  const { options } = useDisplayOptions();

  // Group tasks by section or status
  const columns = sections.length > 0
    ? sections.map((section) => ({
        id: section.id,
        title: section.name,
        tasks: tasks.filter((t) => t.section_id === section.id),
      }))
    : [
        {
          id: "no-section",
          title: "All Tasks",
          tasks: tasks,
        },
      ];

  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex w-80 shrink-0 flex-col rounded-lg bg-muted/30 p-3"
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {column.title}
            <span className="ml-2 text-xs text-muted-foreground">
              {column.tasks.length}
            </span>
          </h3>

          <div className="flex flex-col gap-2">
            {column.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <TaskItem task={task} />
              </div>
            ))}

            {column.tasks.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-muted p-4 text-center text-sm text-muted-foreground">
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
