"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { formatCurrency, formatItemLabel, formatQuantity } from "@/features/deliveries/lib/format";
import type { DeliveryItem } from "@/types/schema";

interface VirtualItemListProps<T extends DeliveryItem> {
  items: T[];
  renderMeta?: (item: T) => ReactNode;
  maxHeight?: number;
}

// Renders only the item rows currently in view. Used both for an expanded
// delivery group's items and for the unified (date-only) flat list — either
// can run to hundreds of rows once real data replaces the sample set.
export function VirtualItemList<T extends DeliveryItem>({
  items,
  renderMeta,
  maxHeight = 420,
}: VirtualItemListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });

  return (
    <div ref={parentRef} style={{ maxHeight, overflowY: "auto" }}>
      <div
        style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={item.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
            >
              <div className="flex min-w-0 flex-col">
                <span
                  className="truncate font-medium text-card-foreground"
                  aria-label={formatItemLabel(item.item_code, item.item_name)}
                >
                  {item.item_code ? (
                    <span className="font-semibold">{item.item_code} </span>
                  ) : null}
                  {item.item_name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatQuantity(item.quantity, item.unit, item.unit_count)}
                  {renderMeta ? <> · {renderMeta(item)}</> : null}
                </span>
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(item.total_item_price)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
