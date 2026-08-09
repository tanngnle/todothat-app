"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  investmentAccountSchema,
  investmentTransactionSchema,
} from "@/lib/finance/schemas";
import { todayLocalISO } from "@/lib/finance/dates";
import type { InvestmentAccount } from "@/types/database";

export interface InvestmentTransactionWithAccount {
  id: string;
  account_id: string;
  type: "buy" | "profit" | "loss" | "sell";
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
  investment_accounts?: { name: string; platform: string } | null;
}

export async function getInvestmentAccounts(): Promise<InvestmentAccount[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("investment_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) throw error;
  return (data || []) as InvestmentAccount[];
}

export async function getInvestmentTransactions(): Promise<InvestmentTransactionWithAccount[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // investment_transactions has NO user_id column (see
  // 001_initial_schema.sql); filtering `.eq("user_id", ...)` would make
  // PostgREST reject the query. Ownership is enforced by the RLS policy on
  // investment_transactions, which checks the parent investment_accounts row.
  const { data, error } = await supabase
    .from("investment_transactions")
    .select("*, investment_accounts(name, platform)")
    .order("date", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as InvestmentTransactionWithAccount[];
}

export async function getInvestmentTransaction(
  id: string
): Promise<InvestmentTransactionWithAccount | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // No user_id filter for the same reason as getInvestmentTransactions:
  // ownership comes from the parent-account RLS policy.
  const { data, error } = await supabase
    .from("investment_transactions")
    .select("*, investment_accounts(name, platform)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as InvestmentTransactionWithAccount | null;
}

export async function createInvestmentAccount(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  if (raw.type === "") raw.type = null;

  const parsed = investmentAccountSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  // Request the inserted row back and verify it actually exists. Never trust
  // a silent insert: some backends (including the in-memory mock when the
  // table is unknown) report success without persisting anything. The payload
  // columns must match investment_accounts in 001_initial_schema.sql exactly
  // (user_id, platform, name, type, balance, invested, is_active) — any unknown column
  // would make PostgREST reject the insert, which we surface via `error`.
  const { data: created, error } = await supabase
    .from("investment_accounts")
    .insert({
      user_id: user.id,
      platform: parsed.data.platform,
      name: parsed.data.name,
      type: parsed.data.type ?? null,
      balance: parsed.data.balance,
      invested: parsed.data.invested,
      // Explicit: don't rely on the DB/mock column default — read paths
      // filter is_active = true, so a missing value hides the new row.
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  if (!created) {
    throw new Error("Investment account was not created. Please try again.");
  }
  revalidatePath("/expenses/investments");
}

export async function updateInvestmentAccount(
  id: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  if (raw.type === "") raw.type = null;

  const parsed = investmentAccountSchema.partial().safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  const { error } = await supabase
    .from("investment_accounts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses/investments");
}

export async function deleteInvestmentAccount(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Soft-delete: hard delete would cascade away the account's transactions.
  const { error } = await supabase
    .from("investment_accounts")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/expenses/investments");
}

export async function createInvestmentTransaction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  const parsed = investmentTransactionSchema.safeParse({
    ...raw,
    note: (formData.get("note") as string) || null,
    date: (formData.get("date") as string) || todayLocalISO(),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  // Verify the target account belongs to the current user.
  const { data: account, error: accountError } = await supabase
    .from("investment_accounts")
    .select("id")
    .eq("id", parsed.data.account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account) {
    throw new Error("Investment account not found");
  }

  const { error } = await supabase.from("investment_transactions").insert({
    account_id: parsed.data.account_id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    note: parsed.data.note ?? null,
    date: parsed.data.date,
  });

  if (error) throw error;
  revalidatePath("/expenses/investments");
}

export async function updateInvestmentTransaction(
  id: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const raw: Record<string, unknown> = Object.fromEntries(formData);
  const parsed = investmentTransactionSchema.safeParse({
    ...raw,
    note: (formData.get("note") as string) || null,
    date: (formData.get("date") as string) || todayLocalISO(),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  // investment_transactions has no user_id column, so verify ownership via
  // the parent account: fetch the transaction's account_id, then confirm
  // that account belongs to the current user.
  const { data: txn, error: txnError } = await supabase
    .from("investment_transactions")
    .select("account_id")
    .eq("id", id)
    .maybeSingle();

  if (txnError) throw txnError;
  if (!txn) {
    throw new Error("Investment transaction not found");
  }

  const { data: account, error: accountError } = await supabase
    .from("investment_accounts")
    .select("id")
    .eq("id", txn.account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account) {
    throw new Error("Investment account not found");
  }

  const { error } = await supabase
    .from("investment_transactions")
    .update({
      account_id: parsed.data.account_id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
      date: parsed.data.date,
    })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/expenses/investments");
}

export async function deleteInvestmentTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // investment_transactions has no user_id column; ownership is enforced by
  // RLS through the parent investment_accounts row.
  const { error } = await supabase
    .from("investment_transactions")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/expenses/investments");
}
