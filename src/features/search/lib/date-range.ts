// Pure date-range helpers for §6 flow C — no React, so usable from both
// useSearchFilters (editing state on /search) and the results page's URL
// param parsing without either depending on the other's file.
import {
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import type { QuickRangeKey, QuickRangeOption } from "../types";

export const QUICK_RANGE_OPTIONS: QuickRangeOption[] = [
  { key: "yesterday", label: "Yesterday" },
  { key: "last-3-days", label: "Last 3 days" },
  { key: "last-7-days", label: "Last 7 days" },
  { key: "last-30-days", label: "Last 30 days" },
  { key: "last-month", label: "Last month" },
];

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
    return format(range.from, "MMM d");
  }
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
}
