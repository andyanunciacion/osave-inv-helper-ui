// Real §7 OCR proxy call, replacing mock-ocr.ts. The photo is sent as
// multipart form data and never touches this client again once the request
// resolves — only the parsed OcrResult comes back.

import type { DraftHeader, DraftItem } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The backend never invents a localId (that's client-only, per
// frontend-contract.md §6) — the caller adds one to each row.
export interface OcrApiResponse {
  header: DraftHeader;
  items: Array<Omit<DraftItem, "localId">>;
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
export async function runOcr(file: File, storeCode: string): Promise<OcrApiResponse> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("store_code", storeCode);

  const res = await fetch(`${API_BASE_URL}/api/ocr`, {
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
