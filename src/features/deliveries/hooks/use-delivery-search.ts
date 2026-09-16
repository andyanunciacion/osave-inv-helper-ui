import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { fetchGroupedSearch } from "../lib/api";
import type { DeliverySearchResultGroup } from "../types";

// §6 flow C: free-text query matched against item_code/item_name/
// delivery_code, plus a delivery_date range, store-scoped. Only fires once
// there's an actual query — a date-only filter is useUnifiedItemSearch's
// job (see search-results-page.tsx's isDateOnly branch).
export interface UseDeliverySearchParams {
  storeCode: string | null;
  query: string;
  range: DateRange | undefined;
}

export interface UseDeliverySearchResult {
  groups: DeliverySearchResultGroup[];
  hasActiveFilters: boolean;
}

export function useDeliverySearch({
  storeCode,
  query,
  range,
}: UseDeliverySearchParams): UseDeliverySearchResult {
  const trimmedQuery = query.trim();
  const hasActiveFilters = Boolean(trimmedQuery) || Boolean(range?.from);

  const { data } = useQuery({
    queryKey: ["deliveries", storeCode, "search", trimmedQuery, range?.from, range?.to],
    queryFn: () => fetchGroupedSearch(storeCode as string, trimmedQuery, range),
    enabled: Boolean(storeCode) && Boolean(trimmedQuery),
  });

  return { groups: data ?? [], hasActiveFilters };
}
