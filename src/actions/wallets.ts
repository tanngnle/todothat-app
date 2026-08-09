"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { walletSchema } from "@/lib/finance/schemas";
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

export async function createWallet(formData: FormData): Promise<Wallet> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = walletSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const color = (formData.get("color") as string) || null;
  const icon = (formData.get("icon") as string) || null;

  const { data: wallet, error } = await supabase
    .from("wallets")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      balance: parsed.data.balance,
      color,
      icon,
      sort_order: 65536,
      // Explicit: don't rely on the DB/mock column default — read paths
      // filter is_active = true, so a missing value hides the new row.
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/expenses");
  return wallet as Wallet;
}

export async function updateWallet(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = walletSchema.partial().safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }
  const color = formData.get("color");
  if (color !== null) updates.color = (color as string) || null;
  const icon = formData.get("icon");
  if (icon !== null) updates.icon = (icon as string) || null;
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = String(isActive) === "true";

  const { error } = await supabase
    .from("wallets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses");
}

export type DeleteWalletOutcome = "archived" | "deleted";

export async function deleteWallet(id: string): Promise<DeleteWalletOutcome> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Reference guard: does ANY transaction point at this wallet, on either
  // side of a transfer? We deliberately avoid the `{ count: "exact", head:
  // true }` shape here — exact-count semantics are fragile across backends
  // (PostgREST Content-Range parsing, and the in-memory mock client does not
  // implement them at all). Fetching at most one row and checking the array
  // length is robust everywhere.
  const { data: refs, error: refsError } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", user.id)
    .or(`wallet_id.eq.${id},to_wallet_id.eq.${id}`)
    .limit(1);

  if (refsError) throw refsError;

  if ((refs?.length ?? 0) > 0) {
    // Referenced wallet: SOFT-delete instead of hard-deleting. A hard delete
    // would orphan the transactions' wallet_id/to_wallet_id references (the
    // FK on transactions.wallet_id has no ON DELETE protection that we can
    // rely on across environments), making them render/export with no wallet.
    // Soft-deleting keeps the history intact and hides the wallet from lists
    // and pickers (read queries filter is_active = true).
    const { error: softError } = await supabase
      .from("wallets")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);

    if (softError) throw softError;
    revalidatePath("/expenses");
    return "archived";
  }

  // Unreferenced wallet: safe to hard-delete.
  const { error } = await supabase
    .from("wallets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses");
  return "deleted";
}
