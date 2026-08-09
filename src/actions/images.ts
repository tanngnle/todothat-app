"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { extractedTransactionSchema } from "@/lib/finance/schemas";
import { toIntegerVnd } from "@/lib/finance/money";
import { todayLocalISO } from "@/lib/finance/dates";
import { newDraft, type TransactionDraft } from "@/lib/finance/draft";
import { getExtractionModel } from "@/lib/finance/model-studio";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mirrors the 'receipts' bucket limit (migration 005). */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const SYSTEM_PROMPT = `You are a meticulous bookkeeping assistant that extracts transactions from photos of Vietnamese receipts, invoices, bank-transfer screenshots and similar documents.

Rules:
- Amounts are INTEGER Vietnamese Dong (VND), never with decimals. Vietnamese uses dots as thousand separators: "1.500.000đ" means 1500000. "50k" means 50000.
- Dates must be formatted as yyyy-mm-dd. If the receipt shows a Vietnamese-format date (dd/mm/yyyy), convert it. If no date is visible, use today's date.
- "type" is "expense" for money spent, "income" for money received, and "transfer" only when the image clearly shows money moving between two accounts/wallets.
- Put the merchant/counterparty and a short description of what was bought into "note" (Vietnamese is fine, max 500 chars).
- "category_name" is your best guess for the spending/earning category as a short label (e.g. "Ăn uống", "Di chuyển", "Hóa đơn", "Mua sắm", "Sức khỏe", "Lương"). Use null if unsure.
- Return exactly ONE transaction per image unless the image clearly contains multiple distinct transactions (e.g. several receipts in one photo or a statement with several line items). Never return more than 20.
- Only include transactions actually evidenced by the image. Do not invent amounts.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageProcessResult =
  | { configured: false }
  | { error: string }
  | { drafts: TransactionDraft[]; attachmentUrl: string };

/** Minimal category reference sent from the client as `categories_json`. */
interface CategoryRef {
  id: string;
  name: string;
  name_vi?: string | null;
}

// The AI cannot know wallet/category UUIDs, so it never emits them. It returns
// type/amount/date/note plus a free-text category_name that we map ourselves.
const aiTransactionSchema = extractedTransactionSchema.omit({
  wallet_id: true,
  to_wallet_id: true,
  category_id: true,
  person_id: true,
});

const aiOutputSchema = z.object({
  transactions: z.array(aiTransactionSchema).min(1).max(20),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True iff MODELSTUDIO_API_KEY (Alibaba Cloud Model Studio) is set to a non-empty string. */
export async function isImageExtractionConfigured(): Promise<boolean> {
  const key = process.env.MODELSTUDIO_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Best-effort match of a free-text category name against the user's categories. */
function matchCategoryId(
  categoryName: string | null | undefined,
  categories: CategoryRef[]
): string | undefined {
  const target = normalizeName(categoryName);
  if (!target) return undefined;
  const match = categories.find(
    (c) =>
      normalizeName(c.name) === target || normalizeName(c.name_vi ?? "") === target
  );
  return match?.id;
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Upload a receipt image to the private 'receipts' bucket, run AI extraction,
 * and return editable TransactionDraft rows. Never throws: every failure path
 * returns a structured result.
 *
 * FormData contract (sent by image-import-dialog):
 *   - file: File (jpeg/png/webp, ≤ 10 MB)
 *   - default_wallet_id: string (the user's default wallet; may be "")
 *   - categories_json: string (JSON array of { id, name, name_vi? })
 *
 * attachment_url choice: the 'receipts' bucket is PRIVATE, so a public URL
 * from getPublicUrl() would 404. We therefore store the bare storage object
 * path `{user_id}/{uuid}.{ext}` in attachment_url; a signed URL can be
 * generated later via storage.from("receipts").createSignedUrl(path, ttl).
 */
export async function processReceiptImage(
  formData: FormData
): Promise<ImageProcessResult> {
  // a. Auth check first so unauthenticated callers never reach storage/AI.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // b. Guard — no API key configured: the UI renders an instructions card.
  const configured = await isImageExtractionConfigured();
  if (!configured) return { configured: false };

  // c. File validation.
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No image file provided" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Image exceeds the 10 MB limit" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Unsupported image type — use JPEG, PNG or WebP" };
  }

  // Client-supplied defaults (both best-effort / defensive).
  const defaultWalletRaw = formData.get("default_wallet_id");
  const defaultWalletId =
    typeof defaultWalletRaw === "string" ? defaultWalletRaw.trim() : "";

  let categories: CategoryRef[] = [];
  try {
    const categoriesRaw = formData.get("categories_json");
    if (typeof categoriesRaw === "string" && categoriesRaw.trim()) {
      const parsed: unknown = JSON.parse(categoriesRaw);
      if (Array.isArray(parsed)) {
        categories = parsed.filter(
          (c): c is CategoryRef =>
            typeof c === "object" &&
            c !== null &&
            typeof (c as CategoryRef).id === "string" &&
            typeof (c as CategoryRef).name === "string"
        );
      }
    }
  } catch {
    // Invalid JSON → proceed without category matching.
  }

  // d. Upload to the private 'receipts' bucket under the user's own prefix
  //    (matches the storage RLS policies in migration 005).
  // Guard: the in-memory mock client has no `storage` property. Fail with a
  // structured error BEFORE any upload attempt to keep the "never throws"
  // contract of this action.
  if (!supabase.storage) {
    return { error: "Image upload requires a configured Supabase project" };
  }
  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const objectPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(objectPath, file, { contentType: file.type });
  if (uploadError) {
    return { error: `Image upload failed: ${uploadError.message}` };
  }
  const attachmentUrl = objectPath; // see JSDoc above re: private bucket

  // e. ONE generateObject call with the image as base64 bytes.
  // AI SDK v7 notes: the system prompt goes into `instructions` (system-role
  // messages inside `messages` are rejected client-side) and the receipt is
  // sent as a `{ type: "file", mediaType, data }` part (the `{ type: "image" }`
  // shape is deprecated). If the Model Studio endpoint rejects
  // structured-output mode, the AI SDK falls back to json mode with
  // client-side zod validation of the parsed object against aiOutputSchema —
  // the never-throws contract below still holds because any schema mismatch
  // surfaces through the catch block.
  let imageBase64: string;
  try {
    imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  } catch {
    return { error: "Could not read the image file" };
  }

  let extracted: z.infer<typeof aiOutputSchema>;
  try {
    const result = await generateObject({
      model: getExtractionModel(),
      schema: aiOutputSchema,
      instructions: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the transaction(s) from this receipt image.",
            },
            { type: "file", mediaType: file.type, data: imageBase64 },
          ],
        },
      ],
    });
    extracted = result.object;
  } catch {
    return {
      error: "Extraction failed — the AI model could not process this image",
    };
  }

  // f. Map AI output → TransactionDraft rows.
  const drafts: TransactionDraft[] = [];
  for (const item of extracted.transactions) {
    let amount: number;
    try {
      amount = toIntegerVnd(item.amount);
    } catch {
      // Invalid amount — skip this row rather than failing the whole batch.
      continue;
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      ? item.date
      : todayLocalISO();
    drafts.push(
      newDraft({
        type: item.type,
        amount,
        wallet_id: defaultWalletId,
        category_id: matchCategoryId(item.category_name, categories),
        note: item.note ?? undefined,
        date,
        source: "image",
        attachment_url: attachmentUrl,
      })
    );
  }

  if (drafts.length === 0) {
    return {
      error: "No valid transactions could be extracted from this image",
    };
  }

  return { drafts, attachmentUrl };
}
