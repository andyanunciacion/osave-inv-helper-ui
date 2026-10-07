"use client";

import { useDeliverySearch } from "@/features/deliveries/hooks/use-delivery-search";
import { useUnifiedItemSearch } from "@/features/deliveries/hooks/use-unified-item-search";
import { useStoreSession } from "@/features/store-session/hooks/use-store-session";
import { useResultsFilters } from "../hooks/use-results-filters";
import { ResultsStatus } from "./results-status";
import { SearchResults } from "./search-results";
import { UnifiedResults } from "./unified-results";

// §6 flow C: a date-only search (no text query) unifies items across
// deliveries into one flat list rather than grouping by delivery_code —
// staff filtering purely by date are usually asking "what came in that
// day", not "which deliveries arrived." Any text query (item/code/delivery
// code) keeps the normal grouped-by-delivery view, even alongside a range.
// The back button + filter description live in ResultsHeader, outside the
// card this component renders into.
export function SearchResultsPage() {
  const { storeCode } = useStoreSession();
  const { query, range } = useResultsFilters();
  const isDateOnly = Boolean(range?.from) && !query.trim();

  const grouped = useDeliverySearch({
    storeCode,
    query,
    range: isDateOnly ? undefined : range,
  });
  const unified = useUnifiedItemSearch({
    storeCode,
    range: isDateOnly ? range : undefined,
  });

  const { status, retry } = isDateOnly ? unified : grouped;
  if (status === "loading" || status === "offline" || status === "error") {
    return <ResultsStatus status={status} onRetry={retry} />;
  }

  return isDateOnly ? <UnifiedResults items={unified.items} /> : <SearchResults groups={grouped.groups} />;
}
