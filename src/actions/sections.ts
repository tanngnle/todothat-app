"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Section } from "@/types/database";

export async function getSections(projectId: string): Promise<Section[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createSection(
  projectId: string,
  name: string,
  description?: string
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Calculate sort order
  const { data: lastSection } = await supabase
    .from("sections")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = lastSection && lastSection.length > 0
    ? lastSection[0].sort_order + 65536
    : 65536;

  const { error } = await supabase.from("sections").insert({
    project_id: projectId,
    name,
    description: description || null,
    sort_order: sortOrder,
  });

  if (error) throw error;
  revalidatePath(`/project/${projectId}`, "page");
}

export async function updateSection(
  id: string,
  updates: Partial<Pick<Section, "name" | "description">>
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sections")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteSection(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sections")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}
