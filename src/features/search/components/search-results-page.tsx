"use client";

import { useDeliverySearch } from "@/features/deliveries/hooks/use-delivery-search";
import { useStoreSession } from "@/features/store-session/hooks/use-store-session";
import { useResultsFilters } from "../hooks/use-results-filters";
import { ResultsStatus } from "./results-status";
import { SearchResults } from "./search-results";

// §6 flow C: results are grouped by delivery_code for every search — a
// date-only search (no text query) shows one card per delivery in the range.
// The back button + filter description live in ResultsHeader, outside the
// card this component renders into.
export function SearchResultsPage() {
  const { storeCode } = useStoreSession();
  const { query, range } = useResultsFilters();
  const { groups, status, retry } = useDeliverySearch({ storeCode, query, range });

  if (status === "loading" || status === "offline" || status === "error") {
    return <ResultsStatus status={status} onRetry={retry} />;
  }

  return <SearchResults groups={groups} />;
}
