import { useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import type { QuickRangeKey, QuickRangeOption } from "../types";
import { computeQuickRange } from "./date-range";

export { computeQuickRange, formatDateRangeLabel } from "./date-range";

// §6 flow C: free-text query matched against item_code/item_name, plus a
// delivery_date range. Centralized here so the text input, the calendar
// popover, and the quick-range pills all read/write one shared filter state.
export const QUICK_RANGE_OPTIONS: QuickRangeOption[] = [
  { key: "yesterday", label: "Yesterday" },
  { key: "last-3-days", label: "Last 3 days" },
  { key: "last-7-days", label: "Last 7 days" },
  { key: "last-30-days", label: "Last 30 days" },
  { key: "last-month", label: "Last month" },
];

export interface UseSearchFiltersResult {
  query: string;
  setQuery: (query: string) => void;
  range: DateRange | undefined;
  setRange: (range: DateRange | undefined) => void;
  activeQuickRange: QuickRangeKey | null;
  selectQuickRange: (key: QuickRangeKey) => void;
  clearRange: () => void;
  quickRangeOptions: QuickRangeOption[];
}

export function useSearchFilters(): UseSearchFiltersResult {
  const [query, setQuery] = useState("");
  const [range, setRangeState] = useState<DateRange | undefined>(undefined);
  const [activeQuickRange, setActiveQuickRange] =
    useState<QuickRangeKey | null>(null);

  const setRange = useCallback((next: DateRange | undefined) => {
    setRangeState(next);
    setActiveQuickRange(null);
  }, []);

  const clearRange = useCallback(() => {
    setRangeState(undefined);
    setActiveQuickRange(null);
  }, []);

  const selectQuickRange = useCallback((key: QuickRangeKey) => {
    setActiveQuickRange((current) => {
      if (current === key) {
        setRangeState(undefined);
        return null;
      }
      setRangeState(computeQuickRange(key));
      return key;
    });
  }, []);

  return useMemo(
    () => ({
      query,
      setQuery,
      range,
      setRange,
      activeQuickRange,
      selectQuickRange,
      clearRange,
      quickRangeOptions: QUICK_RANGE_OPTIONS,
    }),
    [query, range, activeQuickRange, setRange, selectQuickRange, clearRange],
  );
}
