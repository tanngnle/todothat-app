"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTask } from "@/actions/tasks";
import { ensureInboxProject } from "@/actions/projects";

interface QuickAddProps {
  projectId?: string;
  onClose?: () => void;
}

export function QuickAdd({ projectId, onClose }: QuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Listen for 'q' key to open
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "q" && !isOpen) {
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setContent("");
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // No explicit project (e.g. global FAB) → resolve the real Inbox
      // project, auto-creating it on fresh databases.
      const resolvedProjectId = projectId ?? (await ensureInboxProject());

      const formData = new FormData();
      formData.set("content", content.trim());
      formData.set("project_id", resolvedProjectId);
      formData.set("priority", "1");

      await createTask(formData);
      setContent("");
      setIsOpen(false);
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors z-50"
        aria-label="Quick add task"
      >
        <Plus className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background border shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Add Task</h3>
          <button
            onClick={() => {
              setIsOpen(false);
              setContent("");
              onClose?.();
            }}
            className="rounded p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Task name..."
            className="text-lg border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
            disabled={isSubmitting}
          />

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to add, <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Esc</kbd> to cancel
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setContent("");
                  onClose?.();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!content.trim() || isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
