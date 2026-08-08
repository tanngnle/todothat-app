"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/types/database";

export async function getCategories(): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCategory(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("expense_categories").insert({
    user_id: user.id,
    name: formData.get("name") as string,
    name_vi: formData.get("name_vi") as string || null,
    type: formData.get("type") as string,
    parent_id: (formData.get("parent_id") as string) || null,
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || null,
    sort_order: 65536,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<ExpenseCategory, "name" | "name_vi" | "icon" | "color" | "is_active">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}
