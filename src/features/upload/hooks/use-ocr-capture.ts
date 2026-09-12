import { useCallback, useState } from "react";
import { runMockOcr } from "../lib/mock-ocr";
import type { OcrResult } from "../types";

// §6 flow B steps 1-4 / §8 background upload: owns the capture → processing
// transition. The photo itself is never inspected — runMockOcr stands in
// for the real OCR proxy until the backend exists — but the async delay and
// non-blocking "processing" status are real, so the UI states this drives
// match what the eventual network call will need.
export type CaptureStatus = "idle" | "processing" | "done" | "error";

export interface UseOcrCaptureResult {
  status: CaptureStatus;
  ocrResult: OcrResult | null;
  captureFile: (file: File, sessionStoreCode: string) => void;
  reset: () => void;
}

export function useOcrCapture(): UseOcrCaptureResult {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const captureFile = useCallback((file: File, sessionStoreCode: string) => {
    void file; // mock OCR ignores photo content — kept for the future real proxy call
    setStatus("processing");
    runMockOcr(sessionStoreCode)
      .then((result) => {
        setOcrResult(result);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setOcrResult(null);
  }, []);

  return { status, ocrResult, captureFile, reset };
}
