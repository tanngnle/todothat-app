"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { personSchema } from "@/lib/finance/schemas";
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

export async function createPerson(formData: FormData): Promise<Person> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  if (raw.relationship === "") raw.relationship = null;

  const parsed = personSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const { data: person, error } = await supabase
    .from("people")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      relationship: parsed.data.relationship ?? null,
      // Explicit: don't rely on the DB/mock column default — read paths
      // filter is_active = true, so a missing value hides the new row.
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/expenses");
  return person as Person;
}

export async function deletePerson(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses");
}

export async function updatePerson(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  if (raw.relationship === "") raw.relationship = null;

  const parsed = personSchema.partial().safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.relationship !== undefined) updates.relationship = parsed.data.relationship;
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = String(isActive) === "true";

  const { error } = await supabase
    .from("people")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses");
}
