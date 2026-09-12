"use client";

import { useStoreSession } from "@/features/store-session/hooks/use-store-session";
import { useDeliveryDraft } from "../hooks/use-delivery-draft";
import { useOcrCapture } from "../hooks/use-ocr-capture";
import type { OcrResult } from "../types";
import { CaptureStep } from "./capture-step";
import { ResultStep } from "./result-step";
import { ReviewStep } from "./review-step";

// Orchestrates the §6 flow B stages: capture → (mock) processing → review →
// result. Stage/data ownership lives in useOcrCapture + useDeliveryDraft —
// this component only decides which step to render.
export function UploadFlow() {
  const { storeCode } = useStoreSession();
  const { status, ocrResult, captureFile, reset } = useOcrCapture();

  if (!ocrResult) {
    return (
      <CaptureStep
        status={status}
        onFileSelected={(file) => captureFile(file, storeCode ?? "")}
      />
    );
  }

  return (
    <DraftReview ocrResult={ocrResult} storeCode={storeCode ?? ""} onStartOver={reset} />
  );
}

function DraftReview({
  ocrResult,
  storeCode,
  onStartOver,
}: {
  ocrResult: OcrResult;
  storeCode: string;
  onStartOver: () => void;
}) {
  const draft = useDeliveryDraft(ocrResult, storeCode);

  if (draft.stage === "submitted" && draft.result) {
    return (
      <ResultStep
        result={draft.result}
        onEditAgain={draft.editAgain}
        onUploadAnother={onStartOver}
      />
    );
  }

  return <ReviewStep draft={draft} onCancel={onStartOver} />;
}
