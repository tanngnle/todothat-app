import { Task } from "@/types/database";
import {
  GroupingOption,
  SortingOption,
  DateFilter,
  PriorityFilter,
} from "@/components/providers/display-provider";
import { isToday, isTomorrow, isPast, isThisWeek, parseISO, addDays, endOfWeek } from "date-fns";

export interface TaskGroup {
  id: string;
  title: string;
  tasks: Task[];
}

/**
 * Apply filters to tasks
 */
export function applyFilters(
  tasks: Task[],
  dateFilter: DateFilter,
  priorityFilter: PriorityFilter,
  showCompleted: boolean
): Task[] {
  let filtered = tasks;

  // Date filter
  if (dateFilter !== "all") {
    filtered = filtered.filter((task) => {
      if (!task.due_date) {
        return dateFilter === "no_date";
      }

      const dueDate = parseISO(task.due_date);

      switch (dateFilter) {
        case "today":
          return isToday(dueDate);
        case "overdue":
          return isPast(dueDate) && !isToday(dueDate);
        case "this_week":
          return isThisWeek(dueDate);
        case "next_week": {
          const today = new Date();
          const nextWeekStart = addDays(endOfWeek(today), 1);
          const nextWeekEnd = addDays(nextWeekStart, 6);
          return dueDate >= nextWeekStart && dueDate <= nextWeekEnd;
        }
        case "no_date":
          return false;
        default:
          return true;
      }
    });
  }

  // Priority filter
  if (priorityFilter !== "all") {
    const priorityMap: Record<string, number> = {
      p1: 1,
      p2: 2,
      p3: 3,
      p4: 4,
    };
    const targetPriority = priorityMap[priorityFilter];
    filtered = filtered.filter((task) => task.priority === targetPriority);
  }

  // Show completed filter
  if (!showCompleted) {
    filtered = filtered.filter((task) => !task.is_completed);
  }

  return filtered;
}

/**
 * Sort tasks based on sorting option
 */
export function sortTasks(tasks: Task[], sorting: SortingOption): Task[] {
  const sorted = [...tasks];

  switch (sorting) {
    case "due_date":
      return sorted.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });

    case "priority":
      return sorted.sort((a, b) => a.priority - b.priority);

    case "alphabetical":
      return sorted.sort((a, b) => a.content.localeCompare(b.content));

    case "created_date":
      return sorted.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    case "manual":
    default:
      return sorted.sort((a, b) => a.sort_order - b.sort_order);
  }
}

/**
 * Group tasks based on grouping option
 */
export function groupTasks(
  tasks: Task[],
  grouping: GroupingOption,
  projectNames?: Record<string, string>
): TaskGroup[] {
  switch (grouping) {
    case "priority": {
      const groups: TaskGroup[] = [
        { id: "p1", title: "P1 - Urgent", tasks: [] },
        { id: "p2", title: "P2 - High", tasks: [] },
        { id: "p3", title: "P3 - Medium", tasks: [] },
        { id: "p4", title: "P4 - Low", tasks: [] },
      ];

      tasks.forEach((task) => {
        const group = groups.find((g) => g.id === `p${task.priority}`);
        if (group) {
          group.tasks.push(task);
        }
      });

      return groups.filter((g) => g.tasks.length > 0);
    }

    case "due_date": {
      const groups: TaskGroup[] = [
        { id: "overdue", title: "Overdue", tasks: [] },
        { id: "today", title: "Today", tasks: [] },
        { id: "tomorrow", title: "Tomorrow", tasks: [] },
        { id: "this_week", title: "This Week", tasks: [] },
        { id: "later", title: "Later", tasks: [] },
        { id: "no_date", title: "No Date", tasks: [] },
      ];

      tasks.forEach((task) => {
        if (!task.due_date) {
          groups.find((g) => g.id === "no_date")?.tasks.push(task);
          return;
        }

        const dueDate = parseISO(task.due_date);

        if (isPast(dueDate) && !isToday(dueDate)) {
          groups.find((g) => g.id === "overdue")?.tasks.push(task);
        } else if (isToday(dueDate)) {
          groups.find((g) => g.id === "today")?.tasks.push(task);
        } else if (isTomorrow(dueDate)) {
          groups.find((g) => g.id === "tomorrow")?.tasks.push(task);
        } else if (isThisWeek(dueDate)) {
          groups.find((g) => g.id === "this_week")?.tasks.push(task);
        } else {
          groups.find((g) => g.id === "later")?.tasks.push(task);
        }
      });

      return groups.filter((g) => g.tasks.length > 0);
    }

    case "label": {
      const labelMap = new Map<string, Task[]>();

      tasks.forEach((task) => {
        if (task.labels && task.labels.length > 0) {
          task.labels.forEach((label) => {
            if (!labelMap.has(label)) {
              labelMap.set(label, []);
            }
            labelMap.get(label)!.push(task);
          });
        } else {
          if (!labelMap.has("No Label")) {
            labelMap.set("No Label", []);
          }
          labelMap.get("No Label")!.push(task);
        }
      });

      return Array.from(labelMap.entries()).map(([label, tasks]) => ({
        id: label,
        title: label,
        tasks,
      }));
    }

    case "project": {
      const projectMap = new Map<string, Task[]>();

      tasks.forEach((task) => {
        const projectId = task.project_id || "unknown";
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, []);
        }
        projectMap.get(projectId)!.push(task);
      });

      return Array.from(projectMap.entries()).map(([projectId, tasks]) => ({
        id: projectId,
        title: projectNames?.[projectId] ?? "Unknown project",
        tasks,
      }));
    }

    case "none":
    default:
      return [{ id: "all", title: "All Tasks", tasks }];
  }
}

/**
 * Apply all display options to tasks
 */
export function applyDisplayOptions(
  tasks: Task[],
  options: {
    grouping: GroupingOption;
    sorting: SortingOption;
    dateFilter: DateFilter;
    priorityFilter: PriorityFilter;
    showCompleted: boolean;
    projectNames?: Record<string, string>;
  }
): TaskGroup[] {
  // First apply filters
  const filtered = applyFilters(
    tasks,
    options.dateFilter,
    options.priorityFilter,
    options.showCompleted
  );

  // Then sort
  const sorted = sortTasks(filtered, options.sorting);

  // Finally group
  return groupTasks(sorted, options.grouping, options.projectNames);
}

/**
 * Flatten grouped tasks back into a single list
 */
export function flattenGroups(groups: TaskGroup[]): Task[] {
  return groups.flatMap((g) => g.tasks);
}
