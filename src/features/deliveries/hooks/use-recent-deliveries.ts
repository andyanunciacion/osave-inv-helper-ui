import { useQuery } from "@tanstack/react-query";
import { fetchRecentDeliveries } from "../lib/api";
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
  const { data } = useQuery({
    queryKey: ["deliveries", storeCode, "recent", limit],
    queryFn: () => fetchRecentDeliveries(storeCode as string, limit),
    enabled: Boolean(storeCode),
  });

  return { groups: data ?? [] };
}
