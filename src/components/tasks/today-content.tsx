"use client";

import { Task } from "@/types/database";
import { TaskList } from "./task-list";
import { BoardView } from "./board-view";
import { CalendarView } from "./calendar-view";
import { useDisplayOptions } from "@/components/providers/display-provider";
import { applyDisplayOptions } from "@/lib/utils/task-filters";
import { AlertCircle } from "lucide-react";

interface TodayContentProps {
  tasks: Task[];
  overdue: Task[];
  todayTasks: Task[];
}

export function TodayContent({ tasks, overdue, todayTasks }: TodayContentProps) {
  const { options } = useDisplayOptions();

  // Apply filters to all tasks
  const filteredTasks = applyDisplayOptions(tasks, {
    grouping: "none",
    sorting: options.sorting,
    dateFilter: options.dateFilter,
    priorityFilter: options.priorityFilter,
    showCompleted: options.showCompleted,
  });

  const allFilteredTasks = filteredTasks[0]?.tasks || [];

  if (allFilteredTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <div className="mb-4 text-6xl"></div>
        <h3 className="mb-1 text-lg font-medium">All done for today!</h3>
        <p className="text-sm text-muted-foreground">
          Enjoy the rest of your day.
        </p>
      </div>
    );
  }

  if (options.layout === "board") {
    return <BoardView tasks={allFilteredTasks} projectId={allFilteredTasks[0]?.project_id || ""} />;
  }

  if (options.layout === "calendar") {
    return <CalendarView tasks={allFilteredTasks} />;
  }

  // Default: List view
  return (
    <div className="space-y-6">
      {allFilteredTasks.map((task) => (
        <TaskList
          key={task.id}
          tasks={[task]}
          projectId={task.project_id}
        />
      ))}
    </div>
  );
}
