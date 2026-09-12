import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  ensureSeedForStore,
  getSnapshot,
  listGroupsForStore,
  subscribe,
} from "../lib/sample-store";
import type { DeliveryGroup } from "../types";

// Store-scoped browse list (as opposed to useDeliverySearch's filtered
// lookup) — backs the search screen's "recent uploads" quick-select bar.
export interface UseRecentDeliveriesResult {
  groups: DeliveryGroup[];
}

export function useRecentDeliveries(
  storeCode: string | null,
  limit = 5,
): UseRecentDeliveriesResult {
  useEffect(() => {
    if (storeCode) ensureSeedForStore(storeCode);
  }, [storeCode]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const groups = useMemo(() => {
    // Referenced only for its identity, to recompute after the sample
    // store seeds or writes new data.
    void snapshot;
    if (!storeCode) return [];
    return listGroupsForStore(storeCode).slice(0, limit);
  }, [storeCode, limit, snapshot]);

  return { groups };
}
