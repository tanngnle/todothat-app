import { getUpcomingTasks } from "@/actions/tasks";
import { getProjects } from "@/actions/projects";
import { UpcomingContent } from "@/components/tasks/upcoming-content";
import type { Project, Task } from "@/types/database";

export default async function UpcomingPage() {
  // A fetch failure should render the empty page, not a 500.
  let tasks: Task[] = [];
  let projects: Project[] = [];
  try {
    [tasks, projects] = await Promise.all([
      getUpcomingTasks(true),
      getProjects(),
    ]);
  } catch {
    // Missing DB / fetch error: render with empty data.
  }
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
