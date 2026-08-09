"use client";

import type { KeyboardEvent } from "react";
import { X } from "lucide-react";
import type { ExpenseCategory, Wallet } from "@/types/database";
import type { TransactionDraft } from "@/lib/finance/draft";
import type { DraftIssues } from "./bulk-entry-panel";

interface BulkGridRowProps {
  draft: TransactionDraft;
  index: number;
  wallets: Wallet[];
  categories: ExpenseCategory[];
  issues: DraftIssues;
  failed: boolean;
  onChange: (index: number, patch: Partial<TransactionDraft>) => void;
  onDelete: (index: number) => void;
  onEnterKey: (index: number, col: string) => void;
}

const cellBase =
  "w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const invalidRing = "rounded-sm ring-2 ring-destructive";

/** One spreadsheet-style editable row bound to a TransactionDraft. */
export function BulkGridRow({
  draft,
  index,
  wallets,
  categories,
  issues,
  failed,
  onChange,
  onDelete,
  onEnterKey,
}: BulkGridRowProps) {
  const isTransfer = draft.type === "transfer";
  const visibleCategories = categories.filter((c) =>
    isTransfer ? false : c.type === draft.type
  );

  const handleKeyDown = (col: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnterKey(index, col);
    }
  };

  return (
    <tr
      data-row={index}
      className={`border-b ${failed ? "bg-destructive/5" : ""}`}
    >
      {/* Date */}
      <td className="min-w-[8.5rem] border-r px-1">
        <input
          type="date"
          data-col="date"
          aria-label={`Row ${index + 1} date`}
          value={draft.date}
          onChange={(e) => onChange(index, { date: e.target.value })}
          onKeyDown={handleKeyDown("date")}
          className={`${cellBase} ${issues.date ? invalidRing : ""}`}
        />
      </td>
      {/* Type */}
      <td className="min-w-[7rem] border-r px-1">
        <select
          data-col="type"
          aria-label={`Row ${index + 1} type`}
          value={draft.type}
          onChange={(e) => {
            const type = e.target.value as TransactionDraft["type"];
            onChange(index, {
              type,
              ...(type === "transfer" ? { category_id: undefined } : {}),
            });
          }}
          onKeyDown={handleKeyDown("type")}
          className={cellBase}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </td>
      {/* Amount */}
      <td className="min-w-[7rem] border-r px-1">
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="0"
          data-col="amount"
          aria-label={`Row ${index + 1} amount`}
          value={draft.amount === "" ? "" : draft.amount}
          onChange={(e) =>
            onChange(index, {
              amount: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          onKeyDown={handleKeyDown("amount")}
          className={`${cellBase} text-right tabular-nums ${issues.amount ? invalidRing : ""}`}
        />
      </td>
      {/* Wallet */}
      <td className="min-w-[8rem] border-r px-1">
        <select
          data-col="wallet"
          aria-label={`Row ${index + 1} wallet`}
          value={draft.wallet_id}
          onChange={(e) => onChange(index, { wallet_id: e.target.value })}
          onKeyDown={handleKeyDown("wallet")}
          className={`${cellBase} ${issues.wallet_id ? invalidRing : ""}`}
        >
          <option value="">— Wallet —</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </td>
      {/* To-wallet (transfers editable; others show a placeholder) */}
      <td className="min-w-[8rem] border-r px-1">
        {isTransfer ? (
          <select
            data-col="to_wallet"
            aria-label={`Row ${index + 1} destination wallet`}
            value={draft.to_wallet_id ?? ""}
            onChange={(e) =>
              onChange(index, { to_wallet_id: e.target.value || undefined })
            }
            onKeyDown={handleKeyDown("to_wallet")}
            className={`${cellBase} ${issues.to_wallet_id ? invalidRing : ""}`}
          >
            <option value="">— To wallet —</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="px-2 py-1.5 text-xs text-muted-foreground">—</span>
        )}
      </td>
      {/* Category */}
      <td className="min-w-[8rem] border-r px-1">
        {isTransfer ? (
          <span className="px-2 py-1.5 text-xs text-muted-foreground">—</span>
        ) : (
          <select
            data-col="category"
            aria-label={`Row ${index + 1} category`}
            value={draft.category_id ?? ""}
            onChange={(e) =>
              onChange(index, { category_id: e.target.value || undefined })
            }
            onKeyDown={handleKeyDown("category")}
            className={cellBase}
          >
            <option value="">— Category —</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </td>
      {/* Note */}
      <td className="min-w-[10rem] border-r px-1">
        <input
          type="text"
          placeholder="Note"
          data-col="note"
          aria-label={`Row ${index + 1} note`}
          value={draft.note ?? ""}
          onChange={(e) => onChange(index, { note: e.target.value })}
          onKeyDown={handleKeyDown("note")}
          className={cellBase}
        />
      </td>
      {/* Delete + error badge */}
      <td className="px-2 text-right">
        <button
          type="button"
          aria-label={`Delete row ${index + 1}`}
          onClick={() => onDelete(index)}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-destructive-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
