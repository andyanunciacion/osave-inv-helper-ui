"use client";

import { useSearchFilters } from "../hooks/use-search-filters";
import type { RecentUpload } from "../types";
import { QuickRangePills } from "./quick-range-pills";
import { RecentUploadsBar } from "./recent-uploads-bar";
import { SearchBar } from "./search-bar";

// Owns the shared search-filter state (query + date range) so the search
// bar's calendar popover and the quick-range pills stay in sync. No data
// fetching yet — wire a delivery-search query hook into handleSubmit once
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

  const handleSelectRecentUpload = (upload: RecentUpload) => {
    setQuery(upload.deliveryCode);
  };

  return (
    <div className="flex flex-col gap-5">
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        range={range}
        onRangeChange={setRange}
        onClearRange={clearRange}
        onSubmit={() => {}}
      />
      <RecentUploadsBar onSelect={handleSelectRecentUpload} />
      <QuickRangePills
        options={quickRangeOptions}
        activeKey={activeQuickRange}
        onSelect={selectQuickRange}
      />
    </div>
  );
}
