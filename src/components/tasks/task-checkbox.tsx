"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface TaskCheckboxProps {
  isCompleted: boolean;
  priority: 1 | 2 | 3 | 4;
  onToggle: () => void;
}

const priorityColors = {
  1: "text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-950",
  2: "text-orange-500 border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950",
  3: "text-blue-500 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950",
  4: "text-gray-400 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900",
};

export function TaskCheckbox({ isCompleted, priority, onToggle }: TaskCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        isCompleted
          ? "border-green-500 bg-green-500 text-white"
          : priorityColors[priority]
      )}
      aria-label={isCompleted ? "Mark as not completed" : "Mark as completed"}
    >
      {isCompleted && <Check className="h-3 w-3" />}
    </button>
  );
}
