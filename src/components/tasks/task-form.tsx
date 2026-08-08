"use client";

import { useState } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "@/actions/tasks";

interface TaskFormProps {
  projectId: string;
  sectionId?: string;
  parentId?: string;
}

export function TaskForm({ projectId, sectionId, parentId }: TaskFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("content", content.trim());
      formData.set("project_id", projectId);
      if (sectionId) formData.set("section_id", sectionId);
      if (parentId) formData.set("parent_id", parentId);
      formData.set("priority", priority);
      if (dueDate) formData.set("due_date", dueDate);
      formData.set("description", description);

      await createTask(formData);

      // Reset form
      setContent("");
      setPriority("1");
      setDueDate("");
      setDescription("");
      setIsExpanded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add task..."
          className="border-0 p-0 shadow-none focus-visible:ring-0 h-auto text-sm"
          onFocus={() => setIsExpanded(true)}
        />
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="text-sm h-8"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs h-8 w-36"
            />

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">P4 - None</SelectItem>
                <SelectItem value="2">P3</SelectItem>
                <SelectItem value="3">P2</SelectItem>
                <SelectItem value="4">P1 - Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || isSubmitting}
            >
              Add task
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!isExpanded && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 text-xs text-muted-foreground"
          onClick={() => setIsExpanded(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add details
        </Button>
      )}
    </form>
  );
}
