"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/types/database";
import {
  transactionSchema,
  transactionBatchSchema,
  type TransactionInput,
} from "@/lib/finance/schemas";
import { toIntegerVnd } from "@/lib/finance/money";
import { todayLocalISO } from "@/lib/finance/dates";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result of a single-transaction mutation (create/update). */
export type TransactionActionResult =
  | { success: true; error?: undefined }
  | { success?: undefined; error: string };

/** Result of the batch import action. */
export type TransactionBatchResult =
  | { saved: number; error?: undefined }
  | { saved?: undefined; error: string };

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetch transactions, newest first.
 * @param limit Row cap. Defaults to 1000; pass `null` for no cap (used for
 *              summary totals and CSV export so they never truncate).
 */
export async function getTransactions(
  dateFrom?: string,
  dateTo?: string,
  limit: number | null = 1000
): Promise<Transaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (limit !== null) query = query.limit(limit);

  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerces a FormData string value to string | null ("" → null). */
function strOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createTransaction(
  formData: FormData
): Promise<TransactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Build the raw input from FormData. Amount goes through toIntegerVnd so
  // non-numeric / negative values become a validation error, not a throw.
  let amount: number;
  try {
    amount = toIntegerVnd(formData.get("amount") as string | null);
  } catch {
    return { error: "Amount must be a positive whole number" };
  }

  const raw = {
    type: formData.get("type"),
    amount,
    wallet_id: formData.get("wallet_id"),
    to_wallet_id: strOrNull(formData.get("to_wallet_id")),
    category_id: strOrNull(formData.get("category_id")),
    person_id: strOrNull(formData.get("person_id")),
    note: strOrNull(formData.get("note")),
    date: strOrNull(formData.get("date")) ?? todayLocalISO(),
    source: strOrNull(formData.get("source")) ?? "manual",
    attachment_url: strOrNull(formData.get("attachment_url")),
  };

  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction" };
  }

  // Single insert only — the trg_transactions_balance trigger maintains
  // wallets.balance atomically. No balance updates in TS.
  const { error } = await supabase
    .from("transactions")
    .insert({ ...parsed.data, user_id: user.id });

  if (error) throw error;

  revalidatePath("/expenses");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateTransaction(
  id: string,
  formData: FormData
): Promise<TransactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let amount: number;
  try {
    amount = toIntegerVnd(formData.get("amount") as string | null);
  } catch {
    return { error: "Amount must be a positive whole number" };
  }

  const raw: Record<string, unknown> = {
    type: formData.get("type"),
    amount,
    wallet_id: formData.get("wallet_id"),
    to_wallet_id: strOrNull(formData.get("to_wallet_id")),
    category_id: strOrNull(formData.get("category_id")),
    person_id: strOrNull(formData.get("person_id")),
    note: strOrNull(formData.get("note")),
    date: strOrNull(formData.get("date")) ?? todayLocalISO(),
  };

  // source / attachment_url only travel in the payload when the FormData
  // actually carries them — otherwise the stored values are preserved, so
  // editing a receipt-scanned transaction keeps source='image' and its
  // attachment_url intact.
  if (formData.has("source")) {
    raw.source = strOrNull(formData.get("source")) ?? "manual";
  }
  if (formData.has("attachment_url")) {
    raw.attachment_url = strOrNull(formData.get("attachment_url"));
  }

  // partial(): every field that IS present is still fully validated (the
  // dialog always sends type/amount/wallet_id/date, and the transfer
  // superRefine applies whenever type is present), while absent fields are
  // simply left out of the UPDATE instead of being reset.
  const parsed = transactionSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid transaction" };
  }

  // The trigger reconciles balances on UPDATE (reverses OLD, applies NEW).
  const { error } = await supabase
    .from("transactions")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/expenses");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Ownership-scoped delete only — the trigger reverses the balance delta.
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  revalidatePath("/expenses");
}

// ---------------------------------------------------------------------------
// Batch create (bulk import)
// ---------------------------------------------------------------------------

export async function createTransactionsBatch(
  json: string
): Promise<TransactionBatchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return { error: "Invalid JSON payload" };
  }

  const parsed = transactionBatchSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path.length ? `${firstIssue.path.join(".")}: ` : "";
    return { error: `${path}${firstIssue?.message ?? "Invalid batch"}` };
  }

  // Stamp ownership on every row; each row keeps its own source.
  const rows: Array<TransactionInput & { user_id: string }> = parsed.data.map(
    (row) => ({ ...row, user_id: user.id })
  );

  // Single multi-row insert; the trigger applies each row's delta.
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/expenses");
  return { saved: rows.length };
}
