"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/finance/schemas";
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

/** Normalize empty FormData strings to null for nullable fields (uuid-or-null). */
function normalizeRaw(raw: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["name_vi", "parent_id", "icon", "color"]) {
    if (raw[key] === "") raw[key] = null;
  }
  return raw;
}

export async function createCategory(formData: FormData): Promise<ExpenseCategory> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = categorySchema.safeParse(normalizeRaw(Object.fromEntries(formData)));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const { data: category, error } = await supabase
    .from("expense_categories")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      name_vi: parsed.data.name_vi ?? null,
      type: parsed.data.type,
      parent_id: parsed.data.parent_id ?? null,
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
      sort_order: 65536,
      // Explicit: don't rely on the DB/mock column default — read paths
      // filter is_active = true, so a missing value hides the new row.
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/expenses");
  return category as ExpenseCategory;
}

export async function updateCategory(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = categorySchema
    .partial()
    .safeParse(normalizeRaw(Object.fromEntries(formData)));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = String(isActive) === "true";

  const { error } = await supabase
    .from("expense_categories")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses");
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses");
}
