// Recurring task engine
// Handles creating next occurrence when a recurring task is completed

import { addDays, addWeeks, addMonths, addYears, parse, isValid } from "date-fns";

export interface RecurrenceConfig {
  rule: string; // "every day", "every weekday", "every week", "every month", "every year", "every N days"
  next_date?: string;
}

export function getNextDueDate(currentDate: string, rule: string): string | null {
  const date = parse(currentDate, "yyyy-MM-dd", new Date());
  if (!isValid(date)) return null;

  const ruleLower = rule.toLowerCase().trim();

  // "every day"
  if (ruleLower === "every day") {
    return formatNextDate(addDays(date, 1));
  }

  // "every weekday" (Mon-Fri)
  if (ruleLower === "every weekday") {
    let next = addDays(date, 1);
    const day = next.getDay();
    if (day === 6) next = addDays(next, 2); // Skip Saturday -> Monday
    if (day === 0) next = addDays(next, 1); // Skip Sunday -> Monday
    return formatNextDate(next);
  }

  // "every week" or "every N weeks"
  if (ruleLower.startsWith("every")) {
    const weekMatch = ruleLower.match(/every\s+(\d+)\s*weeks?/);
    if (weekMatch) {
      const weeks = parseInt(weekMatch[1]);
      return formatNextDate(addWeeks(date, weeks));
    }
    if (ruleLower === "every week") {
      return formatNextDate(addWeeks(date, 1));
    }

    // "every month" or "every N months"
    const monthMatch = ruleLower.match(/every\s+(\d+)\s*months?/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1]);
      return formatNextDate(addMonths(date, months));
    }
    if (ruleLower === "every month") {
      return formatNextDate(addMonths(date, 1));
    }

    // "every year" or "every N years"
    const yearMatch = ruleLower.match(/every\s+(\d+)\s*years?/);
    if (yearMatch) {
      const years = parseInt(yearMatch[1]);
      return formatNextDate(addYears(date, years));
    }
    if (ruleLower === "every year") {
      return formatNextDate(addYears(date, 1));
    }

    // "every N days"
    const dayMatch = ruleLower.match(/every\s+(\d+)\s*days?/);
    if (dayMatch) {
      const days = parseInt(dayMatch[1]);
      return formatNextDate(addDays(date, days));
    }
  }

  return null;
}

function formatNextDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseRecurrenceRule(rule: string): RecurrenceConfig {
  return {
    rule,
    next_date: undefined,
  };
}

export function shouldCreateNextOccurrence(task: {
  recurrence: RecurrenceConfig | null;
  is_completed: boolean;
}): boolean {
  return task.is_completed && task.recurrence !== null;
}
