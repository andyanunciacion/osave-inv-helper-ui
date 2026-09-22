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

// §5 rule 3: a duplicate item_code against a row already saved on the
// delivery (e.g. from an earlier page) is rejected — surfaced per-row
// rather than failing the whole batch. A duplicate item_code *within the
// same submitted batch* is a different case — see MergedItem below.
export interface RejectedItem {
  item_code: string | null;
  item_name: string;
  reason: "duplicate_item_code";
}

// §5 rule 3: rows in the same submitted batch sharing an item_code (or the
// name-based fallback key for code-less items) are combined by the backend
// rather than rejected — the receipt itself sometimes prints the same item
// twice on one page. quantity and total_item_price are summed; unit_count,
// unit, item_price, and item_name are kept from the first occurrence.
// `fieldsDisagreed` is true when those kept fields didn't match across the
// merged rows — worth a second look, since it can mean the item code was
// misread rather than genuinely repeated.
export interface MergedItem {
  item_code: string | null;
  item_name: string;
  mergedCount: number;
  fieldsDisagreed: boolean;
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
  mergedItems: MergedItem[];
}
