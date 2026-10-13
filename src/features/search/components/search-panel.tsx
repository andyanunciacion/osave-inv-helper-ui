"use client";

import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { useSearchFilters } from "../hooks/use-search-filters";
import { computeQuickRange } from "../lib/date-range";
import { buildResultsSearchParams } from "../lib/search-params";
import type { QuickRangeKey, RecentUpload } from "../types";
import { QuickRangePills } from "./quick-range-pills";
import { RecentUploadsBar } from "./recent-uploads-bar";
import { SearchBar } from "./search-bar";

// Owns the filter-editing state for /search. Results now live on their own
// page (/search/results, URL-driven so they're linkable/back-button-
// friendly) — this component's job is just building that URL and
// navigating, on submit, on applying a date range, or on picking a
// quick-range/recent-upload shortcut.
export function SearchPanel() {
  const router = useRouter();
  const {
    query,
    setQuery,
    range,
    setRange,
    activeQuickRange,
    selectQuickRange,
    clearRange,
    quickRangeOptions,
  } = useSearchFilters();

  const goToResults = (overrides: { query?: string; range?: DateRange | undefined } = {}) => {
    const nextQuery = overrides.query ?? query;
    const nextRange = overrides.range ?? range;
    if (!nextQuery.trim() && !nextRange?.from) return;
    const params = buildResultsSearchParams({ query: nextQuery, range: nextRange });
    router.push(`/search/results?${params.toString()}`);
  };

  const handleSelectRecentUpload = (upload: RecentUpload) => {
    setQuery(upload.deliveryCode);
    goToResults({ query: upload.deliveryCode });
  };

  const handleSelectQuickRange = (key: QuickRangeKey) => {
    const wasActive = activeQuickRange === key;
    selectQuickRange(key);
    if (!wasActive) goToResults({ range: computeQuickRange(key) });
  };

  return (
    <div className="flex flex-col gap-5">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        range={range}
        onRangeChange={setRange}
        onClearRange={clearRange}
        onSubmit={() => goToResults()}
        onApplyRange={() => goToResults()}
      />
      <RecentUploadsBar onSelect={handleSelectRecentUpload} />
      <QuickRangePills
        options={quickRangeOptions}
        activeKey={activeQuickRange}
        onSelect={handleSelectQuickRange}
      />
    </div>
  );
}
