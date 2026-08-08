"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Person } from "@/types/database";

export async function getPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createPerson(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("people").insert({
    user_id: user.id,
    name: formData.get("name") as string,
    relationship: (formData.get("relationship") as string) || null,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function deletePerson(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}
