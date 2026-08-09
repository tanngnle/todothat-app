"use client";

import { Trash2 } from "lucide-react";
import type { ExpenseCategory, Wallet } from "@/types/database";
import type { TransactionDraft } from "@/lib/finance/draft";

const fieldBase =
  "w-full rounded-md border bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

interface ImagePreviewRowProps {
  draft: TransactionDraft;
  index: number;
  wallets: Wallet[];
  categories: ExpenseCategory[];
  onChange: (index: number, patch: Partial<TransactionDraft>) => void;
  onRemove: (index: number) => void;
}

/** Compact editable preview row for a receipt-scan extracted transaction. */
export function ImagePreviewRow({
  draft,
  index,
  wallets,
  categories,
  onChange,
  onRemove,
}: ImagePreviewRowProps) {
  const isTransfer = draft.type === "transfer";
  const visibleCategories = categories.filter((c) =>
    isTransfer ? false : c.type === draft.type
  );

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          type="date"
          aria-label={`Row ${index + 1} date`}
          value={draft.date}
          onChange={(e) => onChange(index, { date: e.target.value })}
          className={fieldBase}
        />
        <select
          aria-label={`Row ${index + 1} type`}
          value={draft.type}
          onChange={(e) => {
            const type = e.target.value as TransactionDraft["type"];
            onChange(index, {
              type,
              ...(type === "transfer" ? { category_id: undefined } : {}),
            });
          }}
          className={fieldBase}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          aria-label={`Row ${index + 1} amount`}
          placeholder="Amount (VND)"
          value={draft.amount === "" ? "" : draft.amount}
          onChange={(e) =>
            onChange(index, {
              amount: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          className={`${fieldBase} text-right tabular-nums`}
        />
        <select
          aria-label={`Row ${index + 1} wallet`}
          value={draft.wallet_id}
          onChange={(e) => onChange(index, { wallet_id: e.target.value })}
          className={`${fieldBase} ${draft.wallet_id ? "" : "ring-2 ring-destructive"}`}
        >
          <option value="">— Wallet —</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_2rem]">
        {isTransfer ? (
          <select
            aria-label={`Row ${index + 1} destination wallet`}
            value={draft.to_wallet_id ?? ""}
            onChange={(e) =>
              onChange(index, { to_wallet_id: e.target.value || undefined })
            }
            className={fieldBase}
          >
            <option value="">— To wallet —</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            aria-label={`Row ${index + 1} category`}
            value={draft.category_id ?? ""}
            onChange={(e) =>
              onChange(index, { category_id: e.target.value || undefined })
            }
            className={fieldBase}
          >
            <option value="">— Category —</option>
            {visibleCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          aria-label={`Row ${index + 1} note`}
          placeholder="Note"
          value={draft.note ?? ""}
          onChange={(e) => onChange(index, { note: e.target.value })}
          className={fieldBase}
        />
        <button
          type="button"
          aria-label={`Remove row ${index + 1}`}
          onClick={() => onRemove(index)}
          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
