"use client";

import { RotateCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FailedPhoto } from "../hooks/use-ocr-capture";

interface PartialBatchStepProps {
  batchSize: number;
  readCount: number;
  failedPhotos: FailedPhoto[];
  onRetryFailed: () => void;
  onContinue: () => void;
  onStartOver: () => void;
}

// Thin: the pause after a multi-photo batch where some photos were read and
// some weren't (useOcrCapture's `partial` status). Staff either retry the
// failed ones or carry on with the pages that were read.
export function PartialBatchStep({
  batchSize,
  readCount,
  failedPhotos,
  onRetryFailed,
  onContinue,
  onStartOver,
}: PartialBatchStepProps) {
  const retryableCount = failedPhotos.filter((photo) => photo.retryable).length;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-card-foreground">
          Read {readCount} of {batchSize} photos
        </p>
        <p className="text-xs text-muted-foreground">
          The photos below couldn&apos;t be read. The others are kept — retrying doesn&apos;t send
          them again.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {failedPhotos.map((photo, i) => (
          <li key={`${photo.fileName}-${i}`} className="flex gap-2 rounded-lg border border-border p-3">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-card-foreground">{photo.fileName}</span>
              <span className="text-xs text-muted-foreground">
                {photo.error.message}
                {photo.retryable ? "" : " — skipped, retrying won't help."}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        {retryableCount > 0 ? (
          <Button type="button" variant="outline" className="sm:flex-1" onClick={onRetryFailed}>
            <RotateCw className="size-4" aria-hidden="true" />
            Retry {retryableCount} failed
          </Button>
        ) : null}
        <Button type="button" className="sm:flex-1" onClick={onContinue}>
          Continue with {readCount}
        </Button>
      </div>
      <Button type="button" variant="ghost" onClick={onStartOver}>
        Start over
      </Button>
    </div>
  );
}
