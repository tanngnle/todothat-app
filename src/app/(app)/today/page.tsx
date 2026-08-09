import { getTodayTasks } from "@/actions/tasks";
import { getProjects } from "@/actions/projects";
import { TodayContent } from "@/components/tasks/today-content";

export default async function TodayPage() {
  const tasks = await getTodayTasks(true);
  const projects = await getProjects();
  const projectNames = Object.fromEntries(
    projects.map((p) => [p.id, p.name])
  );

  const today = new Date();
  const formatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Today</h1>
        <p className="text-sm text-muted-foreground">{formatted}</p>
      </div>

      <TodayContent tasks={tasks} projectNames={projectNames} />
    </div>
  );
}
