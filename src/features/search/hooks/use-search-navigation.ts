import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";

// Builds the /search/results query string from the current filter state
// and navigates there. Kept separate from useSearchFilters so filter state
// and the act of submitting a search stay independently testable.
export function useSearchNavigation() {
  const router = useRouter();

  const submitSearch = useCallback(
    (query: string, range: DateRange | undefined) => {
      const params = new URLSearchParams();
      const trimmedQuery = query.trim();
      if (trimmedQuery) params.set("query", trimmedQuery);
      if (range?.from) params.set("from", range.from.toISOString());
      if (range?.to) params.set("to", range.to.toISOString());

      const queryString = params.toString();
      router.push(queryString ? `/search/results?${queryString}` : "/search/results");
    },
    [router],
  );

  return { submitSearch };
}
