import { useCallback, useState } from "react";
import { OcrError, runOcr, type OcrApiResponse } from "../lib/api";
import type { OcrResult } from "../types";

// §6 flow B steps 1-4 / §8 background upload: owns the capture → processing
// transition.
export type CaptureStatus = "idle" | "processing" | "done" | "error";

// `store_mismatch`: the receipt is addressed to another store — retaking the
// same photo won't help. `limit`: the backend's OCR rate/daily cap was hit.
// `failed`: anything else (unreadable photo, network, server error).
export type CaptureErrorKind = "store_mismatch" | "limit" | "failed";

export interface CaptureError {
  kind: CaptureErrorKind;
  message: string;
}

export interface UseOcrCaptureResult {
  status: CaptureStatus;
  ocrResult: OcrResult | null;
  error: CaptureError | null;
  captureFile: (file: File, sessionStoreCode: string) => void;
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

function toCaptureError(err: unknown): CaptureError {
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
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<CaptureError | null>(null);

  const captureFile = useCallback((file: File, sessionStoreCode: string) => {
    setStatus("processing");
    setError(null);
    runOcr(file, sessionStoreCode)
      .then((result) => {
        setOcrResult(withLocalIds(result));
        setStatus("done");
      })
      .catch((err: unknown) => {
        setError(toCaptureError(err));
        setStatus("error");
      });
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setOcrResult(null);
    setError(null);
  }, []);

  return { status, ocrResult, error, captureFile, reset };
}
