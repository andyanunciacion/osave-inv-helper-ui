"use client";

import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ItemHistoryPanel } from "@/features/deliveries/components/item-history-panel";
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
  // Local UI state: which single row (if any) has its history panel open.
  // Keyed by item id rather than row index so it survives virtualization
  // recycling the DOM node as the list scrolls.
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

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
          const isExpanded = expandedItemId === item.id;
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
              className="border-b border-border py-2 text-sm last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                aria-expanded={isExpanded}
                className="flex w-full items-center justify-between gap-3 text-left"
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
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(item.total_item_price)}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              </button>
              {isExpanded ? (
                <div className="mt-2">
                  <ItemHistoryPanel item={item} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
