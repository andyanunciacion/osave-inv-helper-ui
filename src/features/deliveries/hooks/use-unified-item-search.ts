import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { DateRange } from "react-day-picker";
import { isDateWithinRange } from "../lib/date-range";
import {
  ensureSeedForStore,
  getSnapshot,
  listGroupsForStore,
  subscribe,
} from "../lib/sample-store";
import { compareByItemCode } from "../lib/sort";
import type { UnifiedItemRow } from "../types";

// Backs the date-only search results view: when staff filter by date alone
// (no item/code/delivery-code text), items are shown as one flat list
// across deliveries rather than grouped by delivery_code, since the point
// of a date-only search is usually "what came in that day", not "which
// deliveries arrived that day".
export interface UseUnifiedItemSearchParams {
  storeCode: string | null;
  range: DateRange | undefined;
}

export interface UseUnifiedItemSearchResult {
  items: UnifiedItemRow[];
}

export function useUnifiedItemSearch({
  storeCode,
  range,
}: UseUnifiedItemSearchParams): UseUnifiedItemSearchResult {
  useEffect(() => {
    if (storeCode) ensureSeedForStore(storeCode);
  }, [storeCode]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const items = useMemo(() => {
    void snapshot;
    if (!storeCode || !range?.from) return [];

    return listGroupsForStore(storeCode)
      .filter((group) => isDateWithinRange(group.delivery.delivery_date, range))
      .flatMap((group) =>
        group.items.map((item) => ({ ...item, delivery_date: group.delivery.delivery_date })),
      )
      .sort(
        (a, b) => b.delivery_date.localeCompare(a.delivery_date) || compareByItemCode(a, b),
      );
  }, [storeCode, range, snapshot]);

  return { items };
}
