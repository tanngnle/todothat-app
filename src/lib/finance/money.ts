// Money utilities for integer-VND handling

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

/**
 * Parse an amount into an integer VND value.
 * Accepts numbers or plain numeric strings (spaces stripped).
 * Rejects null/undefined, empty strings, NaN, negatives, non-integers and
 * values above Number.MAX_SAFE_INTEGER (throws instead of clamping, so
 * overflow surfaces as a validation error rather than silent data loss).
 * @throws Error("Invalid amount")
 */
export function toIntegerVnd(input: string | number | null | undefined): number {
  if (input === null || input === undefined) {
    throw new Error("Invalid amount");
  }

  let value: number;

  if (typeof input === "number") {
    value = input;
  } else {
    const cleaned = input.replace(/\s/g, "").trim();
    if (cleaned === "") {
      throw new Error("Invalid amount");
    }
    value = Number(cleaned);
  }

  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error("Invalid amount");
  }
  if (value < 0) {
    throw new Error("Invalid amount");
  }
  if (!Number.isInteger(value)) {
    throw new Error("Invalid amount");
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new Error("Invalid amount");
  }

  return value;
}

/**
 * Format an integer VND amount using the vi-VN currency locale.
 */
export function formatVnd(n: number): string {
  return vndFormatter.format(n);
}
