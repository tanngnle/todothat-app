// Zod v4 schemas for finance entities
import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.coerce
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
    wallet_id: z.string().uuid(),
    to_wallet_id: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid().nullable().optional(),
    person_id: z.string().uuid().nullable().optional(),
    note: z.string().max(500).nullable().optional(),
    date: z.string().regex(ISO_DATE_REGEX),
    source: z.enum(["manual", "bulk", "image"]).default("manual"),
    attachment_url: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "transfer") {
      if (!value.to_wallet_id) {
        ctx.addIssue({
          code: "custom",
          path: ["to_wallet_id"],
          message: "to_wallet_id is required for transfers",
        });
      } else if (value.to_wallet_id === value.wallet_id) {
        ctx.addIssue({
          code: "custom",
          path: ["to_wallet_id"],
          message: "to_wallet_id must differ from wallet_id",
        });
      }
    }
  });

export const transactionBatchSchema = z
  .array(transactionSchema)
  .min(1)
  .max(200);

// ---------------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------------

export const walletSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["cash", "bank", "ewallet"]),
  balance: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
});

// ---------------------------------------------------------------------------
// Categories (matches ExpenseCategory columns in src/types/database.ts,
// including icon)
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  name_vi: z.string().max(100).optional().nullable(),
  type: z.enum(["expense", "income"]),
  parent_id: z.string().uuid().nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

// ---------------------------------------------------------------------------
// People (matches Person columns in src/types/database.ts: name, relationship)
// ---------------------------------------------------------------------------

export const personSchema = z.object({
  name: z.string().min(1).max(100),
  relationship: z.string().max(100).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Investments (match InvestmentAccount / InvestmentTransaction)
// ---------------------------------------------------------------------------

export const investmentAccountSchema = z.object({
  platform: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  type: z.string().max(100).nullable().optional(),
  balance: z.coerce.number().int().max(Number.MAX_SAFE_INTEGER).default(0),
  invested: z.coerce.number().int().max(Number.MAX_SAFE_INTEGER).default(0),
});

export const investmentTransactionSchema = z.object({
  account_id: z.string().uuid(),
  type: z.enum(["buy", "profit", "loss", "sell"]),
  amount: z.coerce.number().int().max(Number.MAX_SAFE_INTEGER),
  note: z.string().max(500).nullable().optional(),
  date: z.string().regex(ISO_DATE_REGEX),
});

// ---------------------------------------------------------------------------
// Extracted transactions (AI output — pre-validation, category may be a
// free-text name that still needs mapping)
// ---------------------------------------------------------------------------

export const extractedTransactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER),
  wallet_id: z.string().uuid(),
  to_wallet_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  category_name: z.string().max(100).nullable().optional(),
  person_id: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  date: z.string().regex(ISO_DATE_REGEX),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionBatchInput = z.infer<typeof transactionBatchSchema>;
export type WalletInput = z.infer<typeof walletSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type PersonInput = z.infer<typeof personSchema>;
export type InvestmentAccountInput = z.infer<typeof investmentAccountSchema>;
export type InvestmentTransactionInput = z.infer<typeof investmentTransactionSchema>;
export type ExtractedTransactionInput = z.infer<typeof extractedTransactionSchema>;
