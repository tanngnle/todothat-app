"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getInvestmentAccounts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("investment_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) throw error;
  return data || [];
}

export async function getInvestmentTransactions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("investment_transactions")
    .select("*, investment_accounts(name, platform)")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createInvestmentTransaction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const accountId = formData.get("account_id") as string;
  const type = formData.get("type") as string;
  const amount = BigInt(formData.get("amount") as string);
  const note = (formData.get("note") as string) || null;
  const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("investment_transactions").insert({
    account_id: accountId,
    type,
    amount,
    note,
    date,
  });

  if (error) throw error;
  revalidatePath("/");
}
