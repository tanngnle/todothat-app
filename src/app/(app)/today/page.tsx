import { getTodayTasks } from "@/actions/tasks";
import { TodayContent } from "@/components/tasks/today-content";
import { Calendar } from "lucide-react";
import { isPast, parseISO, isToday } from "date-fns";

export default async function TodayPage() {
  const tasks = await getTodayTasks();

  const today = new Date();
  const formatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Group tasks: overdue vs today
  const overdue = tasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
  const todayTasks = tasks.filter((t) => !t.due_date || isToday(parseISO(t.due_date)));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Today</h1>
        <p className="text-sm text-muted-foreground">{formatted}</p>
      </div>

      <TodayContent
        tasks={tasks}
        overdue={overdue}
        todayTasks={todayTasks}
      />
    </div>
  );
}
