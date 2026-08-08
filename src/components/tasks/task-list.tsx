"use client";

import { useState } from "react";
import { TaskItem } from "./task-item";
import { TaskForm } from "./task-form";
import { TaskDetail } from "./task-detail";
import { getComments } from "@/actions/comments";
import type { Task, Comment } from "@/types/database";

interface TaskListProps {
  tasks: Task[];
  projectId: string;
  sectionId?: string;
  emptyMessage?: string;
}

export function TaskList({ tasks, projectId, sectionId, emptyMessage }: TaskListProps) {
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailComments, setDetailComments] = useState<Comment[]>([]);

  const handleOpenDetail = async (task: Task) => {
    setDetailTask(task);
    setDetailComments([]);
    const comments = await getComments(task.id);
    setDetailComments(comments);
  };

  return (
    <div className="space-y-1">
      {tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {emptyMessage || "No tasks yet"}
        </p>
      ) : (
        tasks.map((task) => (
          <TaskItem key={task.id} task={task} onOpenDetail={handleOpenDetail} />
        ))
      )}

      <div className="mt-2">
        <TaskForm projectId={projectId} sectionId={sectionId} />
      </div>

      {detailTask && (
        <TaskDetail
          task={detailTask}
          comments={detailComments}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  );
}
