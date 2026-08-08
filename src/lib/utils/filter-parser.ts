// Filter query parser - parses Todoist-style filter syntax
// Supports: today, overdue, p1-p4, @label, #project, & (and), | (or)

export interface FilterCondition {
  type: "date" | "priority" | "label" | "project" | "completed";
  value: string;
  operator: "eq" | "neq";
}

export interface ParsedFilter {
  conditions: FilterCondition[];
  operator: "and" | "or";
}

export function parseFilterQuery(query: string): ParsedFilter {
  const trimmed = query.trim().toLowerCase();

  // Check for OR operator
  if (trimmed.includes("|")) {
    const parts = trimmed.split("|").map((p) => p.trim());
    return {
      operator: "or",
      conditions: parts.flatMap((part) => parseSimpleQuery(part)),
    };
  }

  // Default to AND
  const parts = trimmed.includes("&")
    ? trimmed.split("&").map((p) => p.trim())
    : [trimmed];

  return {
    operator: "and",
    conditions: parts.flatMap((part) => parseSimpleQuery(part)),
  };
}

function parseSimpleQuery(query: string): FilterCondition[] {
  const conditions: FilterCondition[] = [];
  const trimmed = query.trim().toLowerCase();

  // Date filters
  if (trimmed === "today") {
    conditions.push({ type: "date", value: "today", operator: "eq" });
  } else if (trimmed === "overdue") {
    conditions.push({ type: "date", value: "overdue", operator: "eq" });
  } else if (trimmed === "no date") {
    conditions.push({ type: "date", value: "no_date", operator: "eq" });
  } else if (trimmed === "this week") {
    conditions.push({ type: "date", value: "this_week", operator: "eq" });
  } else if (trimmed === "next week") {
    conditions.push({ type: "date", value: "next_week", operator: "eq" });
  }

  // Priority filters
  if (/^p[1-4]$/.test(trimmed)) {
    const priority = parseInt(trimmed[1]);
    conditions.push({ type: "priority", value: String(priority), operator: "eq" });
  }

  // Label filter: @labelname
  if (trimmed.startsWith("@")) {
    const labelName = trimmed.slice(1);
    conditions.push({ type: "label", value: labelName, operator: "eq" });
  }

  // Project filter: #projectname
  if (trimmed.startsWith("#")) {
    const projectName = trimmed.slice(1);
    conditions.push({ type: "project", value: projectName, operator: "eq" });
  }

  return conditions;
}

export function matchesFilter(
  task: {
    due_date?: string | null;
    priority?: number;
    labels?: string[];
    project_name?: string;
    is_completed?: boolean;
  },
  condition: FilterCondition,
  today: string
): boolean {
  const { type, value, operator } = condition;

  let matches = false;

  switch (type) {
    case "date":
      if (value === "today") {
        matches = task.due_date === today;
      } else if (value === "overdue") {
        matches = task.due_date != null && task.due_date < today && !task.is_completed;
      } else if (value === "no_date") {
        matches = !task.due_date;
      } else if (value === "this_week") {
        // This week: from Monday to Sunday of current week
        const todayDate = new Date(today);
        const dayOfWeek = todayDate.getDay(); // 0=Sunday, 1=Monday, ...
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(todayDate);
        monday.setDate(todayDate.getDate() - mondayOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const mondayStr = monday.toISOString().split("T")[0];
        const sundayStr = sunday.toISOString().split("T")[0];
        matches = task.due_date != null && task.due_date >= mondayStr && task.due_date <= sundayStr;
      } else if (value === "next_week") {
        const todayDate = new Date(today);
        const dayOfWeek = todayDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const nextMonday = new Date(todayDate);
        nextMonday.setDate(todayDate.getDate() + (7 - mondayOffset));
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);
        const nextMondayStr = nextMonday.toISOString().split("T")[0];
        const nextSundayStr = nextSunday.toISOString().split("T")[0];
        matches = task.due_date != null && task.due_date >= nextMondayStr && task.due_date <= nextSundayStr;
      }
      break;

    case "priority":
      matches = task.priority === parseInt(value);
      break;

    case "label":
      matches = task.labels?.includes(value) ?? false;
      break;

    case "project":
      matches = task.project_name?.toLowerCase() === value.toLowerCase();
      break;

    case "completed":
      matches = task.is_completed === (value === "true");
      break;
  }

  return operator === "neq" ? !matches : matches;
}

export function applyFilter(
  tasks: any[],
  filter: ParsedFilter,
  today: string
): any[] {
  return tasks.filter((task) => {
    const results = filter.conditions.map((condition) =>
      matchesFilter(task, condition, today)
    );

    if (filter.operator === "or") {
      return results.some((r) => r);
    }
    return results.every((r) => r);
  });
}
