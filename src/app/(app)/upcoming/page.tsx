import { getUpcomingTasks } from "@/actions/tasks";
import { UpcomingContent } from "@/components/tasks/upcoming-content";
import { CalendarDays } from "lucide-react";

export default async function UpcomingPage() {
  const tasks = await getUpcomingTasks();

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
