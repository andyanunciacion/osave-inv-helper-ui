import { formatDateRangeLabel } from "./date-range";

interface SearchResultsTitleParams {
  query: string;
  from?: string;
  to?: string;
}

// Header title for /search/results: prefer the free-text query, otherwise
// fall back to the applied date range, otherwise a generic label.
export function formatSearchResultsTitle({
  query,
  from,
  to,
}: SearchResultsTitleParams): string {
  if (query.trim()) return query;

  if (from) {
    const rangeLabel = formatDateRangeLabel({
      from: new Date(from),
      to: to ? new Date(to) : undefined,
    });
    if (rangeLabel) return rangeLabel;
  }

  return "Search results";
}
