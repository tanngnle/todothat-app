"use client";

import { useMemo, type ReactNode } from "react";
import type { Task } from "@/types/database";
import { TaskView } from "./task-view";
import { BoardView } from "./board-view";
import { CalendarView } from "./calendar-view";
import { useDisplayOptions } from "@/components/providers/display-provider";
import {
  applyDisplayOptions,
  flattenGroups,
} from "@/lib/utils/task-filters";

interface SectionedTaskViewProps {
  sections: Array<{
    id: string;
    title: string;
    color?: string;
    meta?: ReactNode;
    tasks: Task[];
    emptyText?: string;
  }>;
  projectNames?: Record<string, string>;
}

export function SectionedTaskView({
  sections,
  projectNames,
}: SectionedTaskViewProps) {
  const { options } = useDisplayOptions();

  const processed = useMemo(
    () =>
      sections.map((s) => ({
        ...s,
        visible: flattenGroups(
          applyDisplayOptions(s.tasks, {
            grouping: "none",
            sorting: options.sorting,
            dateFilter: options.dateFilter,
            priorityFilter: options.priorityFilter,
            showCompleted: options.showCompleted,
            projectNames,
          })
        ),
      })),
    [sections, options, projectNames]
  );

  const allVisible = useMemo(
    () => processed.flatMap((s) => s.visible),
    [processed]
  );

  if (options.layout === "board") {
    if (options.grouping !== "none") {
      // BoardView groups internally by options.grouping
      return (
        <BoardView
          tasks={allVisible}
          projectId={allVisible[0]?.project_id ?? ""}
          projectNames={projectNames}
        />
      );
    }
    return (
      <BoardView
        columns={processed.map((s) => ({
          id: s.id,
          title: s.title,
          tasks: s.visible,
        }))}
        projectId={
          processed.find((s) => s.visible[0])?.visible[0].project_id ?? ""
        }
      />
    );
  }

  if (options.layout === "calendar") {
    return <CalendarView tasks={allVisible} />;
  }

  return (
    <div className="space-y-6">
      {processed.map((s) => (
        <div key={s.id}>
          <div className="mb-3 flex items-center gap-2">
            {s.color && (
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
            )}
            <h2 className="text-sm font-semibold text-foreground">
              {s.title}
            </h2>
            {s.meta}
          </div>
          <TaskView
            tasks={s.tasks}
            projectNames={projectNames}
            emptyMessage={s.emptyText}
          />
        </div>
      ))}
    </div>
  );
}
