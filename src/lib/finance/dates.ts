// Local-date helpers (date-fns v4)
import { format } from "date-fns";

/**
 * Today's date in the user's local timezone as an ISO date string (yyyy-MM-dd).
 * Avoids UTC drift of new Date().toISOString().
 */
export function todayLocalISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}
