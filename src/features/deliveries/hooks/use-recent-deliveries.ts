import { useIsRestoring, useQuery } from "@tanstack/react-query";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { fetchRecentDeliveries } from "../lib/api";
import { savedCopyTime } from "../lib/query-status";
import type { DeliveryGroup } from "../types";

// Store-scoped browse list (as opposed to useDeliverySearch's filtered
// lookup) — backs the search screen's "recent uploads" quick-select bar.
export interface UseRecentDeliveriesResult {
  groups: DeliveryGroup[];
  // True until the first response, so the bar can hold its space instead of
  // popping in and pushing the content below it down.
  isLoading: boolean;
  // Set when the list is this phone's saved copy and couldn't be refreshed:
  // when it was fetched (ms since epoch).
  savedAt: number | null;
}

export function useRecentDeliveries(
  storeCode: string | null,
  limit = 5,
): UseRecentDeliveriesResult {
  const isRestoring = useIsRestoring();
  const isOnline = useOnlineStatus();
  const { data, dataUpdatedAt, isError, isLoading, isPaused } = useQuery({
    queryKey: ["deliveries", storeCode, "recent", limit],
    queryFn: () => fetchRecentDeliveries(storeCode as string, limit),
    enabled: Boolean(storeCode),
  });

  return {
    groups: data ?? [],
    // The saved copy is still being read back: the list may be about to fill.
    isLoading: isLoading || (isRestoring && data === undefined && Boolean(storeCode)),
    savedAt: savedCopyTime({ data, dataUpdatedAt, isError, isPaused, isOnline }),
  };
}
