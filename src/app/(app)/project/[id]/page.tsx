import { getProject } from "@/actions/projects";
import { getSections } from "@/actions/sections";
import { getTasks } from "@/actions/tasks";
import { ProjectContent } from "@/components/tasks/project-content";
import { ProjectHeader } from "@/components/projects/project-header";
import { notFound } from "next/navigation";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const sections = await getSections(id);
  const tasks = await getTasks(id, undefined, true);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Project Header (editable name + description) */}
      <ProjectHeader project={project} />

      {/* Dynamic Content based on Display options */}
      <ProjectContent
        projectId={id}
        tasks={tasks}
        sections={sections}
        projectName={project.name}
      />
    </div>
  );
}
