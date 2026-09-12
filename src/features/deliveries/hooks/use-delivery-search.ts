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
import type { DeliveryGroup, DeliverySearchResultGroup } from "../types";

// §6 flow C: free-text query matched against item_code/item_name/
// delivery_code, plus a delivery_date range, store-scoped. Results stay
// empty until at least one filter is set — browsing without filters is what
// the recent-uploads list (useRecentDeliveries) is for.
export interface UseDeliverySearchParams {
  storeCode: string | null;
  query: string;
  range: DateRange | undefined;
}

export interface UseDeliverySearchResult {
  groups: DeliverySearchResultGroup[];
  hasActiveFilters: boolean;
}

// An exact hit on the delivery's own code means "show me this receipt" —
// every item is shown, expanded by default. Anything else that matched
// (a delivery-code fragment, or an item's name/code) only shows the items
// that actually matched: a delivery can run 50-80 items, so surfacing the
// whole receipt for a one-item match would defeat the point of searching.
// Displayed items are always sorted by item_code, regardless of match type.
function toSearchResultGroup(
  group: DeliveryGroup,
  normalizedQuery: string,
): DeliverySearchResultGroup | null {
  if (!normalizedQuery) {
    return { ...group, displayItems: [...group.items].sort(compareByItemCode), autoExpand: false };
  }

  const deliveryCode = group.delivery.delivery_code.toLowerCase();
  if (deliveryCode.includes(normalizedQuery)) {
    return {
      ...group,
      displayItems: [...group.items].sort(compareByItemCode),
      autoExpand: deliveryCode === normalizedQuery,
    };
  }

  const matchingItems = group.items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(normalizedQuery) ||
      (item.item_code?.toLowerCase().includes(normalizedQuery) ?? false),
  );
  if (matchingItems.length === 0) return null;

  return { ...group, displayItems: matchingItems.sort(compareByItemCode), autoExpand: false };
}

export function useDeliverySearch({
  storeCode,
  query,
  range,
}: UseDeliverySearchParams): UseDeliverySearchResult {
  useEffect(() => {
    if (storeCode) ensureSeedForStore(storeCode);
  }, [storeCode]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const normalizedQuery = query.trim().toLowerCase();
  const hasActiveFilters = Boolean(normalizedQuery) || Boolean(range?.from);

  const groups = useMemo(() => {
    // Referenced only for its identity, to recompute after the sample
    // store seeds or writes new data — listGroupsForStore reads the
    // module's current state directly rather than this snapshot value.
    void snapshot;
    if (!storeCode || !hasActiveFilters) return [];

    return listGroupsForStore(storeCode)
      .filter((group) => isDateWithinRange(group.delivery.delivery_date, range))
      .map((group) => toSearchResultGroup(group, normalizedQuery))
      .filter((group): group is DeliverySearchResultGroup => group !== null);
  }, [storeCode, hasActiveFilters, normalizedQuery, range, snapshot]);

  return { groups, hasActiveFilters };
}
