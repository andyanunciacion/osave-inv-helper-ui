import {
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  isSameYear,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import type { QuickRangeKey } from "../types";

// Pure date-range math shared by useSearchFilters (client) and
// formatSearchResultsTitle (server). Kept free of React imports so Server
// Components can pull in formatDateRangeLabel without dragging `react` (and
// its client-only hooks) into the server bundle.
export function computeQuickRange(
  key: QuickRangeKey,
  referenceDate: Date = new Date(),
): DateRange {
  switch (key) {
    case "yesterday": {
      const yesterday = subDays(referenceDate, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "last-3-days":
      return {
        from: startOfDay(subDays(referenceDate, 2)),
        to: endOfDay(referenceDate),
      };
    case "last-7-days":
      return {
        from: startOfDay(subDays(referenceDate, 6)),
        to: endOfDay(referenceDate),
      };
    case "last-30-days":
      return {
        from: startOfDay(subDays(referenceDate, 29)),
        to: endOfDay(referenceDate),
      };
    case "last-month": {
      const previousMonth = subMonths(referenceDate, 1);
      return {
        from: startOfMonth(previousMonth),
        to: endOfMonth(previousMonth),
      };
    }
  }
}

export function formatDateRangeLabel(range: DateRange | undefined): string | null {
  if (!range?.from) return null;
  if (!range.to || isSameDay(range.from, range.to)) {
    return format(range.from, "MMM d, yyyy");
  }
  if (isSameYear(range.from, range.to)) {
    return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
  }
  return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
}
