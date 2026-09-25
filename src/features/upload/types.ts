// Types for the upload feature (§6 flow B). Draft fields are kept as plain
// strings while editable on the review screen — including `unit`, so every
// field shares the same string-in/string-out shape for controlled inputs —
// and are parsed/validated against schema.ts's stricter types only at
// confirm time (see useDeliveryDraft's `confirm`).

export type UploadStage = "capture" | "processing" | "review" | "submitting" | "result";

export interface DraftItem {
  localId: string;
  item_code: string;
  item_name: string;
  unit_count: string; // "Unit/Box"
  quantity: string; // "Qty"
  unit: string;
  item_price: string;
  total_item_price: string;
}

export interface DraftHeader {
  delivery_code: string;
  warehouse_code: string;
  delivery_date: string;
  receipt_store_code: string;
  // "yyyy-MM-ddTHH:mm:ss", the printed "Date and hour of printout" — not
  // shown on the review screen; kept only to send back to
  // /api/ocr/reconcile for a multi-photo upload.
  printout_datetime: string;
}

export interface OcrResult {
  header: DraftHeader;
  items: DraftItem[];
}
