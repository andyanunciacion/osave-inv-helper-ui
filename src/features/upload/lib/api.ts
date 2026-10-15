// Real §7 OCR proxy call, replacing mock-ocr.ts. The photo is sent as
// multipart form data and never touches this client again once the request
// resolves — only the parsed OcrResult comes back.

import { backendFetch } from "@/lib/api-client";
import type { DraftHeader, DraftItem, ReceiptTotals } from "../types";
import { compressImage } from "./compress-image";
import { normalizeImageFile } from "./normalize-image-file";

// Mirrors the backend's multer limit on /api/ocr.
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// The backend never invents a localId (that's client-only, per
// frontend-contract.md §6) — the caller adds one to each row.
export interface OcrApiResponse {
  header: DraftHeader;
  items: Array<Omit<DraftItem, "localId">>;
  totals: ReceiptTotals;
}

// A non-2xx answer from /api/ocr. `code` is the backend's `error` field
// (frontend-contract.md §6): e.g. "store_mismatch" (409), "rate_limited" /
// "daily_limit_reached" (429), "invalid_file_type", "file_too_large",
// "ocr_failed" (502).
export class OcrError extends Error {
  readonly code: string;
  readonly receiptStoreCode: string | null;

  constructor(code: string, message: string, receiptStoreCode: string | null = null) {
    super(message);
    this.name = "OcrError";
    this.code = code;
    this.receiptStoreCode = receiptStoreCode;
  }
}

interface OcrErrorBody {
  error?: string;
  message?: string;
  receipt_store_code?: string;
}

// `storeCode` is the session's store: the backend rejects (409) a receipt
// addressed to a different store, so a receipt for store 1 can't be read into
// store 2's records.
//
// The size limit is checked here, after compression, not on the picked file:
// most photos over the limit shrink well under it, and only one that's still
// too big is refused — without being sent, so it can't count against the OCR
// rate limit.
export async function runOcr(file: File, storeCode: string): Promise<OcrApiResponse> {
  const image = await compressImage(normalizeImageFile(file));
  if (image.size > MAX_PHOTO_BYTES) {
    throw new OcrError("file_too_large", "Image must be 10MB or smaller");
  }

  const formData = new FormData();
  formData.append("image", image);
  formData.append("store_code", storeCode);

  const res = await backendFetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as OcrErrorBody;
    throw new OcrError(
      body.error ?? "ocr_failed",
      body.message ?? `OCR request failed (status ${res.status})`,
      body.receipt_store_code ?? null,
    );
  }

  return res.json() as Promise<OcrApiResponse>;
}

export interface OcrReconcilePage extends DraftHeader {
  receipt_store_code_inferred: boolean;
  // Optional: a backend from before date / delivery code recovery doesn't
  // send them.
  delivery_date_inferred?: boolean;
  delivery_code_inferred?: boolean;
  store_mismatch: boolean;
}

// Called once per multi-photo upload, after every page's runOcr() has
// resolved — never per page, since it needs every sibling present to find a
// match (frontend-contract.md §6). A single-photo upload has no siblings to
// check against, so callers skip this entirely for a batch of one.
export async function runOcrReconcile(
  storeCode: string,
  pages: DraftHeader[],
): Promise<OcrReconcilePage[]> {
  const res = await backendFetch("/api/ocr/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ store_code: storeCode, pages }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as OcrErrorBody;
    throw new OcrError(body.error ?? "reconcile_failed", body.message ?? `Reconcile request failed (status ${res.status})`);
  }

  const data = (await res.json()) as { pages: OcrReconcilePage[] };
  return data.pages;
}
