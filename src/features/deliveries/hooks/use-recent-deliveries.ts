import { useQuery } from "@tanstack/react-query";
import { fetchRecentDeliveries } from "../lib/api";
import type { DeliveryGroup } from "../types";

// Store-scoped browse list (as opposed to useDeliverySearch's filtered
// lookup) — backs the search screen's "recent uploads" quick-select bar.
export interface UseRecentDeliveriesResult {
  groups: DeliveryGroup[];
  // True until the first response, so the bar can hold its space instead of
  // popping in and pushing the content below it down.
  isLoading: boolean;
}

export function useRecentDeliveries(
  storeCode: string | null,
  limit = 5,
): UseRecentDeliveriesResult {
  const { data, isLoading } = useQuery({
    queryKey: ["deliveries", storeCode, "recent", limit],
    queryFn: () => fetchRecentDeliveries(storeCode as string, limit),
    enabled: Boolean(storeCode),
  });

  return { groups: data ?? [], isLoading };
}
