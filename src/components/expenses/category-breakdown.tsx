"use client";

// Compact "Spending by category" card. Data comes from GET /api/transactions
// where totals and the breakdown are computed SERVER-side — this component
// only renders what the API returns (no client-side recomputation).

import { useEffect, useMemo, useState } from "react";
import { PieChart } from "lucide-react";
import { formatVnd } from "@/lib/finance/money";

interface BreakdownItem {
  category_id: string | null;
  category_name: string;
  total: number;
  count: number;
}

interface TransactionsApiResponse {
  transactions: unknown[];
  summary: { income: number; expense: number; balance: number };
  breakdown: BreakdownItem[];
}

const TOP_N = 6;

export function CategoryBreakdown() {
  // `null` = still loading; `[]` = loaded but nothing to show.
  const [items, setItems] = useState<BreakdownItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/transactions")
      .then((res) => (res.ok ? (res.json() as Promise<TransactionsApiResponse>) : null))
      .then((data) => {
        if (!cancelled) setItems(data?.breakdown ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Show the top N categories, folding the long tail into a single "Other".
  const visibleRows = useMemo(() => {
    if (!items || items.length <= TOP_N) return items ?? [];
    const top = items.slice(0, TOP_N);
    const rest = items.slice(TOP_N);
    const other: BreakdownItem = {
      category_id: null,
      category_name: "Other",
      total: rest.reduce((sum, r) => sum + r.total, 0),
      count: rest.reduce((sum, r) => sum + r.count, 0),
    };
    return [...top, other];
  }, [items]);

  const grandTotal = useMemo(
    () => (items ?? []).reduce((sum, r) => sum + r.total, 0),
    [items]
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <PieChart className="h-4 w-4 text-muted-foreground" />
        Spending by category
      </div>

      {/* Loading state */}
      {items === null && (
        <div className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {items !== null && visibleRows.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          No expenses recorded yet — add a transaction to see your breakdown.
        </p>
      )}

      {/* Breakdown rows */}
      {items !== null && visibleRows.length > 0 && (
        <ul className="mt-3 space-y-3">
          {visibleRows.map((row) => {
            const pct = grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0;
            return (
              <li key={row.category_id ?? "__other__"}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-foreground">
                    {row.category_name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatVnd(row.total)} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
