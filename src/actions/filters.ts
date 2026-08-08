"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Filter } from "@/types/database";

export async function getFilters(): Promise<Filter[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("filters")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getFilter(id: string): Promise<Filter | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("filters")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function createFilter(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const query = formData.get("query") as string;
  const color = (formData.get("color") as string) || "#246fe0";

  const { data: lastFilter } = await supabase
    .from("filters")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = lastFilter && lastFilter.length > 0
    ? lastFilter[0].sort_order + 65536
    : 65536;

  const { error } = await supabase.from("filters").insert({
    user_id: user.id,
    name,
    query,
    color,
    sort_order: sortOrder,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateFilter(
  id: string,
  updates: Partial<Pick<Filter, "name" | "query" | "color" | "is_favorite">>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("filters")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteFilter(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("filters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}
