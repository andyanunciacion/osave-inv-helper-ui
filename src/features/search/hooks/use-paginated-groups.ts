import { useMemo, useState } from "react";
import type { DeliveryGroup } from "@/features/deliveries/types";

const DEFAULT_PAGE_SIZE = 15;

// A broad text query can match many deliveries — this windows the grouped
// results list itself (independent of how many items are in any one
// delivery) so the results page doesn't render every matching delivery's
// header at once. Generic over DeliveryGroup so callers can pass a richer
// shape (e.g. useDeliverySearch's DeliverySearchResultGroup) through
// unchanged.
export interface UsePaginatedGroupsResult<T extends DeliveryGroup> {
  visibleGroups: T[];
  hasMore: boolean;
  loadMore: () => void;
}

export function usePaginatedGroups<T extends DeliveryGroup>(
  groups: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
): UsePaginatedGroupsResult<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [trackedGroups, setTrackedGroups] = useState(groups);

  // A new search result set (different groups array) starts back at one
  // page. Adjusted during render rather than in an effect, per React's
  // guidance for resetting state in response to a prop change — avoids the
  // extra commit-then-effect-then-re-render round trip.
  if (groups !== trackedGroups) {
    setTrackedGroups(groups);
    setVisibleCount(pageSize);
  }

  const visibleGroups = useMemo(() => groups.slice(0, visibleCount), [groups, visibleCount]);

  return {
    visibleGroups,
    hasMore: visibleCount < groups.length,
    loadMore: () => setVisibleCount((count) => count + pageSize),
  };
}
