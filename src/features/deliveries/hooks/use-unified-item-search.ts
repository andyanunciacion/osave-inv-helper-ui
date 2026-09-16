import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { fetchUnifiedSearch } from "../lib/api";
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
  const { data } = useQuery({
    queryKey: ["deliveries", storeCode, "unified", range?.from, range?.to],
    queryFn: () => fetchUnifiedSearch(storeCode as string, range),
    enabled: Boolean(storeCode) && Boolean(range?.from),
  });

  return { items: data ?? [] };
}
