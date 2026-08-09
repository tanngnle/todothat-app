"use client";

import { useMemo } from "react";
import type { Task, Section } from "@/types/database";
import { TaskView } from "./task-view";
import { AddSectionForm } from "@/components/sections/add-section-form";

interface ProjectContentProps {
  projectId: string;
  tasks: Task[];
  sections: Section[];
  projectName?: string;
}

export function ProjectContent({
  projectId,
  tasks,
  sections,
  projectName,
}: ProjectContentProps) {
  const projectNames = useMemo(
    () => (projectName ? { [projectId]: projectName } : undefined),
    [projectId, projectName]
  );

  return (
    <TaskView
      tasks={tasks}
      projectId={projectId}
      sections={sections}
      projectNames={projectNames}
      footer={<AddSectionForm projectId={projectId} />}
    />
  );
}
