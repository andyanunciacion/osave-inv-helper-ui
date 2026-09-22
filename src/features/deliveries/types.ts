// Cross-component types for the deliveries feature — shared delivery/item
// data access used by upload (write) + search (read). Mirrors the subset of
// AI_DOCS/main-file.md §4 needed on the client; `src/types/schema.ts` stays
// the source of truth for the persisted row shapes.

import type { Delivery, DeliveryItem, ItemUnit } from "@/types/schema";

export interface DeliveryGroup {
  delivery: Delivery;
  items: DeliveryItem[];
}

// A delivery_item flattened out of its DeliveryGroup, annotated with the
// parent delivery's date/code — used by the date-only "unified" results
// view (search-results-page.tsx), which intentionally drops delivery
// grouping in favor of one flat list.
export interface UnifiedItemRow extends DeliveryItem {
  delivery_date: string;
}

// useDeliverySearch's per-group result: which of the delivery's items
// actually matched the query (a delivery can have 50-80 items — showing
// the whole receipt for a one-item match would defeat the point of
// searching), and whether the query was an exact hit on the delivery_code
// itself, in which case the group shows every item and expands by default.
export interface DeliverySearchResultGroup extends DeliveryGroup {
  displayItems: DeliveryItem[];
  autoExpand: boolean;
}

export interface NewDeliveryItemInput {
  item_code: string | null;
  item_name: string;
  unit_count: number | null;
  quantity: number | null;
  unit: ItemUnit | null;
  item_price: number | null;
  total_item_price: number | null;
}

export interface NewDeliveryInput {
  delivery_code: string;
  store_code: string;
  warehouse_code: string | null;
  delivery_date: string;
  // Required by the backend: it must match store_code or the save is refused
  // (frontend-contract.md §2).
  receipt_store_code: string;
  items: NewDeliveryItemInput[];
}

// §5 rule 3: a duplicate item_code within the same delivery is rejected,
// not merged — surfaced per-row rather than failing the whole batch.
export interface RejectedItem {
  item_code: string | null;
  item_name: string;
  reason: "duplicate_item_code";
}

// "duplicate_delivery": nothing was saved — the code belongs to another store,
// or this exact page was already uploaded. "store_mismatch": the receipt is
// addressed to a different store than the session's; nothing was saved.
// A later page of a receipt for the same store comes back as success/partial
// (its items are appended to the existing delivery).
export type CreateDeliveryStatus = "success" | "duplicate_delivery" | "partial" | "store_mismatch";

export interface CreateDeliveryResult {
  status: CreateDeliveryStatus;
  delivery: Delivery | null; // null on "duplicate_delivery" and "store_mismatch"
  acceptedItems: DeliveryItem[];
  rejectedItems: RejectedItem[];
}
