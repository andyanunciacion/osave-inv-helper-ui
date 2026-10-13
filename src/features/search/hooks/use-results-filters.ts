"use client";

import { useSearchParams } from "next/navigation";
import { parseResultsSearchParams, type ResultsFilters } from "../lib/search-params";

// Thin wrapper so both the results header (outside the card) and the
// results content (inside it) read the same URL-derived filters without
// either depending on the other's props.
export function useResultsFilters(): ResultsFilters {
  const searchParams = useSearchParams();
  return parseResultsSearchParams(searchParams);
}
