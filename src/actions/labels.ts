"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Label, Task } from "@/types/database";

export async function getLabels(): Promise<Label[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("labels")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getLabel(id: string): Promise<Label | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("labels")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function createLabel(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#246fe0";

  const { data: lastLabel } = await supabase
    .from("labels")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = lastLabel && lastLabel.length > 0
    ? lastLabel[0].sort_order + 65536
    : 65536;

  const { error } = await supabase.from("labels").insert({
    user_id: user.id,
    name,
    color,
    sort_order: sortOrder,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateLabel(
  id: string,
  updates: Partial<Pick<Label, "name" | "color" | "is_favorite">>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("labels")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteLabel(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("labels")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function getTasksByLabel(labelName: string, includeCompleted = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (!includeCompleted) {
    query = query.eq("is_completed", false);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Filter tasks that contain the label
  return (data || []).filter((task: Task) =>
    task.labels?.includes(labelName)
  );
}
