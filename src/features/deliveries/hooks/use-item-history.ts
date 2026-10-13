import { useQuery } from "@tanstack/react-query";
import { fetchItemHistory } from "../lib/api";
import type { DeliveryItemUpdate } from "@/types/schema";

// Backs the per-item history panel (item-history-panel.tsx). `enabled` lets
// the caller fetch lazily — only once a staff member actually opens the
// panel for that item, not for every row in a search result list.
export interface UseItemHistoryResult {
  history: DeliveryItemUpdate[];
  isLoading: boolean;
}

export function useItemHistory(
  deliveryCode: string,
  itemId: string,
  enabled: boolean,
): UseItemHistoryResult {
  const { data, isLoading } = useQuery({
    queryKey: ["deliveries", "item-history", deliveryCode, itemId],
    queryFn: () => fetchItemHistory(deliveryCode, itemId),
    enabled,
  });

  return { history: data ?? [], isLoading };
}
