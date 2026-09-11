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
  quantity: number | null;
  unit: ItemUnit | null;
  item_price: number | null;
  total_item_price: number | null;
  raw_ocr_text: string | null;
  created_at: string;
}
