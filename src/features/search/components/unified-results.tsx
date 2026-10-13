"use client";

import { format } from "date-fns";
import { parseLocalDateString } from "@/features/deliveries/lib/date-range";
import type { UnifiedItemRow } from "@/features/deliveries/types";
import { VirtualItemList } from "./virtual-item-list";

interface UnifiedResultsProps {
  items: UnifiedItemRow[];
}

// Date-only search: one flat, virtualized list across every delivery on
// that date/range, since delivery grouping isn't what staff are scanning
// for here. Each row still surfaces its own delivery_code/date since the
// group headers are gone.
export function UnifiedResults({ items }: UnifiedResultsProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        No items found for that date range.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <VirtualItemList
        items={items}
        maxHeight={560}
        renderMeta={(item) => (
          <>
            {item.delivery_code} · {format(parseLocalDateString(item.delivery_date), "MMM d")}
          </>
        )}
      />
    </div>
  );
}
