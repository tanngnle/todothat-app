"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Wallet } from "@/types/database";

export async function getWallets(): Promise<Wallet[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createWallet(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("wallets").insert({
    user_id: user.id,
    name: formData.get("name") as string,
    type: (formData.get("type") as string) || "cash",
    balance: BigInt(formData.get("balance") as string || "0"),
    color: (formData.get("color") as string) || null,
    icon: (formData.get("icon") as string) || null,
    sort_order: 65536,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateWallet(
  id: string,
  updates: Partial<Pick<Wallet, "name" | "type" | "color" | "icon" | "is_active">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("wallets")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}

export async function deleteWallet(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}
