"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseLocalDateString } from "@/features/deliveries/lib/date-range";
import type { DeliverySearchResultGroup } from "@/features/deliveries/types";
import { usePaginatedGroups } from "../hooks/use-paginated-groups";
import { VirtualItemList } from "./virtual-item-list";

interface SearchResultsProps {
  groups: DeliverySearchResultGroup[];
}

// §6 flow C: results grouped by delivery_code/date — a query matching items
// across several deliveries shows as separate groups. Each group shows only
// the items that matched (useDeliverySearch), collapsed by default, except
// an exact delivery_code match, which shows every item and expands
// automatically — the groups list itself paginates for broad queries that
// match many deliveries.
export function SearchResults({ groups }: SearchResultsProps) {
  const { visibleGroups, hasMore, loadMore } = usePaginatedGroups(groups);

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        No deliveries found. Try a different item, code, or date range.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visibleGroups.map((group) => (
        <DeliveryGroupCard key={group.delivery.delivery_code} group={group} />
      ))}
      {hasMore ? (
        <Button type="button" variant="outline" onClick={loadMore}>
          Load more deliveries
        </Button>
      ) : null}
    </div>
  );
}

function DeliveryGroupCard({ group }: { group: DeliverySearchResultGroup }) {
  const [expanded, setExpanded] = useState(group.autoExpand);
  const { delivery, displayItems } = group;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-card-foreground">
          {expanded ? (
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          )}
          {delivery.delivery_code}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {format(parseLocalDateString(delivery.delivery_date), "MMM d, yyyy")} ·{" "}
          {displayItems.length} item
          {displayItems.length === 1 ? "" : "s"}
        </span>
      </button>
      {expanded ? <VirtualItemList items={displayItems} /> : null}
    </div>
  );
}
