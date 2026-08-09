"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types/database";

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getInboxProject(): Promise<Project | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_inbox", true)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    // maybeSingle: a missing id should resolve to null (our `| null`
    // contract) instead of throwing PGRST116.
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProject(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const parentId = formData.get("parent_id") as string | null;
  const color = (formData.get("color") as string) || "#246fe0";
  const icon = formData.get("icon") as string | null;

  // Calculate sort order (place at end)
  const { data: lastProject } = await supabase
    .from("projects")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = lastProject && lastProject.length > 0
    ? lastProject[0].sort_order + 65536
    : 65536;

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name,
    parent_id: parentId || null,
    color,
    icon,
    sort_order: sortOrder,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, "name" | "description" | "color" | "icon" | "view_style" | "is_favorite" | "is_archived">>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath(`/project/${id}`, "page");
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function reorderProjects(
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("projects")
      .update({ sort_order: (index + 1) * 65536 })
      .eq("id", id)
      .eq("user_id", user.id)
  );

  await Promise.all(updates);
  revalidatePath("/");
}

export async function createInboxProject(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if inbox already exists
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_inbox", true)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    name: "Inbox",
    is_inbox: true,
    sort_order: 0,
    icon: "📥",
  });

  if (error) throw error;
  revalidatePath("/");
}
