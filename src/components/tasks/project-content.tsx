"use client";

import { Task, Section } from "@/types/database";
import { TaskList } from "./task-list";
import { BoardView } from "./board-view";
import { CalendarView } from "./calendar-view";
import { SectionHeader } from "@/components/sections/section-header";
import { AddSectionForm } from "@/components/sections/add-section-form";
import { useDisplayOptions } from "@/components/providers/display-provider";
import { applyDisplayOptions } from "@/lib/utils/task-filters";

interface ProjectContentProps {
  projectId: string;
  tasks: Task[];
  sections: Section[];
}

export function ProjectContent({ projectId, tasks, sections }: ProjectContentProps) {
  const { options } = useDisplayOptions();

  // Apply filters, sorting, and grouping
  const taskGroups = applyDisplayOptions(tasks, {
    grouping: options.grouping,
    sorting: options.sorting,
    dateFilter: options.dateFilter,
    priorityFilter: options.priorityFilter,
    showCompleted: options.showCompleted,
  });

  if (options.layout === "board") {
    return <BoardView tasks={tasks} projectId={projectId} sections={sections} />;
  }

  if (options.layout === "calendar") {
    return <CalendarView tasks={tasks} />;
  }

  // Default: List view with grouping
  if (options.grouping === "none" && sections.length > 0) {
    // Group by sections when no explicit grouping
    return (
      <div className="space-y-6">
        {sections.map((section) => {
          const sectionTasks = taskGroups[0]?.tasks.filter((t) => t.section_id === section.id) || [];
          return (
            <div key={section.id}>
              <SectionHeader section={section} />
              <TaskList
                tasks={sectionTasks}
                projectId={projectId}
                sectionId={section.id}
              />
            </div>
          );
        })}

        {/* Tasks without a section */}
        {(() => {
          const noSectionTasks = taskGroups[0]?.tasks.filter((t) => !t.section_id) || [];
          if (noSectionTasks.length === 0) return null;
          return (
            <div>
              <TaskList tasks={noSectionTasks} projectId={projectId} />
            </div>
          );
        })()}

        {/* Add section */}
        <AddSectionForm projectId={projectId} />
      </div>
    );
  }

  // List view with no sections yet: show tasks + add-section entry point
  if (options.grouping === "none") {
    return (
      <div className="space-y-6">
        <TaskList tasks={taskGroups[0]?.tasks || []} projectId={projectId} />
        <AddSectionForm projectId={projectId} />
      </div>
    );
  }

  // Grouped view
  return (
    <div className="space-y-6">
      {taskGroups.map((group) => (
        <div key={group.id}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {group.title} ({group.tasks.length})
          </h2>
          <TaskList tasks={group.tasks} projectId={projectId} />
        </div>
      ))}

      {taskGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <h3 className="mb-1 text-lg font-medium">No tasks found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or add a new task.
          </p>
        </div>
      )}
    </div>
  );
}
