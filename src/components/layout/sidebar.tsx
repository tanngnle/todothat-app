import { getProjects, getInboxProject } from "@/actions/projects";
import { SidebarClient } from "./sidebar-client";
import type { Project } from "@/types/database";

interface ProjectTreeNode extends Project {
  children: ProjectTreeNode[];
}

export async function Sidebar() {
  let projects: Project[] = [];
  let inbox: Project | null = null;

  try {
    [projects, inbox] = await Promise.all([
      getProjects(),
      getInboxProject(),
    ]);
  } catch {
    // If data fetch fails, show empty sidebar
  }

  // Build project tree from flat list
  const rootProjects = projects.filter((p) => !p.parent_id);
  const getChildProjects = (parentId: string): ProjectTreeNode[] =>
    projects
      .filter((p) => p.parent_id === parentId)
      .map((p) => ({
        ...p,
        children: getChildProjects(p.id),
      }));

  const projectTree: ProjectTreeNode[] = rootProjects.map((p) => ({
    ...p,
    children: getChildProjects(p.id),
  }));

  return <SidebarClient projectTree={projectTree} inbox={inbox} />;
}
