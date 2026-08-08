"use client";

import { useState } from "react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCheckbox } from "./task-checkbox";
import type { Task } from "@/types/database";
import { toggleTaskComplete } from "@/actions/tasks";

interface TaskItemProps {
  task: Task;
  onOpenDetail?: (task: Task) => void;
}

const priorityFlagColors = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-blue-500",
  4: "text-gray-400",
};

function formatDueDate(dateStr: string): { text: string; className: string } {
  const date = parseISO(dateStr);
  
  if (isToday(date)) {
    return { text: "Today", className: "text-green-600 dark:text-green-400" };
  }
  if (isTomorrow(date)) {
    return { text: "Tomorrow", className: "text-green-600 dark:text-green-400" };
  }
  if (isPast(date)) {
    return { text: format(date, "MMM d"), className: "text-red-500" };
  }
  return { text: format(date, "MMM d"), className: "text-muted-foreground" };
}

export function TaskItem({ task, onOpenDetail }: TaskItemProps) {
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async () => {
    setIsPending(true);
    try {
      await toggleTaskComplete(task.id);
    } finally {
      setIsPending(false);
    }
  };

  const dueDateInfo = task.due_date ? formatDueDate(task.due_date) : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50",
        task.is_completed && "opacity-60"
      )}
    >
      <div className="mt-0.5">
        <TaskCheckbox
          isCompleted={task.is_completed}
          priority={task.priority}
          onToggle={handleToggle}
        />
      </div>

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onOpenDetail?.(task)}
      >
        <p
          className={cn(
            "text-sm",
            task.is_completed && "line-through text-muted-foreground"
          )}
        >
          {task.content}
        </p>

        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {dueDateInfo && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                dueDateInfo.className
              )}
            >
              <Calendar className="h-3 w-3" />
              {dueDateInfo.text}
            </span>
          )}

          {task.priority > 1 && (
            <span className={cn("flex items-center gap-0.5 text-xs", priorityFlagColors[task.priority])}>
              <Flag className="h-3 w-3 fill-current" />
              P{task.priority}
            </span>
          )}

          {task.labels && task.labels.length > 0 && (
            <div className="flex gap-1">
              {task.labels.map((label) => (
                <span
                  key={label}
                  className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
