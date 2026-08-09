import { getUpcomingTasks } from "@/actions/tasks";
import { getProjects } from "@/actions/projects";
import { UpcomingContent } from "@/components/tasks/upcoming-content";

export default async function UpcomingPage() {
  const tasks = await getUpcomingTasks(true);
  const projects = await getProjects();
  const projectNames = Object.fromEntries(
    projects.map((p) => [p.id, p.name])
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Upcoming</h1>
        <p className="text-sm text-muted-foreground">
          View your scheduled tasks by date
        </p>
      </div>

      <UpcomingContent tasks={tasks} projectNames={projectNames} />
    </div>
  );
}
