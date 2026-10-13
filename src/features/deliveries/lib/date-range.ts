import { parse } from "date-fns";
import type { DateRange } from "react-day-picker";

// Shared by use-delivery-search (grouped view) and use-unified-item-search
// (flat, date-only view) so both match a delivery_date against a range the
// same way.
//
// delivery_date is a "yyyy-MM-dd" string (§4). Parsing it with `new
// Date(dateStr)` (or date-fns's parseISO) treats a date-only string as UTC
// midnight, which shifts to the previous day once compared against local
// Date objects in a time zone ahead of UTC — parsing against a local
// reference date avoids that.
export function isDateWithinRange(dateStr: string, range: DateRange | undefined): boolean {
  if (!range?.from) return true;
  const date = parseLocalDateString(dateStr);
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);
  return date >= from && date <= to;
}

// Same UTC-shift issue as above, for display: `format(new Date(dateStr), …)`
// can render the previous day in a time zone ahead of UTC.
export function parseLocalDateString(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}
