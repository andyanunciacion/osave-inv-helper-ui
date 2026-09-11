"use client";

import { computeQuickRange, useSearchFilters } from "../hooks/use-search-filters";
import { useSearchNavigation } from "../hooks/use-search-navigation";
import type { QuickRangeKey, RecentUpload } from "../types";
import { QuickRangePills } from "./quick-range-pills";
import { RecentUploadsBar } from "./recent-uploads-bar";
import { SearchBar } from "./search-bar";

// Owns the shared search-filter state (query + date range) so the search
// bar's calendar popover and the quick-range pills stay in sync. Submitting
// (via the form, a recent-upload pick, or a quick-range pill) navigates to
// /search/results with the filters as query params — wire a
// delivery-search query hook into that page's data fetching once
// features/deliveries lands.
export function SearchPanel() {
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
  const { submitSearch } = useSearchNavigation();

  const handleSelectRecentUpload = (upload: RecentUpload) => {
    setQuery(upload.deliveryCode);
    clearRange();
    submitSearch(upload.deliveryCode, undefined);
  };

  const handleSelectQuickRange = (key: QuickRangeKey) => {
    const nextRange = activeQuickRange === key ? undefined : computeQuickRange(key);
    selectQuickRange(key);
    submitSearch(query, nextRange);
  };

  return (
    <div className="flex flex-col gap-5">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        range={range}
        onRangeChange={setRange}
        onClearRange={clearRange}
        onSubmit={() => submitSearch(query, range)}
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
