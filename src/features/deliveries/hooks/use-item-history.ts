import { useIsRestoring, useQuery } from "@tanstack/react-query";
import { fetchItemHistory } from "../lib/api";
import { toQueryStatus, type QueryStatus } from "../lib/query-status";
import type { DeliveryItemUpdate } from "@/types/schema";

// Backs the per-item history panel (item-history-panel.tsx). `enabled` lets
// the caller fetch lazily — only once a staff member actually opens the
// panel for that item, not for every row in a search result list.
export interface UseItemHistoryResult {
  history: DeliveryItemUpdate[];
  // So "No corrections yet" only shows for a history that really came back
  // empty — not while it loads, offline with no saved copy, or after a failed
  // request.
  status: QueryStatus;
}

export function useItemHistory(
  deliveryCode: string,
  itemId: string,
  enabled: boolean,
): UseItemHistoryResult {
  const isRestoring = useIsRestoring();
  const { data, isError, isLoading, isPaused } = useQuery({
    queryKey: ["deliveries", "item-history", deliveryCode, itemId],
    queryFn: () => fetchItemHistory(deliveryCode, itemId),
    enabled,
  });

  return {
    history: data ?? [],
    status: toQueryStatus({ data, isError, isLoading, isPaused, isRestoring: isRestoring && enabled }),
  };
}
