import { useCallback, useState } from "react";
import { OcrError, runOcr, runOcrReconcile, type OcrApiResponse } from "../lib/api";
import type { OcrResult } from "../types";

// §6 flow B steps 1-4 / §8 background upload: owns the capture → processing
// transition, for one photo or a multi-photo batch alike (a single capture
// is just a batch of one, which skips the reconcile step below).
export type CaptureStatus = "idle" | "processing" | "done" | "error";

// `store_mismatch`: the receipt is addressed to another store — retaking the
// same photo won't help. `limit`: the backend's OCR rate/daily cap was hit.
// `failed`: anything else (unreadable photo, network, server error).
export type CaptureErrorKind = "store_mismatch" | "limit" | "failed";

export interface CaptureError {
  kind: CaptureErrorKind;
  message: string;
  // Which file in a multi-select batch this came from, so the capture
  // screen can name it rather than leaving the user guessing which of
  // several selected photos failed.
  fileName?: string;
}

// One page of a batch, ready for review: the OCR result plus whether its
// store code was filled in by /api/ocr/reconcile (not directly OCR'd), so
// the review screen can flag it as worth a second look.
export interface BatchPage {
  ocrResult: OcrResult;
  receiptStoreCodeInferred: boolean;
}

export interface UseOcrCaptureResult {
  status: CaptureStatus;
  error: CaptureError | null;
  pages: BatchPage[];
  currentIndex: number;
  currentPage: BatchPage | null;
  isLastPage: boolean;
  captureFiles: (files: File[], sessionStoreCode: string) => void;
  advance: () => void;
  reset: () => void;
}

const GENERIC_ERROR: CaptureError = {
  kind: "failed",
  message: "Couldn't read that receipt. Try again.",
};

function withLocalIds(result: OcrApiResponse): OcrResult {
  return {
    ...result,
    items: result.items.map((item) => ({ ...item, localId: crypto.randomUUID() })),
  };
}

export function toCaptureError(err: unknown): CaptureError {
  if (!(err instanceof OcrError)) return GENERIC_ERROR;

  if (err.code === "store_mismatch") {
    return { kind: "store_mismatch", message: err.message };
  }
  if (err.code === "rate_limited" || err.code === "daily_limit_reached") {
    return { kind: "limit", message: err.message };
  }
  return GENERIC_ERROR;
}

export function useOcrCapture(): UseOcrCaptureResult {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [error, setError] = useState<CaptureError | null>(null);
  const [pages, setPages] = useState<BatchPage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const captureFiles = useCallback((files: File[], sessionStoreCode: string) => {
    if (files.length === 0) return;
    setStatus("processing");
    setError(null);

    void (async () => {
      const settled = await Promise.allSettled(files.map((file) => runOcr(file, sessionStoreCode)));

      const failedIndex = settled.findIndex((s) => s.status === "rejected");
      if (failedIndex !== -1) {
        const failure = settled[failedIndex] as PromiseRejectedResult;
        setError({ ...toCaptureError(failure.reason), fileName: files[failedIndex].name });
        setStatus("error");
        return;
      }

      const results = (settled as PromiseFulfilledResult<OcrApiResponse>[]).map((s) => withLocalIds(s.value));

      // Nothing to cross-reference a lone photo against — skip the call.
      if (results.length === 1) {
        setPages([{ ocrResult: results[0], receiptStoreCodeInferred: false }]);
        setCurrentIndex(0);
        setStatus("done");
        return;
      }

      try {
        const reconciled = await runOcrReconcile(
          sessionStoreCode,
          results.map((r) => r.header),
        );
        setPages(
          results.map((r, i) => ({
            ocrResult: {
              ...r,
              header: {
                delivery_code: reconciled[i].delivery_code,
                warehouse_code: reconciled[i].warehouse_code,
                delivery_date: reconciled[i].delivery_date,
                receipt_store_code: reconciled[i].receipt_store_code,
                printout_datetime: reconciled[i].printout_datetime,
              },
            },
            receiptStoreCodeInferred: reconciled[i].receipt_store_code_inferred,
          })),
        );
        setCurrentIndex(0);
        setStatus("done");
      } catch {
        setError({ kind: "failed", message: "Couldn't verify store codes across the batch. Try again." });
        setStatus("error");
      }
    })();
  }, []);

  const advance = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, pages.length - 1));
  }, [pages.length]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPages([]);
    setCurrentIndex(0);
  }, []);

  return {
    status,
    error,
    pages,
    currentIndex,
    currentPage: pages[currentIndex] ?? null,
    isLastPage: currentIndex >= pages.length - 1,
    captureFiles,
    advance,
    reset,
  };
}
