import { getUpcomingTasks } from "@/actions/tasks";
import { UpcomingContent } from "@/components/tasks/upcoming-content";
import { CalendarDays } from "lucide-react";
import type { Task } from "@/types/database";

export default async function UpcomingPage() {
  // A fetch failure should render the empty page, not a 500.
  let tasks: Task[] = [];
  try {
    tasks = await getUpcomingTasks();
  } catch {
    // Missing DB / fetch error: render with an empty task list.
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Upcoming</h1>
        <p className="text-sm text-muted-foreground">
          View your scheduled tasks by date
        </p>
      </div>

      <UpcomingContent tasks={tasks} />
    </div>
  );
}
