"use client";

import { useEffect } from "react";
import type { CreateDeliveryResult } from "@/features/deliveries/types";
import { useStoreSession } from "@/features/store-session/hooks/use-store-session";
import { useDeliveryDraft } from "../hooks/use-delivery-draft";
import { useOcrCapture } from "../hooks/use-ocr-capture";
import { useUploadBatch } from "../hooks/use-upload-batch";
import { savedPageNotice } from "../lib/merged-items";
import type { OcrResult } from "../types";
import { BatchSummaryStep } from "./batch-summary-step";
import { CaptureStep } from "./capture-step";
import { PartialBatchStep } from "./partial-batch-step";
import { ResultStep } from "./result-step";
import { ReviewStep } from "./review-step";

// Orchestrates the §6 flow B stages: capture → OCR processing → review →
// result. Stage/data ownership lives in useOcrCapture + useDeliveryDraft —
// this component only decides which step to render. A multi-photo upload
// runs every photo's OCR + the /api/ocr/reconcile cross-check up front
// (useOcrCapture), then queues the resolved pages through this same
// single-page review/confirm flow one at a time, auto-advancing after each
// confirm; the backend still appends each page to the same delivery. Which
// pages were saved/skipped lives in useUploadBatch.
export function UploadFlow() {
  const { storeCode } = useStoreSession();
  const capture = useOcrCapture();
  const { status, error, pages, currentIndex, currentPage, isLastPage, captureFiles } = capture;
  const batch = useUploadBatch({
    pageCount: pages.length,
    currentIndex,
    isLastPage,
    advance: capture.advance,
    reset: capture.reset,
  });
  const { savedPages, startOver } = batch;

  if (batch.finished) {
    return (
      <BatchSummaryStep
        pages={savedPages}
        skippedPages={batch.skippedPages}
        batchSize={pages.length}
        onUploadAnother={startOver}
      />
    );
  }

  if (status === "partial") {
    return (
      <PartialBatchStep
        batchSize={capture.batchSize}
        readCount={capture.readCount}
        failedPhotos={capture.failedPhotos}
        onRetryFailed={capture.retryFailed}
        onContinue={capture.continueWithRead}
        onStartOver={startOver}
      />
    );
  }

  if (!currentPage) {
    return (
      <CaptureStep
        status={status}
        error={error}
        progress={capture.progress}
        onFilesSelected={(files) => captureFiles(files, storeCode ?? "")}
      />
    );
  }

  // The page confirmed just before this one, so the review can say it was
  // saved — the auto-advance is otherwise easy to miss.
  const previousSaved = savedPages.find((page) => page.index === currentIndex - 1);

  return (
    <DraftReview
      key={currentIndex}
      ocrResult={currentPage.ocrResult}
      receiptStoreCodeInferred={currentPage.receiptStoreCodeInferred}
      storeCode={storeCode ?? ""}
      pageLabel={pages.length > 1 ? `Page ${currentIndex + 1} of ${pages.length}` : null}
      savedNotice={previousSaved ? savedPageNotice(currentIndex, previousSaved.result) : null}
      unsavedPageCount={pages.length - currentIndex}
      hasSavedPages={savedPages.length > 0}
      isLastPage={isLastPage}
      skipLabel={batch.skipLabel}
      onSaved={batch.recordSaved}
      onSkip={batch.skip}
      onCancel={batch.cancel}
    />
  );
}

function DraftReview({
  ocrResult,
  receiptStoreCodeInferred,
  storeCode,
  pageLabel,
  savedNotice,
  unsavedPageCount,
  hasSavedPages,
  isLastPage,
  skipLabel,
  onSaved,
  onSkip,
  onCancel,
}: {
  ocrResult: OcrResult;
  receiptStoreCodeInferred: boolean;
  storeCode: string;
  pageLabel: string | null;
  savedNotice: string | null;
  unsavedPageCount: number;
  hasSavedPages: boolean;
  isLastPage: boolean;
  skipLabel: string;
  onSaved: (result: CreateDeliveryResult) => void;
  onSkip: () => void;
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
        skipLabel={skipLabel}
        onSkip={onSkip}
      />
    );
  }

  return (
    <ReviewStep
      draft={draft}
      pageLabel={pageLabel}
      savedNotice={savedNotice}
      unsavedPageCount={unsavedPageCount}
      hasSavedPages={hasSavedPages}
      receiptStoreCodeInferred={receiptStoreCodeInferred}
      onCancel={onCancel}
    />
  );
}
