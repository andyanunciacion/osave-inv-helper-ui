import { useCallback, useState } from "react";
import type { CreateDeliveryResult } from "@/features/deliveries/types";
import type { SavedPage } from "../types";

// Where the batch queue currently is — the slice of useOcrCapture this hook
// steps through.
export interface BatchPosition {
  pageCount: number;
  currentIndex: number;
  isLastPage: boolean;
  advance: () => void;
  reset: () => void;
}

export interface UseUploadBatchResult {
  savedPages: SavedPage[];
  // Indexes of pages passed over after a save that added nothing (already
  // uploaded, or a different store's receipt).
  skippedPages: number[];
  // Show the end-of-upload summary.
  finished: boolean;
  // Label for `skip` on the current page.
  skipLabel: string;
  recordSaved: (result: CreateDeliveryResult) => void;
  skip: () => void;
  cancel: () => void;
  startOver: () => void;
}

// §6 flow B, multi-photo upload: tracks which pages of the batch were saved
// or skipped and when the batch is over. Pages are confirmed one at a time;
// each was a billed OCR read, so a page that can't be saved must never strand
// the pages after it.
export function useUploadBatch({
  pageCount,
  currentIndex,
  isLastPage,
  advance,
  reset,
}: BatchPosition): UseUploadBatchResult {
  const [savedPages, setSavedPages] = useState<SavedPage[]>([]);
  const [skippedPages, setSkippedPages] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const startOver = useCallback(() => {
    setSavedPages([]);
    setSkippedPages([]);
    setFinished(false);
    reset();
  }, [reset]);

  // Keyed by page index so a repeated call (e.g. effect re-run) is harmless.
  const recordSaved = useCallback(
    (result: CreateDeliveryResult) => {
      setSavedPages((prev) => [
        ...prev.filter((page) => page.index !== currentIndex),
        { index: currentIndex, result },
      ]);
      if (isLastPage) setFinished(true);
      else advance();
    },
    [currentIndex, isLastPage, advance],
  );

  // A single photo has nothing after it and nothing to summarise — skipping
  // it just goes back to capture.
  const skip = useCallback(() => {
    if (pageCount <= 1) {
      startOver();
      return;
    }
    setSkippedPages((prev) => (prev.includes(currentIndex) ? prev : [...prev, currentIndex]));
    if (isLastPage) setFinished(true);
    else advance();
  }, [pageCount, currentIndex, isLastPage, advance, startOver]);

  // Cancelling mid-batch keeps what's already saved and reports it; with
  // nothing saved yet it just returns to capture.
  const cancel = useCallback(() => {
    if (savedPages.length > 0) setFinished(true);
    else startOver();
  }, [savedPages.length, startOver]);

  const skipLabel =
    pageCount <= 1 ? "Upload another" : isLastPage ? "Skip and finish" : "Skip to next page";

  return { savedPages, skippedPages, finished, skipLabel, recordSaved, skip, cancel, startOver };
}
