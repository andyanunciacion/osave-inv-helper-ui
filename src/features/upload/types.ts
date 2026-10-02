// Types for the upload feature (§6 flow B). Draft fields are kept as plain
// strings while editable on the review screen — including `unit`, so every
// field shares the same string-in/string-out shape for controlled inputs —
// and are parsed/validated against schema.ts's stricter types only at
// confirm time (see useDeliveryDraft's `confirm`).

export type UploadStage = "capture" | "processing" | "review" | "submitting" | "result";

// Cells /api/ocr worked out instead of reading them — mostly Qty/UOM that
// staff struck through while checking the delivery, recovered from the row's
// printed Total = Qty × Unit/Box × Price or the store's item history
// (frontend-contract.md §6).
export type InferredField = "unit_count" | "unit" | "quantity" | "item_price" | "total_item_price";

export interface DraftItem {
  localId: string;
  item_code: string;
  item_name: string;
  unit_count: string; // "Unit/Box"
  quantity: string; // "Qty"
  unit: string;
  item_price: string;
  total_item_price: string;
  // Shown as "calculated" on the review screen; a cell leaves this list once
  // the user edits it.
  inferred: InferredField[];
  // Handwriting on the row (a note, or a handwritten count) — quantity is the
  // printed one, so staff should check it against what actually arrived.
  has_annotation: boolean;
}

// The page's printed "Total Pcs / Total Box / Total Item/s / Total Value"
// block, "" where it wasn't read. Compared against the edited rows to catch a
// missed row or a misread cell (lib/receipt-totals.ts).
export interface ReceiptTotals {
  total_pcs: string;
  total_box: string;
  total_items: string;
  total_value: string;
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
  totals: ReceiptTotals;
}
