"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Comment } from "@/types/database";

export async function getComments(taskId: string): Promise<Comment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addComment(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const taskId = formData.get("task_id") as string;
  const content = formData.get("content") as string;

  const { error } = await supabase.from("comments").insert({
    task_id: taskId,
    content,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}
