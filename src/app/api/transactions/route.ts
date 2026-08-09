// REST endpoint for transactions — serves external API consumers.
// NOTE: the in-app per-row delete already exists via the `deleteTransaction`
// server action (rendered by TransactionRowActions); this DELETE handler is
// for API consumers only — no UI duplication.
//
// Contract:
//   GET    /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD
//          → { transactions, summary: { income, expense, balance },
//              breakdown: [{ category_id, category_name, total, count }] }
//   POST   /api/transactions        (JSON body, transactionSchema) → 201 { transaction }
//   DELETE /api/transactions?id=    (or JSON body { id })          → 200 { success }
//
// Totals and the per-category expense breakdown are computed SERVER-side here
// (guideline: compute on the server, not in the browser). In mock mode
// (Supabase unconfigured) the mock client returns sample rows through the
// exact same shape, so the endpoint always works.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/finance/schemas";
import type { Transaction } from "@/types/database";

/** Label used when an expense has no category (or its category is gone). */
const UNCATEGORIZED_NAME = "Khác/Other";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Resolves the signed-in user or null. */
async function getUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Fetch all of the user's transactions (newest first), optionally restricted
 * to a [from, to] date window. The window is applied in JS (not via .lte)
 * so the mock client — which lacks `lte` — behaves identically to PostgREST.
 */
async function fetchUserTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  from?: string | null,
  to?: string | null
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) throw error;

  const rows = ((data || []) as Transaction[]).filter(
    (t) => (!from || t.date >= from) && (!to || t.date <= to)
  );
  return rows;
}

// ---------------------------------------------------------------------------
// GET — list + server-computed summary + per-category expense breakdown
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return unauthorized();

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  try {
    const [transactions, categoryResult] = await Promise.all([
      fetchUserTransactions(supabase, user.id, from, to),
      // Category names for the breakdown join.
      supabase
        .from("expense_categories")
        .select("id, name")
        .eq("user_id", user.id),
    ]);

    const categoryNames = new Map<string, string>(
      ((categoryResult.data || []) as Array<{ id: string; name: string }>).map(
        (c) => [c.id, c.name]
      )
    );

    // ── Summary (server-side) ──────────────────────────────────────────────
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += Number(t.amount);
      else if (t.type === "expense") expense += Number(t.amount);
    }

    // ── Per-category expense breakdown (server-side) ───────────────────────
    const byCategory = new Map<string, { total: number; count: number }>();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const key = t.category_id ?? "__none__";
      const bucket = byCategory.get(key) ?? { total: 0, count: 0 };
      bucket.total += Number(t.amount);
      bucket.count += 1;
      byCategory.set(key, bucket);
    }

    const breakdown = Array.from(byCategory.entries())
      .map(([key, { total, count }]) => ({
        category_id: key === "__none__" ? null : key,
        category_name:
          key === "__none__"
            ? UNCATEGORIZED_NAME
            : categoryNames.get(key) ?? UNCATEGORIZED_NAME,
        total,
        count,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      transactions,
      summary: { income, expense, balance: income - expense },
      breakdown,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a single transaction (validated by transactionSchema)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return NextResponse.json(
      { error: `${path}${issue?.message ?? "Invalid transaction"}` },
      { status: 400 }
    );
  }

  // Stamp ownership; `source` already defaults to "manual" via the schema.
  // Single insert only — the trg_transactions_balance DB trigger maintains
  // wallets.balance atomically. No balance math in TS.
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ transaction: data }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE — ownership-scoped delete (?id= query param or JSON body { id })
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return unauthorized();

  // Accept the id from the query string or a JSON body.
  let id = request.nextUrl.searchParams.get("id");
  if (!id) {
    try {
      const body = (await request.json()) as { id?: unknown };
      if (typeof body?.id === "string" && body.id.trim() !== "") {
        id = body.id.trim();
      }
    } catch {
      // No (or unparseable) body — fall through to the missing-id error.
    }
  }
  if (!id) {
    return NextResponse.json(
      { error: "Missing transaction id (use ?id= or JSON body { id })" },
      { status: 400 }
    );
  }

  // Ownership + existence check first so a foreign/unknown id yields 404.
  const { data: existing, error: findError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  // The DB trigger reverses the balance delta on delete.
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
