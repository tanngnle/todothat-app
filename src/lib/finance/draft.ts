// Transaction draft rows for staged (bulk) entry before persistence
import { todayLocalISO } from "./dates";

export interface TransactionDraft {
  key: string;
  type: "income" | "expense" | "transfer";
  amount: number | "";
  wallet_id: string;
  to_wallet_id?: string;
  category_id?: string;
  person_id?: string;
  note?: string;
  date: string;
  source: "manual" | "bulk" | "image";
  attachment_url?: string;
}

/**
 * Create a new draft row with a unique key and today's local date by default.
 */
export function newDraft(defaults: Partial<TransactionDraft>): TransactionDraft {
  return {
    type: "expense",
    amount: "",
    wallet_id: "",
    source: "manual",
    ...defaults,
    key: crypto.randomUUID(),
    date: defaults.date ?? todayLocalISO(),
  };
}
