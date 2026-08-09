"use client";

import { useMemo, useRef, useState } from "react";
import { ClipboardPaste, Plus, Rows3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ExpenseCategory, Wallet } from "@/types/database";
import { newDraft, type TransactionDraft } from "@/lib/finance/draft";
import { MAX_BATCH_ROWS, parseTransactionCsv } from "@/lib/finance/csv-parse";
import { createTransactionsBatch } from "@/actions/transactions";
import { BulkGridRow } from "./bulk-grid-row";

export interface DraftIssues {
  date?: string;
  amount?: string;
  wallet_id?: string;
  to_wallet_id?: string;
}

/** Client-side validation mirroring transactionSchema essentials. */
export function validateDraft(draft: TransactionDraft): DraftIssues {
  const issues: DraftIssues = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    issues.date = "Invalid date";
  }
  if (
    draft.amount === "" ||
    !Number.isInteger(draft.amount) ||
    draft.amount <= 0
  ) {
    issues.amount = "Amount must be a positive whole number";
  }
  if (!draft.wallet_id) {
    issues.wallet_id = "Wallet is required";
  }
  if (draft.type === "transfer") {
    if (!draft.to_wallet_id) {
      issues.to_wallet_id = "To-wallet is required for transfers";
    } else if (draft.to_wallet_id === draft.wallet_id) {
      issues.to_wallet_id = "To-wallet must differ from wallet";
    }
  }
  return issues;
}

interface BulkEntryPanelProps {
  wallets: Wallet[];
  categories: ExpenseCategory[];
  /** Called after a successful batch save (parent refreshes + switches to list). */
  onSaved: () => void;
}

export function BulkEntryPanel({
  wallets,
  categories,
  onSaved,
}: BulkEntryPanelProps) {
  const [drafts, setDrafts] = useState<TransactionDraft[]>(() => [newDraft({})]);
  const [submitting, setSubmitting] = useState(false);
  const [failedRows, setFailedRows] = useState<Set<number>>(new Set());
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  const rowIssues = useMemo(
    () => drafts.map((d) => validateDraft(d)),
    [drafts]
  );
  const invalidCount = rowIssues.filter(
    (i) => Object.keys(i).length > 0
  ).length;
  const canSubmit = drafts.length > 0 && invalidCount === 0 && !submitting;

  const addRow = () => {
    if (drafts.length >= MAX_BATCH_ROWS) return;
    setDrafts((prev) => [...prev, newDraft({})]);
  };

  const handleRowChange = (index: number, patch: Partial<TransactionDraft>) => {
    setFailedRows(new Set());
    setDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const next = { ...d, ...patch };
        if (next.type !== "transfer") next.to_wallet_id = undefined;
        return next;
      })
    );
  };

  const handleDelete = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  // Enter in a cell → focus the same column of the next row (adds one if last).
  const handleEnterKey = (index: number, col: string) => {
    const focusCell = (row: number) => {
      tableRef.current
        ?.querySelector<HTMLElement>(`tr[data-row="${row}"] [data-col="${col}"]`)
        ?.focus();
    };
    if (index + 1 < drafts.length) {
      focusCell(index + 1);
    } else if (drafts.length < MAX_BATCH_ROWS) {
      setDrafts((prev) => [...prev, newDraft({})]);
      requestAnimationFrame(() => focusCell(index + 1));
    }
  };

  const handleParseCsv = () => {
    const result = parseTransactionCsv(csvText, wallets, categories);
    setCsvErrors(result.errors);
    if (result.drafts.length > 0) {
      setDrafts(result.drafts);
      setFailedRows(new Set());
      setCsvOpen(false);
      toast.success(`Parsed ${result.drafts.length} rows from pasted text`);
    }
  };

  const handleSubmit = async () => {
    const payload = drafts
      .filter((d) => d.amount !== "")
      .map((d) => ({
        type: d.type,
        amount: d.amount as number,
        wallet_id: d.wallet_id,
        to_wallet_id: d.type === "transfer" ? (d.to_wallet_id ?? null) : null,
        category_id: d.type === "transfer" ? null : (d.category_id ?? null),
        person_id: d.person_id ?? null,
        note: d.note ?? null,
        date: d.date,
        source: "bulk" as const,
      }));

    setSubmitting(true);
    try {
      const result = await createTransactionsBatch(JSON.stringify(payload));
      if (result.saved !== undefined) {
        toast.success(`Saved ${result.saved} transactions`);
        setDrafts([]);
        setFailedRows(new Set());
        onSaved();
      } else {
        toast.error(result.error);
        // Batch errors carry path prefixes like "3.amount: message".
        const match = result.error?.match(/^(\d+)\.[a-z_]+:/);
        if (match) setFailedRows(new Set([Number(match[1])]));
      }
    } catch {
      toast.error("Failed to save transactions");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRow} disabled={drafts.length >= MAX_BATCH_ROWS}>
            <Plus className="mr-1 h-4 w-4" />
            Add row
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCsvOpen((v) => !v)}>
            <ClipboardPaste className="mr-1 h-4 w-4" />
            Paste CSV
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {drafts.length}/{MAX_BATCH_ROWS} rows
        </span>
      </div>

      {drafts.length >= MAX_BATCH_ROWS && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Maximum 200 rows per batch.</p>
      )}

      {/* Paste CSV sub-panel */}
      {csvOpen && (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <Textarea
            rows={5}
            placeholder={"date,type,amount,wallet,category,note\n2026-08-01,chi,50000,Ví MoMo,Ăn uống,Bữa trưa"}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleParseCsv}>
              Parse
            </Button>
            <span className="text-xs text-muted-foreground">
              Comma or tab delimited · header row optional
            </span>
          </div>
          {csvErrors.length > 0 && (
            <ul className="space-y-0.5 text-xs text-destructive dark:text-destructive-foreground">
              {csvErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Grid */}
      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12">
          <Rows3 className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">Add your first row</p>
          <p className="text-xs text-muted-foreground">
            Click &quot;Add row&quot; or paste CSV to get started.
          </p>
        </div>
      ) : (
        <div ref={tableRef} className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Wallet</th>
                <th className="px-3 py-2 font-medium">To wallet</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Note</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft, index) => (
                <BulkGridRow
                  key={draft.key}
                  draft={draft}
                  index={index}
                  wallets={wallets}
                  categories={categories}
                  issues={rowIssues[index]}
                  failed={failedRows.has(index)}
                  onChange={handleRowChange}
                  onDelete={handleDelete}
                  onEnterKey={handleEnterKey}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-row error badges */}
      {invalidCount > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive dark:text-destructive-foreground">
            {invalidCount === 1
              ? "1 row has errors"
              : `${invalidCount} rows have errors`}
          </p>
          {rowIssues.map((issues, index) =>
            Object.keys(issues).length > 0 ? (
              <p key={drafts[index].key} className="text-xs text-destructive dark:text-destructive-foreground">
                Row {index + 1}: {Object.values(issues).join(" · ")}
              </p>
            ) : null
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDrafts([])}
          disabled={drafts.length === 0}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Clear
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Saving…" : `Save ${drafts.length} transaction${drafts.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
