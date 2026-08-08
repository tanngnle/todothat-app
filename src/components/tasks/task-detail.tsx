"use client";

import { useState } from "react";
import { X, MessageSquare, Send, Calendar, Flag, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Task, Comment } from "@/types/database";
import { addComment, deleteComment } from "@/actions/comments";
import { updateTask } from "@/actions/tasks";

interface TaskDetailProps {
  task: Task;
  comments: Comment[];
  onClose: () => void;
}

const priorityOptions: Array<{ value: 1 | 2 | 3 | 4; label: string; className: string }> = [
  { value: 1, label: "P1", className: "data-[active=true]:bg-red-100 data-[active=true]:text-red-700 data-[active=true]:border-red-300 dark:data-[active=true]:bg-red-950 dark:data-[active=true]:text-red-300" },
  { value: 2, label: "P2", className: "data-[active=true]:bg-orange-100 data-[active=true]:text-orange-700 data-[active=true]:border-orange-300 dark:data-[active=true]:bg-orange-950 dark:data-[active=true]:text-orange-300" },
  { value: 3, label: "P3", className: "data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 data-[active=true]:border-blue-300 dark:data-[active=true]:bg-blue-950 dark:data-[active=true]:text-blue-300" },
  { value: 4, label: "P4", className: "data-[active=true]:bg-gray-200 data-[active=true]:text-gray-700 data-[active=true]:border-gray-300 dark:data-[active=true]:bg-gray-800 dark:data-[active=true]:text-gray-300" },
];

export function TaskDetail({ task: initialTask, comments: initialComments, onClose }: TaskDetailProps) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialTask.content);
  const [editDescription, setEditDescription] = useState(initialTask.description || "");
  const [newLabel, setNewLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const formData = new FormData();
    formData.set("task_id", task.id);
    formData.set("content", newComment.trim());

    await addComment(formData);
    setNewComment("");
    // Refresh comments
    const { getComments } = await import("@/actions/comments");
    const updated = await getComments(task.id);
    setComments(updated);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    setComments(comments.filter((c) => c.id !== commentId));
  };

  const startEdit = () => {
    setEditContent(task.content);
    setEditDescription(task.description || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await updateTask(task.id, {
        content: trimmed,
        description: editDescription.trim(),
      });
      setTask((prev) => ({ ...prev, content: trimmed, description: editDescription.trim() }));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDueDate = async (dueDate: string) => {
    await updateTask(task.id, { due_date: dueDate || null });
    setTask((prev) => ({ ...prev, due_date: dueDate || null }));
  };

  const handleSavePriority = async (priority: 1 | 2 | 3 | 4) => {
    await updateTask(task.id, { priority });
    setTask((prev) => ({ ...prev, priority }));
  };

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim().toLowerCase();
    if (!label || task.labels?.includes(label)) {
      setNewLabel("");
      return;
    }
    const labels = [...(task.labels || []), label];
    await updateTask(task.id, { labels });
    setTask((prev) => ({ ...prev, labels }));
    setNewLabel("");
  };

  const handleRemoveLabel = async (label: string) => {
    const labels = (task.labels || []).filter((l) => l !== label);
    await updateTask(task.id, { labels });
    setTask((prev) => ({ ...prev, labels }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-background border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Task Details</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Content */}
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Task name"
                className="text-lg"
                disabled={isSaving}
              />
              <Textarea
                value={editDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)}
                placeholder="Add a description"
                rows={4}
                disabled={isSaving}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || isSaving}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-medium">{task.content}</h3>
              {task.description ? (
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground/60">Add a description</p>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={startEdit}
              >
                Edit
              </Button>
            </div>
          )}

          {/* Deadline */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" />
              Deadline
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={task.due_date || ""}
                onChange={(e) => handleSaveDueDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {task.due_date && (
                <Button size="sm" variant="ghost" onClick={() => handleSaveDueDate("")}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Flag className="h-4 w-4" />
              Priority
            </label>
            <div className="flex gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-active={task.priority === option.value}
                  onClick={() => handleSavePriority(option.value)}
                  className={cn(
                    "rounded-md border px-3 py-1 text-sm font-medium transition-colors hover:bg-accent",
                    option.className
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels / Tags */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4" />
              Labels
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {(task.labels || []).map((label) => (
                <span
                  key={label}
                  className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(label)}
                    className="rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                    aria-label={`Remove label ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <form onSubmit={handleAddLabel}>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Add a label..."
                  className="w-32 rounded border border-dashed border-input bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </form>
            </div>
          </div>

          {/* Task Meta */}
          {task.recurrence && (
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded bg-purple-100 px-2 py-1 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                Recurring: {(task.recurrence as any).rule}
              </span>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </h4>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded border bg-muted/50 p-3 group"
                  >
                    <p className="text-sm">{comment.content}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
