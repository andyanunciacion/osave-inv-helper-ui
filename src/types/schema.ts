// Mirrors AI_DOCS/main-file.md §4 (Data Model). Keep in sync with the Postgres schema.

export interface Store {
  store_code: string;
  name: string;
  created_at: string;
}

export type DeliveryStatus = "processing" | "confirmed" | "failed";

export interface Delivery {
  delivery_code: string;
  store_code: string;
  warehouse_code: string | null;
  delivery_date: string;
  receipt_store_code: string | null;
  uploaded_by: string | null;
  // Staff's free-text note, added on the upload's success screen — one per
  // delivery, replaced on each save (frontend-contract.md §9).
  note: string | null;
  status: DeliveryStatus;
  created_at: string;
}

export type ItemUnit = "BOX" | "PIECE";

export interface DeliveryItem {
  id: string;
  delivery_code: string;
  store_code: string;
  item_code: string | null;
  item_name: string;
  unit_count: number | null; // receipt's "Unit/Box" — pieces per box
  quantity: number | null; // receipt's "Qty"
  unit: ItemUnit | null;
  item_price: number | null;
  total_item_price: number | null;
  raw_ocr_text: string | null;
  created_at: string;
}

// One row per quantity correction made to a DeliveryItem after it was
// confirmed (frontend-contract.md §8) — the audit trail behind
// PATCH /api/deliveries/:delivery_code/items/:item_id.
export interface DeliveryItemUpdate {
  id: string;
  item_id: string;
  delivery_code: string;
  store_code: string;
  previous_quantity: number | null;
  new_quantity: number;
  // The total before and after the server recalculated it from the new
  // quantity. Optional: an older server or a saved offline copy won't have
  // them, and they're null on corrections made before the recalculation.
  previous_total_item_price?: number | null;
  new_total_item_price?: number | null;
  reason: string | null;
  created_at: string;
}
