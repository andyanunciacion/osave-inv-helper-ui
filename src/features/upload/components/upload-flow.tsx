"use client";

import { useEffect, useState } from "react";
import type { CreateDeliveryResult } from "@/features/deliveries/types";
import { useStoreSession } from "@/features/store-session/hooks/use-store-session";
import { useDeliveryDraft } from "../hooks/use-delivery-draft";
import { useOcrCapture } from "../hooks/use-ocr-capture";
import type { OcrResult } from "../types";
import { BatchSummaryStep, type SavedPage } from "./batch-summary-step";
import { CaptureStep } from "./capture-step";
import { ResultStep } from "./result-step";
import { ReviewStep } from "./review-step";

// Orchestrates the §6 flow B stages: capture → OCR processing → review →
// result. Stage/data ownership lives in useOcrCapture + useDeliveryDraft —
// this component only decides which step to render. A multi-photo upload
// runs every photo's OCR + the /api/ocr/reconcile cross-check up front
// (useOcrCapture), then queues the resolved pages through this same
// single-page review/confirm flow one at a time, auto-advancing after each
// confirm; the backend still appends each page to the same delivery.
export function UploadFlow() {
  const { storeCode } = useStoreSession();
  const { status, error, pages, currentIndex, currentPage, isLastPage, captureFiles, advance, reset } =
    useOcrCapture();
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [finished, setFinished] = useState(false);

  const startOver = () => {
    setSavedPages([]);
    setFinished(false);
    reset();
  };

  // Keyed by page index so a repeated call (e.g. effect re-run) is harmless.
  const handleSaved = (result: CreateDeliveryResult) => {
    setSavedPages((prev) => [
      ...prev.filter((page) => page.index !== currentIndex),
      { index: currentIndex, result },
    ]);
    if (isLastPage) setFinished(true);
    else advance();
  };

  // Cancelling mid-batch keeps what's already saved and reports it; with
  // nothing saved yet it just returns to capture.
  const handleCancel = () => {
    if (savedPages.length > 0) setFinished(true);
    else startOver();
  };

  if (finished && savedPages.length > 0) {
    return <BatchSummaryStep pages={savedPages} onUploadAnother={startOver} />;
  }

  if (!currentPage) {
    return (
      <CaptureStep
        status={status}
        error={error}
        onFilesSelected={(files) => captureFiles(files, storeCode ?? "")}
      />
    );
  }

  return (
    <DraftReview
      key={currentIndex}
      ocrResult={currentPage.ocrResult}
      receiptStoreCodeInferred={currentPage.receiptStoreCodeInferred}
      storeCode={storeCode ?? ""}
      pageLabel={pages.length > 1 ? `Page ${currentIndex + 1} of ${pages.length}` : null}
      isLastPage={isLastPage}
      onSaved={handleSaved}
      onCancel={handleCancel}
    />
  );
}

function DraftReview({
  ocrResult,
  receiptStoreCodeInferred,
  storeCode,
  pageLabel,
  isLastPage,
  onSaved,
  onCancel,
}: {
  ocrResult: OcrResult;
  receiptStoreCodeInferred: boolean;
  storeCode: string;
  pageLabel: string | null;
  isLastPage: boolean;
  onSaved: (result: CreateDeliveryResult) => void;
  onCancel: () => void;
}) {
  const draft = useDeliveryDraft(ocrResult, storeCode);
  const { stage, result } = draft;

  // A clean save moves straight on to the next page (or the summary). Any
  // other outcome stays on this page's result screen so the problem is seen
  // here, next to the receipt it belongs to.
  useEffect(() => {
    if (stage === "submitted" && result?.status === "success") onSaved(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per submit outcome
  }, [stage, result]);

  if (stage === "submitted" && result && result.status !== "success") {
    return (
      <ResultStep
        result={result}
        onEditAgain={draft.editAgain}
        continueLabel={isLastPage ? "Finish" : "Continue to next page"}
        onContinue={() => onSaved(result)}
      />
    );
  }

  return (
    <ReviewStep
      draft={draft}
      pageLabel={pageLabel}
      receiptStoreCodeInferred={receiptStoreCodeInferred}
      onCancel={onCancel}
    />
  );
}
