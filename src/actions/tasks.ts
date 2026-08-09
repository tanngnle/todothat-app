"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/types/database";

export async function getTasks(
  projectId?: string,
  sectionId?: string,
  includeCompleted = false
): Promise<Task[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  if (!includeCompleted) {
    query = query.eq("is_completed", false);
  }

  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  if (sectionId) {
    query = query.eq("section_id", sectionId);
  } else if (projectId) {
    // Include tasks with no section (in the project but not in a section)
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getSubTasks(parentId: string): Promise<Task[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("parent_id", parentId)
    .eq("is_completed", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTodayTasks(includeCompleted = false): Promise<Task[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .or(`due_date.eq.${today},due_date.lt.${today}`)
    .order("due_date", { ascending: true })
    .order("sort_order", { ascending: true });

  if (!includeCompleted) {
    query = query.eq("is_completed", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getUpcomingTasks(includeCompleted = false): Promise<Task[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .gte("due_date", today)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .order("sort_order", { ascending: true });

  if (!includeCompleted) {
    query = query.eq("is_completed", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTask(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const content = formData.get("content") as string;
  const projectId = formData.get("project_id") as string;
  const sectionId = formData.get("section_id") as string | null;
  const parentId = formData.get("parent_id") as string | null;
  const priority = parseInt(formData.get("priority") as string) || 1;
  const dueDate = formData.get("due_date") as string | null;
  const description = (formData.get("description") as string) || "";

  // Calculate sort order
  const { data: lastTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = lastTask && lastTask.length > 0
    ? lastTask[0].sort_order + 65536
    : 65536;

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    content,
    project_id: projectId,
    section_id: sectionId || null,
    parent_id: parentId || null,
    priority,
    due_date: dueDate || null,
    description,
    sort_order: sortOrder,
  });

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, "content" | "description" | "priority" | "due_date" | "due_time" | "project_id" | "section_id" | "labels" | "recurrence">>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function toggleTaskComplete(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get current task state with recurrence info
  const { data: task } = await supabase
    .from("tasks")
    .select("is_completed, recurrence, due_date, project_id, section_id, content, description, priority, labels")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!task) throw new Error("Task not found");

  const completing = !task.is_completed;

  const { error } = await supabase
    .from("tasks")
    .update({
      is_completed: completing,
      completed_at: completing ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  // If completing a recurring task, create next occurrence
  if (completing && task.recurrence) {
    const recurrence = task.recurrence as { rule: string };
    const { getNextDueDate } = await import("@/lib/utils/recurrence");
    const nextDate = task.due_date ? getNextDueDate(task.due_date, recurrence.rule) : null;

    if (nextDate) {
      await supabase.from("tasks").insert({
        user_id: user.id,
        project_id: task.project_id,
        section_id: task.section_id,
        content: task.content,
        description: task.description || "",
        priority: task.priority,
        due_date: nextDate,
        recurrence: task.recurrence,
        labels: task.labels || [],
        sort_order: 65536,
      });
    }
  }

  revalidatePath("/", "layout");
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function reorderTasks(
  projectId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("tasks")
      .update({ sort_order: (index + 1) * 65536 })
      .eq("id", id)
      .eq("user_id", user.id)
  );

  await Promise.all(updates);
  revalidatePath("/", "layout");
}
