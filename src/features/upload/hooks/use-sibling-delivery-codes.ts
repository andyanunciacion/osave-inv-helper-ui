import { useMemo } from "react";
import { siblingDeliveryCodes } from "../lib/sibling-delivery-codes";
import type { SavedPage } from "../types";
import type { BatchPage } from "./use-ocr-capture";

// The Inv. Tran. Nos. the current page's siblings in the batch stand at —
// what useDeliveryDraft compares the page's own code against. Kept stable
// between renders so the draft doesn't recompute on every parent render.
export function useSiblingDeliveryCodes(
  pages: BatchPage[],
  currentIndex: number,
  savedPages: SavedPage[],
): string[] {
  return useMemo(
    () => siblingDeliveryCodes(pages.map((page) => page.ocrResult.header), currentIndex, savedPages),
    [pages, currentIndex, savedPages],
  );
}
