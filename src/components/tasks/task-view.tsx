"use client";

import { useMemo, type ReactNode } from "react";
import type { Task, Section } from "@/types/database";
import { useDisplayOptions } from "@/components/providers/display-provider";
import {
  applyDisplayOptions,
  flattenGroups,
} from "@/lib/utils/task-filters";
import { BoardView } from "./board-view";
import { CalendarView } from "./calendar-view";
import { TaskList } from "./task-list";
import { SectionHeader } from "@/components/sections/section-header";

interface TaskViewProps {
  tasks: Task[];
  projectId?: string;
  sections?: Section[];
  projectNames?: Record<string, string>;
  emptyState?: ReactNode;
  emptyMessage?: string;
  footer?: ReactNode;
}

export function TaskView({
  tasks,
  projectId,
  sections,
  projectNames,
  emptyState,
  emptyMessage,
  footer,
}: TaskViewProps) {
  const { options } = useDisplayOptions();

  const groups = useMemo(
    () =>
      applyDisplayOptions(tasks, {
        grouping: options.grouping,
        sorting: options.sorting,
        dateFilter: options.dateFilter,
        priorityFilter: options.priorityFilter,
        showCompleted: options.showCompleted,
        projectNames,
      }),
    [tasks, options, projectNames]
  );

  const flat = useMemo(() => flattenGroups(groups), [groups]);

  const resolvedProjectId = projectId ?? flat[0]?.project_id ?? "";

  if (flat.length === 0) {
    return emptyState ? (
      <>{emptyState}</>
    ) : (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <h3 className="mb-1 text-lg font-medium">
          {emptyMessage ?? "No tasks found"}
        </h3>
        {!emptyMessage && (
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or add a new task.
          </p>
        )}
      </div>
    );
  }

  if (options.layout === "board") {
    return (
      <BoardView
        tasks={flat}
        projectId={resolvedProjectId}
        sections={options.grouping === "none" ? sections ?? [] : []}
        projectNames={projectNames}
      />
    );
  }

  if (options.layout === "calendar") {
    return <CalendarView tasks={flat} />;
  }

  // List layout
  if (options.grouping === "none" && sections && sections.length > 0) {
    const unsectioned = flat.filter((t) => !t.section_id);
    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <SectionHeader section={section} />
            <TaskList
              tasks={flat.filter((t) => t.section_id === section.id)}
              projectId={projectId ?? section.project_id}
              sectionId={section.id}
            />
          </div>
        ))}
        {unsectioned.length > 0 && (
          <TaskList
            tasks={unsectioned}
            projectId={projectId ?? resolvedProjectId}
          />
        )}
        {footer}
      </div>
    );
  }

  if (options.grouping !== "none") {
    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.id}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title} ({group.tasks.length})
            </h2>
            <TaskList
              tasks={group.tasks}
              projectId={
                projectId ?? group.tasks[0]?.project_id ?? resolvedProjectId
              }
            />
          </div>
        ))}
        {footer}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TaskList tasks={flat} projectId={resolvedProjectId} />
      {footer}
    </div>
  );
}
