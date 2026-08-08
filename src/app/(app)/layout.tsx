import { Sidebar } from "@/components/layout/sidebar";
import { AppShell } from "@/components/layout/app-shell";
import { getTasks } from "@/actions/tasks";
import { getProjects } from "@/actions/projects";
import { getLabels } from "@/actions/labels";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fetch data for search command palette
  let tasks: any[] = [], projects: any[] = [], labels: any[] = [];
  try {
    [tasks, projects, labels] = await Promise.all([
      getTasks(),
      getProjects(),
      getLabels(),
    ]);
  } catch {
    // Silently fail if data fetch fails
  }

  const searchData = {
    tasks: tasks.map((t) => ({ id: t.id, content: t.content, project_id: t.project_id })),
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    labels: labels.map((l) => ({ id: l.id, name: l.name })),
  };

  return (
    <AppShell sidebar={<Sidebar />} searchData={searchData}>
      {children}
    </AppShell>
  );
}
