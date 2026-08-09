// Pure CSV/tab-delimited parser for bulk transaction import.
// Unit-testable: no React, no server dependencies.
import { format, isValid, parse } from "date-fns";
import type { ExpenseCategory, Wallet } from "@/types/database";
import { toIntegerVnd } from "./money";
import { newDraft, type TransactionDraft } from "./draft";

export const MAX_BATCH_ROWS = 200;

type ColumnName = "date" | "type" | "amount" | "wallet" | "category" | "note";

/** Tolerant header synonyms (English + Vietnamese, diacritics stripped by callers). */
const HEADER_SYNONYMS: Record<ColumnName, string[]> = {
  date: ["date", "ngay", "ngay thang", "transaction date"],
  type: ["type", "loai", "loai giao dich", "transaction type"],
  amount: ["amount", "so tien", "gia tri", "value"],
  wallet: ["wallet", "vi", "vi tien", "account"],
  category: ["category", "danh muc", "nhom", "nhan"],
  note: ["note", "ghi chu", "mo ta", "description", "memo"],
};

const DEFAULT_COLUMN_ORDER: ColumnName[] = [
  "date",
  "type",
  "amount",
  "wallet",
  "category",
  "note",
];

const TYPE_SYNONYMS: Record<string, TransactionDraft["type"]> = {
  income: "income",
  thu: "income",
  "thu nhap": "income",
  expense: "expense",
  chi: "expense",
  "chi tieu": "expense",
  transfer: "transfer",
  "chuyen khoan": "transfer",
  "chuyen tien": "transfer",
};

/** Strip Vietnamese diacritics + lowercase + trim for tolerant matching. */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Scan the WHOLE text character-by-character into rows of cells, honoring
 * double-quoted cells that may contain the delimiter and even newlines
 * (escaped quotes are written as ""). Cells are trimmed.
 */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        // Newlines inside quotes stay part of the cell.
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(current);
      current = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(current);
      current = "";
      rows.push(row);
      row = [];
    } else {
      current += ch;
    }
  }
  // Flush a trailing row with no final newline.
  if (current !== "" || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim()));
}

/**
 * Detect whether the first row looks like a header; returns column mapping.
 * Classified as a header only when ≥2 DISTINCT cells match recognized
 * synonyms — a single accidental match in a data row is not enough.
 */
function detectColumns(
  firstCells: string[]
): { columns: (ColumnName | undefined)[]; isHeader: boolean } {
  const mapped = firstCells.map((cell) => {
    const norm = normalizeText(cell);
    for (const [name, synonyms] of Object.entries(HEADER_SYNONYMS)) {
      if (synonyms.includes(norm)) return name as ColumnName;
    }
    return undefined;
  });
  const distinctMatches = new Set(
    firstCells
      .map(normalizeText)
      .filter((norm) =>
        Object.values(HEADER_SYNONYMS).some((synonyms) =>
          synonyms.includes(norm)
        )
      )
  );
  if (distinctMatches.size >= 2) {
    return { columns: mapped, isHeader: true };
  }
  return { columns: [...DEFAULT_COLUMN_ORDER], isHeader: false };
}

/** Parse tolerant date formats: yyyy-MM-dd, dd/MM/yyyy, dd-MM-yyyy. */
function parseDate(value: string): string | null {
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy"];
  for (const fmt of formats) {
    const parsed = parse(value.trim(), fmt, new Date());
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }
  return null;
}

export interface ParseTransactionCsvResult {
  drafts: TransactionDraft[];
  errors: string[];
}

/**
 * Parse pasted comma- or tab-delimited text into transaction drafts.
 * Wallet/category cells are matched by NAME (case/diacritic-insensitive).
 * Rows with errors are excluded from drafts but reported in `errors`.
 */
export function parseTransactionCsv(
  text: string,
  wallets: Wallet[],
  categories: ExpenseCategory[]
): ParseTransactionCsvResult {
  const errors: string[] = [];

  if (text.trim().length === 0) {
    return { drafts: [], errors: ["Nothing to parse — the input is empty."] };
  }

  // Delimiter detection from the first physical line (a header row never
  // relies on quoting for its own tab/comma choice).
  const firstLineEnd = text.search(/\r\n|\n|\r/);
  const firstLine = firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  // Quote-aware scan of the full text first, THEN drop empty rows, so
  // quoted multi-line cells survive as a single cell.
  const rows = parseRows(text, delimiter).filter((r) =>
    r.some((c) => c !== "")
  );

  if (rows.length === 0) {
    return { drafts: [], errors: ["Nothing to parse — the input is empty."] };
  }

  const { columns, isHeader } = detectColumns(rows[0]);
  const dataRows = isHeader ? rows.slice(1) : rows;

  if (dataRows.length > MAX_BATCH_ROWS) {
    return { drafts: [], errors: ["Maximum 200 rows per batch"] };
  }

  // Name → id lookup maps (normalized).
  const walletByName = new Map<string, string>();
  for (const w of wallets) walletByName.set(normalizeText(w.name), w.id);

  const categoryByName = new Map<string, ExpenseCategory>();
  for (const c of categories) {
    categoryByName.set(normalizeText(c.name), c);
    if (c.name_vi) categoryByName.set(normalizeText(c.name_vi), c);
  }

  const drafts: TransactionDraft[] = [];

  dataRows.forEach((cells, index) => {
    const rowNum = index + 1 + (isHeader ? 1 : 0);
    const get = (name: ColumnName): string => {
      const idx = columns.indexOf(name);
      return idx >= 0 && idx < cells.length ? cells[idx].trim() : "";
    };

    const rowErrors: string[] = [];

    const date = parseDate(get("date"));
    if (!date) rowErrors.push(`invalid date "${get("date")}"`);

    const typeNorm = normalizeText(get("type"));
    const type = TYPE_SYNONYMS[typeNorm];
    if (!type) rowErrors.push(`unknown type "${get("type")}"`);

    let amount: number | "" = "";
    try {
      amount = toIntegerVnd(get("amount"));
      if (amount === 0) throw new Error("zero");
    } catch {
      rowErrors.push(`invalid amount "${get("amount")}"`);
    }

    const walletName = get("wallet");
    const walletId = walletByName.get(normalizeText(walletName)) ?? "";
    if (!walletId) rowErrors.push(`unmatched wallet "${walletName}"`);

    const categoryName = get("category");
    let categoryId: string | undefined;
    if (categoryName) {
      const match = categoryByName.get(normalizeText(categoryName));
      if (!match) {
        rowErrors.push(`unmatched category "${categoryName}"`);
      } else {
        categoryId = match.id;
      }
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${rowNum}: ${rowErrors.join("; ")}`);
      return;
    }

    drafts.push(
      newDraft({
        date: date as string,
        type: type as TransactionDraft["type"],
        amount: amount as number,
        wallet_id: walletId,
        category_id: categoryId,
        note: get("note") || undefined,
        source: "bulk",
      })
    );
  });

  return { drafts, errors };
}
