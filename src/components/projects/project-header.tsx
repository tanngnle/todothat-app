"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/types/database";
import { updateProject } from "@/actions/projects";

interface ProjectHeaderProps {
  project: Project;
}

export function ProjectHeader({ project: initialProject }: ProjectHeaderProps) {
  const [project, setProject] = useState(initialProject);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [nameValue, setNameValue] = useState(initialProject.name);
  const [descriptionValue, setDescriptionValue] = useState(initialProject.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDescription) descriptionRef.current?.focus();
  }, [isEditingDescription]);

  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === project.name) {
      setNameValue(project.name);
      setIsEditingName(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProject(project.id, { name: trimmed });
      setProject((prev) => ({ ...prev, name: trimmed }));
    } finally {
      setIsSaving(false);
      setIsEditingName(false);
    }
  };

  const saveDescription = async () => {
    const trimmed = descriptionValue.trim();
    if (trimmed === (project.description || "")) {
      setIsEditingDescription(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProject(project.id, { description: trimmed || null });
      setProject((prev) => ({ ...prev, description: trimmed || null }));
    } finally {
      setIsSaving(false);
      setIsEditingDescription(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        {project.icon && <span className="text-2xl">{project.icon}</span>}

        {isEditingName ? (
          <Input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setNameValue(project.name);
                setIsEditingName(false);
              }
            }}
            className="max-w-md text-2xl font-bold h-auto py-1"
            disabled={isSaving}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="group flex items-center gap-2 rounded px-1 text-left text-2xl font-bold text-foreground hover:bg-accent/50"
            title="Edit project name"
          >
            {project.name}
            <Pencil className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </div>

      {/* Description */}
      <div className="mt-2 pl-0.5">
        {isEditingDescription ? (
          <div className="max-w-xl space-y-2">
            <Textarea
              ref={descriptionRef}
              value={descriptionValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescriptionValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveDescription();
                if (e.key === "Escape") {
                  setDescriptionValue(project.description || "");
                  setIsEditingDescription(false);
                }
              }}
              placeholder="Add a description"
              rows={3}
              disabled={isSaving}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveDescription} disabled={isSaving}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDescriptionValue(project.description || "");
                  setIsEditingDescription(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : project.description ? (
          <button
            type="button"
            onClick={() => setIsEditingDescription(true)}
            className="max-w-xl rounded px-1 text-left text-sm text-muted-foreground whitespace-pre-wrap hover:bg-accent/50"
            title="Edit description"
          >
            {project.description}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingDescription(true)}
            className="rounded px-1 text-sm text-muted-foreground/70 hover:bg-accent/50 hover:text-muted-foreground"
          >
            Add a description
          </button>
        )}
      </div>
    </div>
  );
}
