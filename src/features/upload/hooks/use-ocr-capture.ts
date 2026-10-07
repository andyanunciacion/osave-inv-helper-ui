import { useCallback, useRef, useState } from "react";
import { OcrError, runOcr, runOcrReconcile, type OcrApiResponse } from "../lib/api";
import type { OcrResult } from "../types";

// §6 flow B steps 1-4 / §8 background upload: owns the capture → processing
// transition, for one photo or a multi-photo batch alike (a single capture
// is just a batch of one, which skips the reconcile step below).
//
// `partial`: some photos of a batch were read and some weren't. The batch
// pauses so staff can retry just the failed ones or continue with what was
// read — the read pages are kept either way (each was a billed OCR call).
export type CaptureStatus = "idle" | "processing" | "partial" | "done" | "error";

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

// A photo of the current batch that OCR couldn't turn into a page.
export interface FailedPhoto {
  fileName: string;
  error: CaptureError;
  // A receipt addressed to another store reads the same on a second try.
  retryable: boolean;
}

// How many photos of the in-flight OCR round have come back (read or
// failed). Photos are sent in parallel, so this counts completions rather
// than stepping through them in order.
export interface CaptureProgress {
  done: number;
  total: number;
}

export interface UseOcrCaptureResult {
  status: CaptureStatus;
  error: CaptureError | null;
  // Set while `processing`; null otherwise.
  progress: CaptureProgress | null;
  pages: BatchPage[];
  currentIndex: number;
  currentPage: BatchPage | null;
  isLastPage: boolean;
  // For the `partial` pause: how many of the batch's photos were read, and
  // which weren't (in the order they were picked).
  batchSize: number;
  readCount: number;
  failedPhotos: FailedPhoto[];
  captureFiles: (files: File[], sessionStoreCode: string) => void;
  // Re-sends only the retryable failed photos; already-read ones aren't
  // sent again.
  retryFailed: () => void;
  // Goes on to review with just the photos that were read.
  continueWithRead: () => void;
  advance: () => void;
  reset: () => void;
}

// Each picked photo's OCR outcome, kept in pick order so pages stay in the
// order staff photographed them across retries.
interface PhotoOutcome {
  file: File;
  result: OcrResult | null;
  error: CaptureError | null;
}

const isRetryable = (error: CaptureError): boolean => error.kind !== "store_mismatch";

const GENERIC_ERROR: CaptureError = {
  kind: "failed",
  message: "Couldn't read that receipt. Try again.",
};

const NO_TOTALS = { total_pcs: "", total_box: "", total_items: "", total_value: "" };

// The `??` defaults keep the review screen working against a backend that
// predates inferred cells / printed totals.
function withLocalIds(result: OcrApiResponse): OcrResult {
  return {
    ...result,
    totals: result.totals ?? NO_TOTALS,
    items: result.items.map((item) => ({
      ...item,
      inferred: item.inferred ?? [],
      has_annotation: item.has_annotation ?? false,
      localId: crypto.randomUUID(),
    })),
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

function toOutcome(file: File, settled: PromiseSettledResult<OcrApiResponse>): PhotoOutcome {
  return settled.status === "fulfilled"
    ? { file, result: withLocalIds(settled.value), error: null }
    : { file, result: null, error: { ...toCaptureError(settled.reason), fileName: file.name } };
}

export function useOcrCapture(): UseOcrCaptureResult {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [error, setError] = useState<CaptureError | null>(null);
  const [pages, setPages] = useState<BatchPage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<PhotoOutcome[]>([]);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  // The session store the batch was captured under, for retries/reconcile.
  const storeCodeRef = useRef("");

  // Sends each file to OCR in parallel, ticking `progress` as each settles.
  // Progress stays up through the reconcile call; it's cleared whenever the
  // batch leaves `processing` (see `leaveProcessing`).
  const readAll = useCallback((files: File[]) => {
    setProgress({ done: 0, total: files.length });
    return Promise.allSettled(
      files.map((file) =>
        runOcr(file, storeCodeRef.current).finally(() =>
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p)),
        ),
      ),
    );
  }, []);

  const leaveProcessing = useCallback((next: CaptureStatus) => {
    setProgress(null);
    setStatus(next);
  }, []);

  // Turns the read pages into the review queue — reconciling store codes
  // across them first when there's more than one.
  const finish = useCallback(async (results: OcrResult[]) => {
    // Nothing to cross-reference a lone photo against — skip the call.
    if (results.length === 1) {
      setPages([{ ocrResult: results[0], receiptStoreCodeInferred: false }]);
      setCurrentIndex(0);
      leaveProcessing("done");
      return;
    }

    try {
      const reconciled = await runOcrReconcile(
        storeCodeRef.current,
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
      leaveProcessing("done");
    } catch {
      setError({ kind: "failed", message: "Couldn't verify store codes across the batch. Try again." });
      leaveProcessing("error");
    }
  }, [leaveProcessing]);

  // Every photo read → straight on to review. None read → the first failure
  // is the error, as before. A mix → pause on `partial`.
  const settle = useCallback(
    async (batch: PhotoOutcome[]) => {
      setOutcomes(batch);
      const read = batch.flatMap((o) => (o.result ? [o.result] : []));
      const failed = batch.filter((o) => o.error);

      if (failed.length === 0) return finish(read);
      if (read.length === 0) {
        setError(failed[0].error);
        leaveProcessing("error");
        return;
      }
      leaveProcessing("partial");
    },
    [finish, leaveProcessing],
  );

  const captureFiles = useCallback(
    (files: File[], sessionStoreCode: string) => {
      if (files.length === 0) return;
      storeCodeRef.current = sessionStoreCode;
      setStatus("processing");
      setError(null);

      void (async () => {
        const settled = await readAll(files);
        await settle(files.map((file, i) => toOutcome(file, settled[i])));
      })();
    },
    [readAll, settle],
  );

  const retryFailed = useCallback(() => {
    const toRetry = outcomes.filter((o) => o.error && isRetryable(o.error));
    if (toRetry.length === 0) return;
    setStatus("processing");

    void (async () => {
      const settled = await readAll(toRetry.map((o) => o.file));
      await settle(
        outcomes.map((o) => {
          const k = toRetry.indexOf(o);
          return k === -1 ? o : toOutcome(o.file, settled[k]);
        }),
      );
    })();
  }, [outcomes, readAll, settle]);

  const continueWithRead = useCallback(() => {
    const read = outcomes.flatMap((o) => (o.result ? [o.result] : []));
    if (read.length === 0) return;
    setStatus("processing");
    void finish(read);
  }, [outcomes, finish]);

  const advance = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, pages.length - 1));
  }, [pages.length]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPages([]);
    setCurrentIndex(0);
    setOutcomes([]);
    setProgress(null);
  }, []);

  const failedPhotos: FailedPhoto[] = outcomes.flatMap((o) =>
    o.error ? [{ fileName: o.file.name, error: o.error, retryable: isRetryable(o.error) }] : [],
  );

  return {
    status,
    error,
    progress,
    pages,
    currentIndex,
    currentPage: pages[currentIndex] ?? null,
    isLastPage: currentIndex >= pages.length - 1,
    batchSize: outcomes.length,
    readCount: outcomes.filter((o) => o.result).length,
    failedPhotos,
    captureFiles,
    retryFailed,
    continueWithRead,
    advance,
    reset,
  };
}
