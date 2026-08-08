"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/types/database";

export async function getTransactions(dateFrom?: string, dateTo?: string): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTransaction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const type = formData.get("type") as string;
  const amount = BigInt(formData.get("amount") as string);
  const walletId = formData.get("wallet_id") as string;
  const toWalletId = (formData.get("to_wallet_id") as string) || null;
  const categoryId = (formData.get("category_id") as string) || null;
  const personId = (formData.get("person_id") as string) || null;
  const note = (formData.get("note") as string) || null;
  const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0];

  // Insert transaction
  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type,
    amount,
    wallet_id: walletId,
    to_wallet_id: toWalletId,
    category_id: categoryId,
    person_id: personId,
    note,
    date,
  });

  if (error) throw error;

  // Update wallet balances
  if (type === "expense") {
    await supabase
      .from("wallets")
      .update({ balance: supabase.rpc("wallet_balance_sub", { wallet_id: walletId, amount }) })
      .eq("id", walletId);
  } else if (type === "income") {
    await supabase
      .from("wallets")
      .update({ balance: supabase.rpc("wallet_balance_add", { wallet_id: walletId, amount }) })
      .eq("id", walletId);
  } else if (type === "transfer" && toWalletId) {
    // Deduct from source, add to destination
    await supabase
      .from("wallets")
      .update({ balance: supabase.rpc("wallet_balance_sub", { wallet_id: walletId, amount }) })
      .eq("id", walletId);
    await supabase
      .from("wallets")
      .update({ balance: supabase.rpc("wallet_balance_add", { wallet_id: toWalletId, amount }) })
      .eq("id", toWalletId);
  }

  revalidatePath("/");
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();

  // Get transaction to reverse balance changes
  const { data: txn } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (txn) {
    if (txn.type === "expense") {
      await supabase
        .from("wallets")
        .update({ balance: supabase.rpc("wallet_balance_add", { wallet_id: txn.wallet_id, amount: txn.amount }) })
        .eq("id", txn.wallet_id);
    } else if (txn.type === "income") {
      await supabase
        .from("wallets")
        .update({ balance: supabase.rpc("wallet_balance_sub", { wallet_id: txn.wallet_id, amount: txn.amount }) })
        .eq("id", txn.wallet_id);
    } else if (txn.type === "transfer" && txn.to_wallet_id) {
      await supabase
        .from("wallets")
        .update({ balance: supabase.rpc("wallet_balance_add", { wallet_id: txn.wallet_id, amount: txn.amount }) })
        .eq("id", txn.wallet_id);
      await supabase
        .from("wallets")
        .update({ balance: supabase.rpc("wallet_balance_sub", { wallet_id: txn.to_wallet_id, amount: txn.amount }) })
        .eq("id", txn.to_wallet_id);
    }
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
}
