"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface SearchCommandProps {
  tasks?: Array<{ id: string; content: string; project_id: string }>;
  projects?: Array<{ id: string; name: string }>;
  labels?: Array<{ id: string; name: string }>;
}

export function SearchCommand({ tasks = [], projects = [], labels = [] }: SearchCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (event.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const filteredTasks = tasks.filter((t) =>
    t.content.toLowerCase().includes(query.toLowerCase())
  );
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredLabels = labels.filter((l) =>
    l.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (type: string, id: string) => {
    handleClose();
    if (type === "task") {
      // Navigate to the project containing this task
      const task = tasks.find((t) => t.id === id);
      if (task) router.push(`/project/${task.project_id}`);
    } else if (type === "project") {
      router.push(`/project/${id}`);
    } else if (type === "label") {
      router.push(`/labels`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-background border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, labels..."
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
          />
          <button onClick={handleClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredProjects.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Projects</p>
              {filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect("project", p.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="text-muted-foreground">#</span>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {filteredLabels.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Labels</p>
              {filteredLabels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleSelect("label", l.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="text-muted-foreground">@</span>
                  {l.name}
                </button>
              ))}
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Tasks</p>
              {filteredTasks.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect("task", t.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {t.content}
                </button>
              ))}
            </div>
          )}

          {query && filteredTasks.length === 0 && filteredProjects.length === 0 && filteredLabels.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </p>
          )}
        </div>

        <div className="border-t px-4 py-2">
          <p className="text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Cmd+K</kbd> to toggle
            <span className="mx-2">·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
